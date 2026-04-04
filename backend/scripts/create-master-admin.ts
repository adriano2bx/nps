import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'adrianooliveirasjc@gmail.com';
  const password = 'Eduarda01!';
  
  console.log('🚀 Creating System Tenant and Master Admin...');

  // 1. Ensure System Tenant exists
  const systemTenant = await prisma.tenant.upsert({
    where: { slug: 'system-admin' },
    update: {},
    create: {
      name: 'NPS Multi-Tenant System',
      slug: 'system-admin',
      plan: 'ENTERPRISE',
      settings: {
        isSystem: true
      }
    }
  });

  console.log(`✅ System Tenant ready: ${systemTenant.id}`);

  // 2. Create/Update Master Admin User
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: passwordHash,
      role: 'MASTER_ADMIN',
      tenantId: systemTenant.id
    },
    create: {
      name: 'Adriano Oliveira (Master)',
      email: email,
      passwordHash: passwordHash,
      role: 'MASTER_ADMIN',
      tenantId: systemTenant.id
    }
  });

  console.log(`✅ Master Admin User ready: ${user.name} (${user.id})`);
  console.log(`🔗 Tenant: ${systemTenant.name}`);
  
  // Verify
  const count = await prisma.user.count({ where: { email } });
  console.log(`📊 Verification: Found ${count} user(s) with email ${email}`);
  
  console.log('✨ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error creating master admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
