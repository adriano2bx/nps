import { prisma } from '../src/lib/prisma.js';
async function main() {
    const JID = '18249383174321@lid';
    console.log(`[Query] Fetching latest session and responses for ${JID}...`);
    const session = await prisma.surveySession.findFirst({
        where: {
            contact: { phoneNumber: JID }
        },
        orderBy: { startedAt: 'desc' },
        include: {
            contact: true,
            campaign: true,
            responses: {
                include: {
                    question: true
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });
    if (!session) {
        console.log('[Query] ❌ No session found for this phone number.');
        return;
    }
    console.log('[Query] ✅ Session Found:');
    console.log(`ID: ${session.id}`);
    console.log(`Status: ${session.status}`);
    console.log(`Started At: ${session.startedAt}`);
    console.log(`Campaign: ${session.campaign.name}`);
    console.log('\n--- Responses ---');
    session.responses.forEach((r, i) => {
        console.log(`Q${i + 1}: ${r.question.text}`);
        console.log(`A: ${r.answerValue !== null ? r.answerValue : r.answerText}`);
        console.log('---');
    });
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=check-results.js.map