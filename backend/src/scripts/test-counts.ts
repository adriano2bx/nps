import { prisma } from '../lib/prisma.js';

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          contacts: true,
          sessions: true,
          responses: true,
          users: true
        }
      }
    }
  });

  console.log('--- SaaS Stats for Verification ---');
  tenants.forEach(t => {
    console.log(`🏢 Tenant: ${t.name} (${t.id})`);
    console.log(`   - Users: ${t._count.users}`);
    console.log(`   - Contacts: ${t._count.contacts}`);
    console.log(`   - Sessions (NPS): ${t._count.sessions}`);
    console.log(`   - Responses (NPS): ${t._count.responses}`);
  });
}

main().catch(err => console.error(err));
