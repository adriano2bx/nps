import { surveyEngine } from '../src/services/survey-engine.js';
import { prisma } from '../src/lib/prisma.js';
// Configuration
const CHANNEL_ID = 'b35b7588-8280-43f7-b748-8162417a0d27'; // Channel from logs
const PHONE = '5511999999999@s.whatsapp.net';
const TEXT = process.argv[2] || 'TESTE';
async function main() {
    console.log(`[TestTrigger] Sending text "${TEXT}" to channel ${CHANNEL_ID}...`);
    try {
        // 1. Check if channel exists
        const channel = await prisma.whatsAppChannel.findUnique({
            where: { id: CHANNEL_ID }
        });
        if (!channel) {
            console.error(`[TestTrigger] ❌ Channel ${CHANNEL_ID} not found in DB!`);
            const allChannels = await prisma.whatsAppChannel.findMany({ take: 5 });
            console.log('[TestTrigger] Available channel IDs:', allChannels.map(c => c.id));
            process.exit(1);
        }
        console.log(`[TestTrigger] ✅ Channel found: ${channel.name} (Tenant: ${channel.tenantId})`);
        // 2. Call handler
        await surveyEngine.handleIncomingMessage(CHANNEL_ID, PHONE, TEXT);
        console.log('[TestTrigger] ✅ Handler execution finished. Check logs for results.');
    }
    catch (error) {
        console.error('[TestTrigger] ❌ Error:', error);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test-trigger.js.map