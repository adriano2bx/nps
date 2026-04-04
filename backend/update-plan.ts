import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'adriano@2bx.com.br' },
    include: { tenant: true }
  });

  if (!user) {
    console.log('USER_NOT_FOUND');
    return;
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { plan: 'ENTERPRISE' }
  });

  console.log(`UPDATED_TENANT:${updatedTenant.name}:PLAN:${updatedTenant.plan}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\$disconnect();
  });
