import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  if (auditLogs.length === 0) {
    console.log('📭 Nenhuma atividade registrada no AuditLog.');
    return;
  }

  console.log('📝 Atividades Recentes (AuditLog):');
  auditLogs.forEach(log => {
    console.log(`- [${log.createdAt}] Action: ${log.action} | Resource: ${log.resource} | Details: ${log.details}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
