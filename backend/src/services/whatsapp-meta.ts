import { logger } from '../lib/logger.js';

interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'interactive' | 'image' | 'template' | 'contacts';
  text?: { body: string };
  image?: { link: string; caption?: string };
  template?: any;
  contacts?: any[];
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
   * Envia botões interativos (1-3 botões de resposta rápida).
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

    this.applyHeaderFooter(payload, header, footer);
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

    this.applyHeaderFooter(payload, header, footer);
    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  /**
   * Envia um botão de Call to Action (CTA) com URL.
   */
  public async sendCTA(channel: any, to: string, bodyText: string, buttonLabel: string, url: string, header?: { type: 'text' | 'image', value: string }, footer?: string) {
    const { phoneNumberId, accessToken } = channel;
    const cleanNumber = to.replace(/\D/g, '');

    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: bodyText },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: buttonLabel.substring(0, 20),
            url
          }
        }
      }
    };

    this.applyHeaderFooter(payload, header, footer);
    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  /**
   * Envia um cartão de contato (VCard).
   */
  public async sendContact(channel: any, to: string, contactName: string, contactPhone: string) {
    const { phoneNumberId, accessToken } = channel;
    const cleanNumber = to.replace(/\D/g, '');

    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'contacts',
      contacts: [
        {
          name: {
            formatted_name: contactName,
            first_name: contactName
          },
          phones: [
            {
              phone: contactPhone.replace(/\D/g, ''),
              type: 'WORK'
            }
          ]
        }
      ]
    };

    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  /**
   * Envia um template HSM oficial da Meta.
   */
  public async sendTemplate(channel: any, to: string, templateName: string, languageCode: string = 'pt_BR') {
    const { phoneNumberId, accessToken } = channel;
    const cleanNumber = to.replace(/\D/g, '');

    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode }
      }
    };

    return this.postToMeta(phoneNumberId, accessToken, payload);
  }

  private applyHeaderFooter(payload: any, header?: { type: 'text' | 'image', value: string }, footer?: string) {
    if (header) {
      if (header.type === 'text') payload.interactive.header = { type: 'text', text: header.value.substring(0, 60) };
      if (header.type === 'image') {
        logger.info({ imageUrl: header.value }, '[MetaService] Attaching image header to interactive message');
        payload.interactive.header = { type: 'image', image: { link: header.value } };
      }
    }
    if (footer) {
      payload.interactive.footer = { text: footer.substring(0, 60) };
    }
  }

  /**
   * Downloads a media file (like audio) from Meta using its ID.
   * Required for Speech-to-Text (Voice Messages).
   */
  public async downloadMedia(mediaId: string, accessToken: string): Promise<Buffer> {
    try {
      // 1. Get Media URL and Metadata
      const infoResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const info = await infoResponse.json();
      if (!info.url) {
        throw new Error(`Media ID ${mediaId} not found or has no URL.`);
      }

      // 2. Download the actual binary data
      const mediaResponse = await fetch(info.url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!mediaResponse.ok) {
        throw new Error(`Failed to download media binary: ${mediaResponse.statusText}`);
      }

      const arrayBuffer = await mediaResponse.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error: any) {
      logger.error({ error: error.message, mediaId }, '[MetaService] Failed to download media');
      throw error;
    }
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
