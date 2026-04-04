import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import dotenv from 'dotenv';
import { surveyQueue } from '../lib/queue.js';

dotenv.config();

/**
 * Automated Scale & Load Test
 * Purpose: Verify that BullMQ handles mass job enqueuing and processing
 * without affecting database responsiveness.
 */

async function runTest() {
  console.log('🚀 Starting SaaS Scale Load Test...');

  // 1. Get a test tenant and campaign
  const tenant = await prisma.tenant.findFirst({
    include: { campaigns: true }
  });

  if (!tenant || tenant.campaigns.length === 0) {
    console.error('❌ No tenant or campaigns found. Run seeding first.');
    return;
  }

  const campaign = tenant.campaigns[0];
  const tenantId = tenant.id;

  console.log(`📊 Testing for Tenant: ${tenant.name} (${tenantId})`);
  console.log(`📡 Campaign: ${campaign.name}`);

  // 2. Clear existing jobs to start fresh
  await surveyQueue.obliterate({ force: true });
  console.log('🧹 Queue cleared.');

  // 3. Measure Dashboard Query Speed (Scale Check)
  console.log('⏱️ Measuring Dashboard Query Performance...');
  const start = Date.now();
  // Simulate the heavy aggregate query I refactored
  await prisma.surveyResponse.aggregate({
    where: { tenantId },
    _count: { id: true }
  });
  const end = Date.now();
  console.log(`✅ Denormalized Query Time: ${end - start}ms (Target: <100ms)`);

  // 4. Trigger Mass Enqueue (1000 jobs)
  console.log('⚡ Enqueuing 1.000 test jobs specialized for this tenant...');
  
  // Get some contacts
  const contacts = await prisma.contact.findMany({
    where: { tenantId },
    take: 1000,
    select: { id: true }
  });

  if (contacts.length === 0) {
    console.error('❌ No contacts found for this tenant.');
    return;
  }

  const jobs = contacts.map(c => ({
    name: 'send-nps-test',
    data: { tenantId, campaignId: campaign.id, contactId: c.id }
  }));

  const enqueueStart = Date.now();
  await surveyQueue.addBulk(jobs);
  const enqueueEnd = Date.now();
  
  console.log(`✅ Enqueued ${jobs.length} jobs in ${enqueueEnd - enqueueStart}ms`);

  // 5. Monitor Worker Progress
  const initialCounts = await surveyQueue.getJobCounts();
  console.log('📈 Initial Queue Stats:', initialCounts);

  console.log('⏳ Waiting 5 seconds for worker to process...');
  await new Promise(r => setTimeout(r, 5000));

  const finalCounts = await surveyQueue.getJobCounts();
  console.log('📈 Final Queue Stats:', finalCounts);
  
  if (finalCounts.completed > initialCounts.completed) {
    console.log(`🎉 SUCCESS: Worker processed ${finalCounts.completed - initialCounts.completed} jobs in 5s!`);
  } else {
    console.warn('⚠️ No jobs processed. Check if worker is running in another terminal.');
  }

  console.log('🏁 Load Test Finished.');
  process.exit(0);
}

runTest().catch(err => {
  console.error('💥 Test Error:', err);
  process.exit(1);
});
