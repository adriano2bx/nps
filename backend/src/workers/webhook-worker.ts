import { Worker } from 'bullmq';
import axios from 'axios';
import crypto from 'crypto';
import { redis } from '../lib/redis.js';

/**
 * Webhook Dispatch Worker
 * Consumes events from the 'webhook-dispatch' queue and performs the actual HTTP delivery.
 * Implements HMAC-SHA256 signatures for security.
 */
export const setupWebhookWorker = () => {
  const worker = new Worker('webhook-dispatch', async (job) => {
    const { url, secret, payload, event, webhookId } = job.data;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-NPS-Event': event,
        'X-NPS-Delivery-ID': job.id || '',
        'User-Agent': 'NPS-Platform-Integration/1.0'
      };

      // Generate HMAC Signature if secret is provided
      if (secret) {
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-NPS-Signature'] = signature;
      }

      const response = await axios.post(url, payload, {
        headers,
        timeout: 10000 // 10s timeout
      });

      console.log(`[WebhookWorker] ✅ Delivered ${event} to ${url} (Status: ${response.status})`);
      return { status: response.status, data: response.data };
    } catch (error: any) {
      console.error(`[WebhookWorker] ❌ Failed to deliver ${event} to ${url}:`, error.message);
      
      // Axios errors provide useful status codes for retries logic if needed
      // BullMQ will automatically retry based on job options if we throw
      throw error;
    }
  }, { 
    connection: redis,
    concurrency: 10 // Handle 10 deliveries in parallel
  });

  worker.on('failed', (job, err) => {
    console.warn(`[WebhookWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });

  return worker;
};
