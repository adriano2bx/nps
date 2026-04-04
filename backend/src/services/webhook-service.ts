import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';

/**
 * Webhook Dispatch Service
 * Handles queuing of platform events for asynchronous delivery to customer endpoints.
 */
class WebhookService {
  private queue: Queue;

  constructor() {
    this.queue = new Queue('webhook-dispatch', { connection: redis });
  }

  /**
   * Queues an event for a specific tenant.
   * Checks if the tenant has active webhooks for that event before queuing.
   */
  async queueEvent(tenantId: string, event: string, payload: any) {
    try {
      // Find active webhooks for this tenant and event
      const webhooks = await prisma.tenantWebhook.findMany({
        where: {
          tenantId,
          active: true,
          events: { contains: event }
        }
      });

      if (webhooks.length === 0) return;

      const jobs = webhooks.map(w => ({
        name: `webhook:${event}`,
        data: {
          webhookId: w.id,
          url: w.url,
          secret: w.secret, // Used for HMAC signature
          event,
          payload: {
             event,
             timestamp: new Date().toISOString(),
             tenantId,
             data: payload
          }
        },
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        }
      }));

      await this.queue.addBulk(jobs);
      console.log(`[WebhookService] 🚚 Queued ${jobs.length} deliveries for event: ${event}`);
    } catch (error) {
      console.error('[WebhookService] Error queuing event:', error);
    }
  }
}

export const webhookService = new WebhookService();
