import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'saude-premium' },
    update: {},
    create: {
      name: 'Saúde Premium Clinic',
      slug: 'saude-premium',
      plan: 'pro',
      settings: {
        theme: 'dark',
        timezone: 'America/Sao_Paulo'
      }
    },
  });

  console.log(`✅ Created Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create Initial User
  const passwordHash = await bcrypt.hash('change-me-123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@saudepremium.com.br' },
    update: {
      passwordHash: passwordHash
    },
    create: {
      name: 'Administrador Desktop',
      email: 'admin@saudepremium.com.br',
      passwordHash: passwordHash,
      role: 'admin',
      tenantId: tenant.id
    },
  });

  console.log(`✅ Created User: ${user.name} (${user.id})`);

  // 3. Create a Sample Channel
  await prisma.whatsAppChannel.create({
    data: {
      name: 'Whatsapp Central',
      provider: 'META',
      phoneNumberId: '1092837465',
      wabaId: '998273645',
      accessToken: 'EAAC...',
      verifyToken: 'hvnps_abc123',
      tenantId: tenant.id
    }
  });

  console.log('✅ Created initial WhatsApp Channel');
  console.log('✨ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
