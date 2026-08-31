const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ALL_MODULES = [
  'dashboard', 'suppliers', 'integrations', 'catalog', 'products', 'categories', 'brands',
  'manufacturers', 'variants', 'media', 'mapping', 'validation', 'inventory_sync',
  'pricing_sync', 'image_sync', 'store_management', 'website_sync', 'sync_jobs',
  'logs', 'monitoring', 'reports', 'users', 'roles', 'permissions', 'settings'
];

async function main() {
  console.log('Seeding permissions...');
  
  for (const mod of ALL_MODULES) {
    const exists = await prisma.permission.findUnique({
      where: { name: mod }
    });
    
    if (!exists) {
      await prisma.permission.create({
        data: { name: mod }
      });
      console.log(`Created permission: ${mod}`);
    } else {
      console.log(`Permission already exists: ${mod}`);
    }
  }
  
  const ownerRole = await prisma.role.findUnique({ where: { name: 'platform_owner' } });
  if (ownerRole) {
    const perms = await prisma.permission.findMany();
    
    await prisma.rolePermission.deleteMany({
      where: { roleId: ownerRole.id }
    });
    
    for (const p of perms) {
      await prisma.rolePermission.create({
        data: {
          roleId: ownerRole.id,
          permissionId: p.id
        }
      });
    }
    console.log('Linked all permissions to platform_owner role');
  }

  console.log('Permissions seeded successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
