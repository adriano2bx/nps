import { logger } from '../lib/logger.js';

interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'interactive';
  text?: { body: string };
  interactive?: any;
}

class WhatsAppMeta {
  private getApiUrl(phoneNumberId: string) {
    return `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  }

  /**
   * Envia uma mensagem de texto simples via WhatsApp Cloud API (Meta).
   */
  public async sendMessage(channel: any, to: string, text: string) {
    const { phoneNumberId, accessToken } = channel;

    if (!phoneNumberId || !accessToken) {
      throw new Error(`Canal ${channel.id} está sem Phone ID ou Access Token da Meta.`);
    }

    const cleanNumber = to.replace(/\D/g, '');
    
    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'text',
      text: { body: text },
    };

    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  /**
   * Envia botões interativos (limite de 3 pela Meta).
   */
  public async sendButtons(channel: any, to: string, bodyText: string, buttons: { id: string, title: string }[], headerText?: string, footerText?: string) {
    const { phoneNumberId, accessToken } = channel;

    if (!phoneNumberId || !accessToken) {
      throw new Error(`Canal ${channel.id} está sem Phone ID ou Access Token da Meta.`);
    }

    const cleanNumber = to.replace(/\D/g, '');
    const limitedButtons = buttons.slice(0, 3);

    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: limitedButtons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title }
          }))
        }
      }
    };

    if (headerText) {
      payload.interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      payload.interactive.footer = { text: footerText };
    }

    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  private async postToMeta(phoneNumberId: string, accessToken: string, payload: any) {
    try {
      const response = await fetch(this.getApiUrl(phoneNumberId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error({ data, phoneNumberId }, '[MetaService] Erro ao enviar mensagem');
        throw new Error(data.error?.message || 'Erro desconhecido na Cloud API');
      }

      logger.info({ messageId: data.messages?.[0]?.id, to: payload.to }, '[MetaService] Mensagem enviada com sucesso');
      return data;
    } catch (error: any) {
      logger.error({ error: error.message }, '[MetaService] Falha na requisição');
      throw error;
    }
  }
}

export const whatsappMeta = new WhatsAppMeta();
