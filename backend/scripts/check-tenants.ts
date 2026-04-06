import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, _count: { select: { campaigns: true, users: true } } }
  });

  console.log('🏢 Tenantes no Banco:');
  tenants.forEach(t => {
    console.log(`- ${t.name} (ID: ${t.id}) [Usuarios: ${t._count.users}, Campanhas: ${t._count.campaigns}]`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
