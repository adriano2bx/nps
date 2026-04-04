import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'adriano@2bx.com.br' },
    include: { tenant: true }
  });

  if (!user) {
    console.log('--- RESULT: USER_NOT_FOUND ---');
  } else {
    console.log(`--- RESULT: USER:${user.email} | TENANT:${user.tenant.name} | PLAN:${user.tenant.plan} ---`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
