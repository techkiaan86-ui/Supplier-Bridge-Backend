const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const USERS = [
  { name: 'Alex Morrison', email: 'alex@supplybridge.io', roleName: 'platform_owner', password: 'admin123' },
  { name: 'Sarah Kim', email: 'sarah@supplybridge.io', roleName: 'administrator', password: 'admin123' },
  { name: 'James Patel', email: 'jpatel@supplybridge.io', roleName: 'catalog_manager', password: 'admin123' },
  { name: 'Elena Rostova', email: 'elena@supplybridge.io', roleName: 'integration_manager', password: 'admin123' },
  { name: 'David Vance', email: 'dvance@supplybridge.io', roleName: 'operations_staff', password: 'admin123' },
];

async function main() {
  for (const u of USERS) {
    let role = await prisma.role.findUnique({ where: { name: u.roleName } });
    if (!role) {
      role = await prisma.role.create({ data: { name: u.roleName } });
      console.log('Created role: ' + u.roleName);
    }

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log('User already exists: ' + u.email + ' (skipping)');
      continue;
    }

    const hashed = await bcrypt.hash(u.password, 12);
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: hashed,
        status: 'active',
        roleId: role.id,
      }
    });
    console.log('Created user: ' + u.name + ' (' + u.email + ') with role ' + u.roleName);
  }
  console.log('\nAll users ready! Password for all: admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
