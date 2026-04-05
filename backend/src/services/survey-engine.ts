import { prisma } from '../lib/prisma.js';
import { invalidateTenantCache } from '../lib/redis.js';
import { webhookService } from './webhook-service.js';
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
        temperature: 0,
        max_tokens: 150,
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('[SurveyEngine] Falha ao consultar OpenAI:', error);
      return fallback;
    }
  }

  /**
   * Compara uma resposta de texto livre com uma lista de opções esperadas.
   */
  private async matchOptionWithAI(text: string, options: string[]) {
    const prompt = `Você é um motor de processamento de mensagens. O usuário enviou uma resposta a uma pergunta de múltipla escolha.
Sua tarefa é identificar qual das opções fornecidas melhor corresponde à intenção do usuário.
Retorne APENAS um JSON válido:
{
  "matchedIndex": número (índice da opção, começando em 0),
  "confidence": número (0 a 1),
  "invalid": booleano (true se o texto não tiver nada a ver com as opções)
}
Opções: ${JSON.stringify(options)}`;

    const fallback = { matchedIndex: -1, confidence: 0, invalid: true };
    const result = await this.parseIntentWithAI(prompt, text, fallback);
    return result;
  }

  public async handleIncomingMessage(channelId: string, fromPhone: string, text: string, pushName?: string) {
    const { logger } = await import('../lib/logger.js');
    
    // Normalize Phone Number (Extract digits before @s.whatsapp.net or @lid)
    // Matches the part before any @ or : (for LIDs like 5511...:1@lid)
    const normalizedPhone = fromPhone.split(/[@:]/)[0] || fromPhone;
    
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
      normalizedPhone,
      pushName,
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
          contact: { phoneNumber: normalizedPhone },
          campaign: { whatsappChannelId: channelId }
        },
        data: { status: 'CLOSED', closedAt: new Date() }
      });
      
      return await this.startNewSession(tenantId, channelId, normalizedPhone, keywordCampaign, pushName);
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
                contact: { phoneNumber: normalizedPhone },
                campaign: { whatsappChannelId: channelId }
            },
            include: { campaign: true }
        });
        if (active) {
            if (active.campaign.topicId) {
                await prisma.contactTopicOptOut.upsert({
                    where: { contactId_topicId: { contactId: active.contactId, topicId: active.campaign.topicId } },
                    create: { tenantId, contactId: active.contactId, topicId: active.campaign.topicId },
                    update: {}
                });
            } else {
                await prisma.contact.update({ where: { id: active.contactId }, data: { optOut: true } });
            }
            await this.closeSession(active, true); // true = forces no "thank you" message, send specific cancel msg
            return;
        }
    }

    // 2. No Keyword match? Check for existing ACTIVE session
    const session = await prisma.surveySession.findFirst({
      where: {
        tenantId,
        status: 'OPEN',
        contact: { phoneNumber: normalizedPhone },
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
        // Update Contact Name if currently generic but we have a pushName
        if (pushName && session.contact && (session.contact.name.includes('Inbound (') || session.contact.name === 'Unknown')) {
            await prisma.contact.update({
                where: { id: session.contactId },
                data: { name: pushName }
            }).catch(e => console.error('[SurveyEngine] Error auto-updating contact name in existing session:', e));
        }

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
      return await this.startNewSession(tenantId, channelId, normalizedPhone, campaign, pushName);
    } else if (qrcodeCampaigns.length > 1) {
       logger.warn({ count: qrcodeCampaigns.length, cleanInput }, '[SurveyEngine] Múltiplas campanhas de QRCode sem keyword. Desambiguação necessária.');
    }
    
    // Final Fallback: Log failure
    console.warn(`[SurveyEngine] ⚠️ No match for "${cleanInput}" on channel ${channelId}.`);
  }

  /**
   * Extracted logic to start a new survey session safely.
   */
  public async startNewSession(tenantId: string, channelId: string, fromPhone: string, campaign: any, pushName?: string) {
    const { logger } = await import('../lib/logger.js');
    
    // Normalize Phone (Double check during session start)
    const normalizedPhone = fromPhone.split(/[@:]/)[0] || fromPhone;

    // Resolve/Create Contact
    let contact = await prisma.contact.findFirst({
      where: { tenantId, phoneNumber: normalizedPhone }
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          tenantId,
          name: pushName || `Inbound (${normalizedPhone})`,
          phoneNumber: normalizedPhone,
        }
      });
    } else {
      // If contact exists but has a placeholder name, and we now have a real pushName
      if (pushName && (contact.name.includes('Inbound (') || contact.name === 'Unknown')) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { name: pushName }
        });
      }

      if (contact.optOut) {
        await prisma.contact.update({ where: { id: contact.id }, data: { optOut: false } });
      }
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
    const body = campaign.openingBody || 'Olá! Você aceita participar de uma breve pesquisa de satisfação?';
    const buttons = [
      { id: 'yes', title: (campaign.buttonYes || '✅ Sim, aceito').substring(0, 20) },
      { id: 'no', title: (campaign.buttonNo || '❌ Não, obrigado').substring(0, 20) }
    ];
    
    // Header setup with Image support
    const header = campaign.mediaPath 
      ? { type: 'image' as const, value: campaign.mediaPath }
      : (campaign.header ? { type: 'text' as const, value: campaign.header } : undefined);

    // Enterprise: Template (HSM) Support for proactive initial message
    if (campaign.isHsm && campaign.templateName && campaign.whatsappChannelId) {
       await this.dispatchMessage(
         channelId, 
         tenantId, 
         normalizedPhone, 
         body, 
         undefined, // Templates don't use dynamic buttons here
         undefined, 
         undefined,
         undefined, // questionId
         newSession.id,
         campaign.templateName
       );
    } else {
       await this.dispatchMessage(
         channelId, 
         tenantId, 
         normalizedPhone, 
         body, 
         buttons, 
         header, 
         campaign.footer || undefined,
         undefined, // questionId
         newSession.id
       );
    }
    // Send Webhook Event
    await webhookService.queueEvent(tenantId, 'survey.started', {
      sessionId: newSession.id,
      campaignId: campaign.id,
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phoneNumber
      }
    });

    console.log(`[SurveyEngine] 🚀 Session started! Phone: ${fromPhone} | Campaign: ${campaign.id}`);
  }

  /**
   * Universal message dispatcher that chooses between Meta and Baileys.
   * Logs every message for status tracking.
   */
  private async dispatchMessage(
    channelId: string, 
    tenantId: string, 
    to: string, 
    text: string, 
    buttons?: { id: string, title: string }[], 
    header?: { type: 'text' | 'image', value: string }, 
    footer?: string,
    questionId?: string,
    sessionId?: string,
    templateName?: string
  ) {
    const channel = await prisma.whatsAppChannel.findUnique({
      where: { id: channelId }
    });

    if (!channel) throw new Error('Channel not found for dispatch');

    let result: any;

    if (channel.provider === 'BAILEYS') {
      const baileys = await this.getBaileys();
      let fullText = text;
      
      // For Baileys, we prepend/append header/footer since it's plain text
      if (header?.type === 'text') fullText = `*${header.value}*\n\n${fullText}`;
      if (footer) fullText = `${fullText}\n\n_${footer}_`;
      
      if (buttons && buttons.length > 0) {
        fullText += '\n\n' + buttons.map(b => `*${b.title}*`).join(' | ');
      }
      result = await baileys.sendMessage(channelId, tenantId, to, fullText);
    } else if (channel.provider === 'META') {
      const meta = await this.getMeta();
      
      if (templateName) {
        result = await meta.sendTemplate(channel, to, templateName);
      } else if (buttons && buttons.length > 0) {
        if (buttons.length <= 3) {
          result = await meta.sendButtons(channel, to, text, buttons, header, footer);
        } else if (buttons.length <= 10) {
          const sections = [{ title: 'Opções', rows: buttons }];
          result = await meta.sendList(channel, to, text, sections, 'Ver Opções', header, footer);
        }
      } else {
        // Standard text message with simulated header/footer if needed
        let fullText = text;
        if (header?.type === 'text') fullText = `*${header.value}*\n\n${fullText}`;
        if (footer) fullText = `${fullText}\n\n_${footer}_`;
        result = await meta.sendMessage(channel, to, fullText);
      }
    } else {
      throw new Error(`Provider ${channel.provider} not supported by SurveyEngine`);
    }

    // LOG MESSAGE FOR TRACKING (Enterprise)
    if (result?.messages?.[0]?.id && sessionId) {
      await prisma.surveyMessageLog.create({
        data: {
          tenantId,
          sessionId,
          questionId: questionId || null,
          waMessageId: result.messages[0].id,
          status: 'SENT'
        }
      }).catch(e => console.error('[SurveyEngine] Error logging message:', e));
    }

    return result;
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
      const buttons = [
        { id: 'yes', title: (session.campaign.buttonYes || '✅ Sim, aceito').substring(0, 20) }, 
        { id: 'no', title: (session.campaign.buttonNo || '❌ Não, obrigado').substring(0, 20) }
      ];
      
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
      if (session.campaign.topicId) {
         await prisma.contactTopicOptOut.upsert({
             where: { contactId_topicId: { contactId: session.contactId, topicId: session.campaign.topicId } },
             create: { tenantId: session.tenantId, contactId: session.contactId, topicId: session.campaign.topicId },
             update: {}
         });
      } else {
         await prisma.contact.update({ where: { id: session.contactId }, data: { optOut: true } });
      }
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
      const prompt = `O usuário deve fornecer uma nota de satisfação de 0 a 5. Você lerá o texto dele e extrairá apenas a avaliação numérica pretendida. Ele pode escrever por extenso com erros (ex: "cinco", "zero", "quatro").
Retorne APENAS um JSON válido e estrito com a chave:
"score": o número inteiro representativo extraído da frase (0-5). Valor null se for completamente impossível extrair ou não contiver intenção de nota.`;

      const fallback = () => {
         const val = parseInt(rawText.replace(/\D/g, ''), 10);
         return { score: (!isNaN(val) && val >= 0 && val <= 5) ? val : null };
      };

      const aiResponse = await this.parseIntentWithAI(prompt, rawText, fallback());

      if (aiResponse.score === null || typeof aiResponse.score !== 'number' || aiResponse.score < 0 || aiResponse.score > 5) {
         await this.dispatchMessage(
            session.campaign.whatsappChannelId,
            session.tenantId,
            session.contact.phoneNumber,
            'Não consegui identificar a sua nota.\n\nPor favor, envie um número de *0 a 5* para prosseguirmos.'
         );
         return;
      }
      answerValue = aiResponse.score;
    } else if (currentQ.options) {
      // Pergunta de Múltipla Escolha (Botão ou Lista)
      try {
        const rawOptions = JSON.parse(currentQ.options);
        // Normaliza opções para lidar com legado (string[]) e novo (objeto[])
        const options: { label: string, action?: any }[] = rawOptions.map((o: any) => 
          typeof o === 'string' ? { label: o } : o
        );
        
        const optionLabels = options.map(o => o.label);
        
        // Tenta bater exatamente primeiro (se o usuário clicou no botão)
        const exactIdx = options.findIndex((o) => o.label.trim().toLowerCase() === rawText.trim().toLowerCase());
        
        let selectedIdx = exactIdx;
        if (selectedIdx === -1) {
          // Não bateu exato? Chama a IA para desambiguação
          const match = await this.matchOptionWithAI(rawText, optionLabels);
          if (!match.invalid && match.matchedIndex >= 0 && match.matchedIndex < options.length) {
            selectedIdx = match.matchedIndex;
          }
        }

        if (selectedIdx !== -1) {
          const selectedOption = options[selectedIdx]!;
          answerText = selectedOption.label;
          
          // Se tiver uma ação vinculada a esta opção, guarda para processar após o save
          if (selectedOption.action) {
            (session as any).selectedAction = selectedOption.action;
          }
        } else {
           // Resposta inválida para múltipla escolha
           await this.dispatchMessage(
              session.campaign.whatsappChannelId,
              session.tenantId,
              session.contact.phoneNumber,
              'Por favor, selecione uma das opções válidas do menu ou botão acima 👆'
           );
           return;
        }

        // Proteção: se a resposta selecionada for numérica 0-10, promove para answerValue
        if (answerText !== null) {
          const numVal = parseFloat(answerText.trim());
          if (!isNaN(numVal) && numVal >= 0 && numVal <= 10 && String(numVal) === answerText.trim()) {
            answerValue = numVal;
            answerText = null;
          }
        }
      } catch (e) {
        answerText = rawText;
      }
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

    // Avança Step
    let nextStep = session.activeStep + 1;
    const action = (session as any).selectedAction;

    if (action) {
      if (action.type === 'jump' && action.targetQuestionId) {
        if (action.targetQuestionId === 'FINISH') {
           nextStep = questions.length + 1;
        } else {
           const targetIndex = questions.findIndex((q: any) => q.id === action.targetQuestionId);
           if (targetIndex !== -1) {
             nextStep = targetIndex + 1; // Question index is 0-based, Step is 1-based
           }
        }
      } else if (action.type === 'optout') {
        const topicId = action.topicId || session.campaign.topicId;
        if (topicId) {
          await prisma.contactTopicOptOut.upsert({
            where: { contactId_topicId: { contactId: session.contactId, topicId } },
            create: { tenantId: session.tenantId, contactId: session.contactId, topicId },
            update: {}
          });
        } else {
          await prisma.contact.update({ where: { id: session.contactId }, data: { optOut: true } });
        }
        await this.closeSession(session, true);
        return;
      }
    }

    await prisma.surveySession.update({ where: { id: session.id }, data: { activeStep: nextStep } });

    // Invalida cache do dashboard para este tenant para garantir dados em tempo real
    await invalidateTenantCache(session.tenantId);

    // Send Webhook Event (including potential custom webhook action)
    await webhookService.queueEvent(session.tenantId, 'response.received', {
      sessionId: session.id,
      contactId: session.contactId,
      questionId: currentQ.id,
      answerValue,
      answerText,
      surveyFinished: nextStep > questions.length
    });

    // Próxima Pergunta ou Fim
    if (nextStep <= questions.length) {
      await this.sendQuestion(session.campaign.whatsappChannelId, session.tenantId, session.contact.phoneNumber, questions[nextStep - 1], session.id);
    } else {
      await this.closeSession(session);
    }
  }

  private async sendQuestion(channelId: string, tenantId: string, phone: string, question: any, sessionId?: string) {
    let text = question.text;
    let buttons: { id: string, title: string }[] | undefined = undefined;

    if (question.options) {
      try {
        const rawOptions = JSON.parse(question.options);
        if (Array.isArray(rawOptions) && rawOptions.length > 0 && rawOptions.length <= 10) {
           buttons = rawOptions.map((opt, idx) => ({
             id: `opt_${idx}`,
             title: (typeof opt === 'string' ? opt : (opt.label || 'Opção')).substring(0, 20)
           }));
        }
      } catch (e) {
        console.error('[SurveyEngine] Error parsing question options:', e);
      }
    }
    
    if (question.type === 'nps') {
      // Prepara lista de 0 a 5 (Se encaixa perfeitamente no limite de 10 itens da Meta)
      buttons = [
        { id: '5', title: '5 - Muito Provável' },
        { id: '4', title: '4' },
        { id: '3', title: '3' },
        { id: '2', title: '2' },
        { id: '1', title: '1' },
        { id: '0', title: '0 - Nada Provável' },
      ];
    } else if (!buttons) {
      text += '\n\n_(Digite sua resposta)_';
    }

    await this.dispatchMessage(channelId, tenantId, phone, text, buttons, undefined, undefined, question.id, sessionId);
  }

  private async closeSession(session: any, forcesNoMessage = false) {
    await prisma.surveySession.update({
      where: { id: session.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    // Send Webhook Event
    await webhookService.queueEvent(session.tenantId, 'survey.closed', {
      sessionId: session.id,
      campaignId: session.campaignId,
      contactId: session.contactId,
      closedAt: new Date()
    });

    if (!forcesNoMessage && session.campaign.closingMessage) {
      const camp = session.campaign;
      
      // ENTERPRISE CHOICE: CTA Button, Contact Card, or Text
      if (camp.ctaLabel && camp.ctaLink) {
        const meta = await this.getMeta();
        const header = camp.header ? { type: 'text' as const, value: camp.header } : undefined;
        // Check if provider is Meta for official CTA support
        const channel = await prisma.whatsAppChannel.findUnique({ where: { id: camp.whatsappChannelId } });
        
        if (channel?.provider === 'META') {
          await meta.sendCTA(channel, session.contact.phoneNumber, camp.closingMessage, camp.ctaLabel, camp.ctaLink, header, camp.footer || undefined);
        } else {
          // Fallback for Baileys
          await this.dispatchMessage(
            camp.whatsappChannelId,
            session.tenantId,
            session.contact.phoneNumber,
            `${camp.closingMessage}\n\n🔗 *${camp.ctaLabel}*\n${camp.ctaLink}`,
            undefined,
            header,
            camp.footer || undefined,
            undefined,
            session.id
          );
        }
      } else if (camp.supportName && camp.supportPhone) {
        // Send Contact Card
        await this.dispatchMessage(
          camp.whatsappChannelId,
          session.tenantId,
          session.contact.phoneNumber,
          camp.closingMessage,
          undefined,
          undefined,
          undefined,
          undefined,
          session.id
        );
        const meta = await this.getMeta();
        const channel = await prisma.whatsAppChannel.findUnique({ where: { id: camp.whatsappChannelId } });
        if (channel?.provider === 'META') {
           await meta.sendContact(channel, session.contact.phoneNumber, camp.supportName, camp.supportPhone);
        }
      } else {
        // Standard Text Message
        await this.dispatchMessage(
          camp.whatsappChannelId,
          session.tenantId,
          session.contact.phoneNumber,
          camp.closingMessage,
          undefined,
          undefined,
          undefined,
          undefined,
          session.id
        );
      }
    } else if (forcesNoMessage) {
      await this.dispatchMessage(
        session.campaign.whatsappChannelId,
        session.tenantId,
        session.contact.phoneNumber,
        'Certo. Você não receberá mais mensagens dessa pesquisa. Obrigado!',
        undefined,
        undefined,
        undefined,
        undefined,
        session.id
      );
    }
  }
}

export const surveyEngine = new SurveyEngine();
