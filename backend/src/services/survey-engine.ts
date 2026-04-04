import { prisma } from '../lib/prisma.js';
import { invalidateTenantCache } from '../lib/redis.js';
import OpenAI from 'openai';
import { baileysManager } from './baileys-manager.js';
import { whatsappMeta } from './whatsapp-meta.js';

// Configura OpenAI (Opcional - se houver chave no .env)
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Survey Engine powered by AI
 * Gerencia a máquina de estados de pesquisas e usa OpenAI para
 * correção difusa (fuzzy logic) de textos de clientes via Baileys.
 */
class SurveyEngine {
  
  // Dynamic import for Baileys
  private async getBaileys() {
    return baileysManager;
  }

  // Dynamic import for Meta
  private async getMeta() {
    return whatsappMeta;
  }

  /**
   * Envia prompt para ser formatado em JSON pela IA.
   */
  private async parseIntentWithAI(prompt: string, text: string, fallback: any) {
    if (!openai) {
      console.warn('[SurveyEngine] Sem OPENAI_API_KEY. Usando fallback tradicional.');
      return fallback;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 150,
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('[SurveyEngine] Falha ao consultar OpenAI:', error);
      return fallback;
    }
  }

  public async handleIncomingMessage(channelId: string, fromPhone: string, text: string) {
    const { logger } = await import('../lib/logger.js');
    
    // Resolve Tenant from Channel ID to ensure we always use the current source of truth
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      logger.error({ channelId }, '[SurveyEngine] ❌ Received message for unknown channel ID.');
      return;
    }

    const tenantId = channel.tenantId;
    const cleanInput = text.trim();
    
    logger.info({ 
      channelId, 
      tenantId, 
      fromPhone, 
      text,
      channelProvider: channel.provider,
      channelStatus: channel.status
    }, '[SurveyEngine] 📨 HandleIncomingMessage Trace');
    
    // 1. Check for EXPLICIT KEYWORD match first (Always overrides everything)
    const keywordCampaign = await prisma.surveyCampaign.findFirst({
      where: {
        whatsappChannelId: channelId,
        status: 'ACTIVE',
        keyword: { equals: cleanInput, mode: 'insensitive' }
      }
    });

    if (keywordCampaign) {
      logger.info({ campaignId: keywordCampaign.id, fromPhone }, '[SurveyEngine] ✅ Explicit Keyword Match! Starting/Restarting session.');
      
      // Auto-close any existing OPEN session for this contact/channel to avoid conflicts
      await prisma.surveySession.updateMany({
        where: {
          tenantId,
          status: 'OPEN',
          contact: { phoneNumber: fromPhone },
          campaign: { whatsappChannelId: channelId }
        },
        data: { status: 'CLOSED', closedAt: new Date() }
      });
      
      return await this.startNewSession(tenantId, channelId, fromPhone, keywordCampaign);
    }

    // DEBUG: If not found, list what we checked at INFO level to see in production
    const allForTenant = await prisma.surveyCampaign.findMany({
      where: { tenantId },
      select: { id: true, name: true, status: true, keyword: true, whatsappChannelId: true }
    });
    
    logger.info({ 
      tenantId, 
      channelId, 
      receivedKeyword: cleanInput,
      tenantCampaignsCount: allForTenant.length,
      allCampaigns: allForTenant 
    }, '[SurveyEngine] 🔍 Matching Debug: No direct match found. Listing all tenant campaigns for diagnosis.');

    // 1.5 Global Cancel Keywords
    const exitKeywords = ['sair', 'cancelar', 'parar', 'stop', 'encerrar'];
    if (exitKeywords.includes(cleanInput.toLowerCase())) {
        const active = await prisma.surveySession.findFirst({
            where: {
                tenantId,
                status: 'OPEN',
                contact: { phoneNumber: fromPhone },
                campaign: { whatsappChannelId: channelId }
            }
        });
        if (active) {
            await this.closeSession(active, true); // true = forces no "thank you" message, send specific cancel msg
            return;
        }
    }

    // 2. No Keyword match? Check for existing ACTIVE session
    const session = await prisma.surveySession.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
        contact: { phoneNumber: fromPhone },
        campaign: { whatsappChannelId: channelId }
      },
      include: {
        contact: true,
        campaign: { include: { questions: { orderBy: { orderIndex: 'asc' } } } }
      }
    });

    if (session) {
      // Check for Stale Session (Older than 4 hours)
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      if (session.startedAt < fourHoursAgo) {
        logger.info({ sessionId: session.id }, '[SurveyEngine] Closing stale session (4h+ inactivity)');
        await prisma.surveySession.update({
          where: { id: session.id },
          data: { status: 'CLOSED', closedAt: new Date() }
        });
        // Proceed as if no session existed (allows restart)
      } else {
        try {
          if (session.activeStep === 0) {
            await this.handleConsentStep(session, text);
          } else {
            await this.handleQuestionStep(session, text);
          }
        } catch (error) {
          console.error(`[SurveyEngine] Erro processando sessão ${session.id}:`, error);
        }
        return;
      }
    }

    // 3. No Keyword and No Active Session? Try Catch-All (Default QR Code campaign)
    const qrcodeCampaigns = await prisma.surveyCampaign.findMany({
      where: {
        whatsappChannelId: channelId,
        status: 'ACTIVE',
        triggerType: 'qrcode'
      }
    });

    if (qrcodeCampaigns.length === 1) {
      const campaign = qrcodeCampaigns[0]!;
      logger.info({ campaignId: campaign.id }, '[SurveyEngine] Catch-All: Ativando única campanha de QRCode ativa.');
      return await this.startNewSession(tenantId, channelId, fromPhone, campaign);
    } else if (qrcodeCampaigns.length > 1) {
       logger.warn({ count: qrcodeCampaigns.length, cleanInput }, '[SurveyEngine] Múltiplas campanhas de QRCode sem keyword. Desambiguação necessária.');
    }
    
    // Final Fallback: Log failure
    console.warn(`[SurveyEngine] ⚠️ No match for "${cleanInput}" on channel ${channelId}.`);
  }

  /**
   * Extracted logic to start a new survey session safely.
   */
  private async startNewSession(tenantId: string, channelId: string, fromPhone: string, campaign: any) {
    const { logger } = await import('../lib/logger.js');
    
    // Resolve/Create Contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId, phoneNumber: fromPhone }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId,
          name: `Inbound (${fromPhone})`,
          phoneNumber: fromPhone,
        }
      });
    } else if (contact.optOut) {
      await prisma.contact.update({ where: { id: contact.id }, data: { optOut: false } });
    }

    // Spawn Session
    const newSession = await prisma.surveySession.create({
      data: {
        tenantId,
        campaignId: campaign.id,
        contactId: contact.id,
        activeStep: 0,
        status: 'OPEN'
      }
    });

    // Send Open message
    const body = campaign.openingBody || 'Olá! Você foi convidado para uma pesquisa rápida.';
    const buttons = [
      { id: 'yes', title: 'SIM' },
      { id: 'no', title: 'NÃO' }
    ];
    
    await this.dispatchMessage(
      channelId, 
      tenantId, 
      fromPhone, 
      body, 
      buttons, 
      campaign.header || undefined, 
      campaign.footer || undefined
    );
    console.log(`[SurveyEngine] 🚀 Session started! Phone: ${fromPhone} | Campaign: ${campaign.id}`);
  }

  /**
   * Universal message dispatcher that chooses between Meta and Baileys.
   */
  private async dispatchMessage(channelId: string, tenantId: string, to: string, text: string, buttons?: { id: string, title: string }[], header?: string, footer?: string) {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel) throw new Error('Channel not found for dispatch');

    if (channel.provider === 'BAILEYS') {
      const baileys = await this.getBaileys();
      let fullText = text;
      
      // For Baileys, we prepend/append header/footer since it's plain text
      if (header) fullText = `*${header}*\n\n${fullText}`;
      if (footer) fullText = `${fullText}\n\n_${footer}_`;
      
      if (buttons && buttons.length > 0) {
        fullText += '\n\n' + buttons.map(b => `*${b.title}*`).join(' | ');
      }
      return await baileys.sendMessage(channelId, tenantId, to, fullText);
    } else if (channel.provider === 'META') {
      const meta = await this.getMeta();
      if (buttons && buttons.length > 0) {
        return await meta.sendButtons(channel, to, text, buttons, header, footer);
      }
      
      // Standard message with Meta doesn't have native header/footer in 'text' type 
      // without templates, so we simulate it in the body.
      let fullText = text;
      if (header) fullText = `*${header}*\n\n${fullText}`;
      if (footer) fullText = `${fullText}\n\n_${footer}_`;
      
      return await meta.sendMessage(channel, to, fullText);
    } else {
      throw new Error(`Provider ${channel.provider} not supported by SurveyEngine`);
    }
  }

  private async handleConsentStep(session: any, rawText: string) {
    
    // Prompt de classificação de intenção
    const prompt = `Você é um classificador de intenção de chatbot. O usuário recebeu um convite para uma pesquisa.
Baseado no texto bruto dele com possíveis erros ortográficos, extraia a intenção real.
Retorne APENAS um JSON válido com exatas duas chaves booleanas:
"participating": true se ele indicou de qualquer forma que quer continuar (sim, ss, ok, claro, manda, yes, s). false se ele indicou que deseja sair, parar, cancelar, não, nn. null se não for possível determinar.
"invalid": true APENAS se a frase dele for completamente avulsa e não indicar sim nem não (ex: "quem é?", "bom dia", "?" "fdsfsa"). Caso contrário, false.`;

    const fallback = () => {
      const clean = rawText.trim().toLowerCase();
      const isYes = ['sim', 'quero', 'ss', 's', 'claro', 'pode', 'ok'].includes(clean);
      const isNo = ['nao', 'não', 'nn', 'n', 'sair', 'parar', 'cancelar', 'recusar'].includes(clean);
      if (isYes) return { participating: true, invalid: false };
      if (isNo) return { participating: false, invalid: false };
      return { participating: null, invalid: true };
    };

    const intent = await this.parseIntentWithAI(prompt, rawText, fallback());

    if (intent.invalid || intent.participating === null) {
      const body = 'Não entendi sua resposta 🤔.\n\nPor favor, utilize os botões abaixo para confirmar sua participação:';
      const buttons = [{ id: 'yes', title: 'SIM' }, { id: 'no', title: 'NÃO' }];
      
      await this.dispatchMessage(
        session.campaign.whatsappChannelId,
        session.tenantId,
        session.contact.phoneNumber,
        body,
        buttons
      );
      return;
    }

    if (intent.participating === false) {
      await prisma.contact.update({ where: { id: session.contactId }, data: { optOut: true } });
      await this.closeSession(session, true);
      return;
    }

    if (intent.participating === true) {
      const questions = session.campaign.questions;
      if (questions.length === 0) return this.closeSession(session);

      await prisma.surveySession.update({ where: { id: session.id }, data: { activeStep: 1 } });
      await this.sendQuestion(session.campaign.whatsappChannelId, session.tenantId, session.contact.phoneNumber, questions[0]);
    }
  }

  private async handleQuestionStep(session: any, rawText: string) {
    const questions = session.campaign.questions;
    const qIndex = session.activeStep - 1;
    
    if (qIndex >= questions.length) return this.closeSession(session);

    const currentQ = questions[qIndex];
    let answerValue: number | null = null;
    let answerText: string | null = null;

    if (currentQ.type === 'nps') {
      const prompt = `O usuário deve fornecer uma nota NPS de 0 a 10. Você lerá o texto dele e extrairá apenas a avaliação numérica pretendida. Ele pode escrever por extenso com erros (ex: "zeero", "des", "um", "doze").
Retorne APENAS um JSON válido e estrito com a chave:
"score": o número inteiro representativo extraído da frase. Valor null se for completamente impossível extrair ou não contiver intenção de nota.`;

      const fallback = () => {
         const val = parseInt(rawText.replace(/\D/g, ''), 10);
         return { score: (!isNaN(val) && val >= 0 && val <= 10) ? val : null };
      };

      const aiResponse = await this.parseIntentWithAI(prompt, rawText, fallback());

      if (aiResponse.score === null || typeof aiResponse.score !== 'number' || aiResponse.score < 0 || aiResponse.score > 10) {
         await this.dispatchMessage(
            session.campaign.whatsappChannelId,
            session.tenantId,
            session.contact.phoneNumber,
            'Não consegui identificar a sua nota.\n\nPor favor, digite apenas um dígito de *0 a 10* para prosseguirmos.'
         );
         return;
      }
      answerValue = aiResponse.score;
    } else {
      // Aberta / Texto Livre
      answerText = rawText;
    }

    // Salva a resposta
    await prisma.surveyResponse.create({
      data: {
        tenantId: session.tenantId,
        sessionId: session.id,
        questionId: currentQ.id,
        answerValue,
        answerText
      }
    });

    // Invalida cache do dashboard para este tenant para garantir dados em tempo real
    await invalidateTenantCache(session.tenantId);

    // Avança Step
    const nextStep = session.activeStep + 1;
    await prisma.surveySession.update({ where: { id: session.id }, data: { activeStep: nextStep } });

    // Próxima Pergunta ou Fim
    if (nextStep <= questions.length) {
      await this.sendQuestion(session.campaign.whatsappChannelId, session.tenantId, session.contact.phoneNumber, questions[nextStep - 1]);
    } else {
      await this.closeSession(session);
    }
  }

  private async sendQuestion(channelId: string, tenantId: string, phone: string, question: any) {
    let text = question.text;
    let buttons: { id: string, title: string }[] | undefined = undefined;

    if (question.options) {
      try {
        const options = JSON.parse(question.options);
        if (Array.isArray(options) && options.length > 0 && options.length <= 3) {
           buttons = options.map((opt, idx) => ({
             id: `opt_${idx}`,
             title: String(opt).substring(0, 20) // Meta: Max 20 chars for button title
           }));
        }
      } catch (e) {
        console.error('[SurveyEngine] Error parsing question options:', e);
      }
    }
    
    if (question.type === 'nps') {
      text += '\n\n_(Responda com um número de 0 a 10)_';
    } else if (!buttons) {
      text += '\n\n_(Digite sua resposta)_';
    }

    await this.dispatchMessage(channelId, tenantId, phone, text, buttons);
  }

  private async closeSession(session: any, forcesNoMessage = false) {
    await prisma.surveySession.update({
      where: { id: session.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    if (!forcesNoMessage && session.campaign.closingMessage) {
      await this.dispatchMessage(
        session.campaign.whatsappChannelId,
        session.tenantId,
        session.contact.phoneNumber,
        session.campaign.closingMessage
      );
    } else if (forcesNoMessage) {
      await this.dispatchMessage(
        session.campaign.whatsappChannelId,
        session.tenantId,
        session.contact.phoneNumber,
        'Certo. Você não receberá mais mensagens dessa pesquisa. Obrigado!'
      );
    }
  }
}

export const surveyEngine = new SurveyEngine();
