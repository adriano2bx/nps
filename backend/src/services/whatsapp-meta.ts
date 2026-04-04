import { logger } from '../lib/logger.js';

interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'interactive' | 'image';
  text?: { body: string };
  image?: { link: string; caption?: string };
  interactive?: any;
}

class WhatsAppMeta {
  private getApiUrl(phoneNumberId: string) {
    return `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  }

  /**
   * Envia uma mensagem de texto simples.
   */
  public async sendMessage(channel: any, to: string, text: string) {
    const { phoneNumberId, accessToken } = channel;
    if (!phoneNumberId || !accessToken) throw new Error('Missing Meta credentials');

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
   * Envia botões interativos (1-3 botões).
   */
  public async sendButtons(channel: any, to: string, bodyText: string, buttons: { id: string, title: string }[], header?: { type: 'text' | 'image', value: string }, footer?: string) {
    const { phoneNumberId, accessToken } = channel;
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
            reply: { id: b.id, title: b.title.substring(0, 20) }
          }))
        }
      }
    };

    if (header) {
      if (header.type === 'text') payload.interactive.header = { type: 'text', text: header.value.substring(0, 60) };
      if (header.type === 'image') payload.interactive.header = { type: 'image', image: { link: header.value } };
    }

    if (footer) {
      payload.interactive.footer = { text: footer.substring(0, 60) };
    }

    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  /**
   * Envia uma lista interativa (menu suspenso - 1 a 10 opções).
   */
  public async sendList(channel: any, to: string, bodyText: string, sections: { title: string, rows: { id: string, title: string, description?: string }[] }[], buttonLabel: string, header?: { type: 'text' | 'image', value: string }, footer?: string) {
    const { phoneNumberId, accessToken } = channel;
    const cleanNumber = to.replace(/\D/g, '');

    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonLabel.substring(0, 20),
          sections: sections.map(s => ({
            title: s.title.substring(0, 24),
            rows: s.rows.map(r => ({
              id: r.id,
              title: r.title.substring(0, 24),
              description: r.description?.substring(0, 72)
            }))
          }))
        }
      }
    };

    if (header) {
      if (header.type === 'text') payload.interactive.header = { type: 'text', text: header.value.substring(0, 60) };
      if (header.type === 'image') payload.interactive.header = { type: 'image', image: { link: header.value } };
    }

    if (footer) {
      payload.interactive.footer = { text: footer.substring(0, 60) };
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

      return data;
    } catch (error: any) {
      logger.error({ error: error.message }, '[MetaService] Falha na requisição');
      throw error;
    }
  }
}

export const whatsappMeta = new WhatsAppMeta();
