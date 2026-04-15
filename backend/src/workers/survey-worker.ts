import { Worker, Job } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
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
        include: { segments: true, topicOptOuts: true }
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
      if (campaign.topicId && contact.topicOptOuts) {
        const isOptedOut = contact.topicOptOuts.some(op => op.topicId === campaign.topicId);
        if (isOptedOut) {
           console.log(`[Worker] Skip: Contact ${contact.phoneNumber} is Opt-Out for Topic ${campaign.topicId}`);
           return;
        }
      }

      const provider = 'META';

      const { surveyEngine } = await import('../services/survey-engine.js');
      await surveyEngine.startNewSession(tenantId, campaign.whatsappChannelId!, contact.phoneNumber, campaign);
      
      console.log(`[Worker] ✅ Success: Survey flow started for ${contact.name} via ${provider}`);
      return { success: true };

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
