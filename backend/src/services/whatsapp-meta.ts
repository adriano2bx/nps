import { logger } from '../lib/logger.js';

interface MetaMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: { body: string };
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

    // Limpa o número (apenas dígitos)
    const cleanNumber = to.replace(/\D/g, '');
    
    const payload: MetaMessagePayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanNumber,
      type: 'text',
      text: { body: text },
    };

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
        logger.error({ data, channelId: channel.id }, '[MetaService] Erro ao enviar mensagem');
        throw new Error(data.error?.message || 'Erro desconhecido na Cloud API');
      }

      logger.info({ messageId: data.messages?.[0]?.id, to: cleanNumber }, '[MetaService] Mensagem enviada com sucesso');
      return data;
    } catch (error: any) {
      logger.error({ error: error.message, channelId: channel.id }, '[MetaService] Falha na requisição');
      throw error;
    }
  }
}

export const whatsappMeta = new WhatsAppMeta();
