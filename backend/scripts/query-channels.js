import { prisma } from '../src/lib/prisma.js';
async function main() {
    const channels = await prisma.whatsAppChannel.findMany();
    console.log(JSON.stringify(channels, null, 2));
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=query-channels.js.map