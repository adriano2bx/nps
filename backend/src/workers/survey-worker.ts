import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { baileysManager } from '../services/baileys-manager.js';
import { whatsappMeta } from '../services/whatsapp-meta.js';

interface SurveyJobData {
  tenantId: string;
  campaignId: string;
  contactId: string;
}

/**
 * Survey Distribution Worker
 * Handles actual message sending and session creation in background.
 */
export const setupSurveyWorker = () => {
  const worker = new Worker('nps-surveys', async (job: Job<SurveyJobData>) => {
    const { tenantId, campaignId, contactId } = job.data;
    console.log(`[Worker] ✨ Processing job ${job.id} for tenant ${tenantId}`);

    try {
      // 1. Fetch Campaign, Contact and Channel
      const contact = await prisma.contact.findUnique({
        where: { id: contactId, tenantId },
        include: { segments: true }
      });

      const campaign = await prisma.surveyCampaign.findUnique({
        where: { id: campaignId, tenantId },
        include: { 
          questions: { orderBy: { orderIndex: 'asc' } },
          whatsappChannel: true
        }
      });

      if (!campaign || !contact) {
        throw new Error(`Campaign (${campaignId}) or Contact (${contactId}) not found for tenant ${tenantId}`);
      }

      if (contact.optOut) {
        console.log(`[Worker] Skip: Contact ${contact.phoneNumber} is Opt-Out`);
        return;
      }

      const provider = campaign.whatsappChannel?.provider || 'META';

      // 2. Create Survey Session
      const session = await prisma.surveySession.create({
        data: {
          tenantId,
          campaignId,
          contactId,
          status: 'PENDING',
          startedAt: new Date()
        }
      });

      // 3. Dispatch based on Provider
      if (provider === 'BAILEYS') {
        if (!campaign.whatsappChannelId) throw new Error('No channel assigned to campaign');
        
        const textPayload = (campaign.openingBody || '') + '\n\nResponda SIM para participar ou NÃO para recusar.';
        await baileysManager.sendMessage(
          campaign.whatsappChannelId, 
          tenantId, 
          contact.phoneNumber, 
          textPayload
        );
        
        console.log(`[Worker] ✅ Baileys Success: Message sent to ${contact.phoneNumber}`);
      } else if (provider === 'META') {
        if (!campaign.whatsappChannel) throw new Error('No channel assigned to campaign');
        
        const textPayload = (campaign.openingBody || '') + '\n\nResponda SIM para participar ou NÃO para recusar.';
        
        // For Meta, we use plain text for now. 
        // Note: Official Cloud API allows Buttons (Interactive Messages), which can be added later.
        await whatsappMeta.sendMessage(
          campaign.whatsappChannel,
          contact.phoneNumber,
          textPayload
        );
        
        console.log(`[Worker] ✅ Meta Success: Message sent to ${contact.phoneNumber}`);
      }
      
      console.log(`[Worker] ✅ Success: Message triggered for ${contact.name} via ${provider}`);
      return { success: true, sessionId: session.id };

    } catch (error) {
      console.error(`[Worker] ❌ Failed job ${job.id}:`, error);
      throw error;
    }
  }, {
    connection: redis,
    concurrency: 10, // Global concurrency per worker instance
    limiter: {
      max: 100, // Throttling: max 100 jobs per 10 seconds
      duration: 10000
    }
  });

  worker.on('completed', job => {
    console.log(`[Worker] Completed job ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
};
