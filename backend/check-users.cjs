const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: { tenant: true }
    });

    for (const u of users) {
      console.log(`USER:${u.email}|TENANT_ID:${u.tenantId}|TENANT_NAME:${u.tenant.name}|PLAN:${u.tenant.plan}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
