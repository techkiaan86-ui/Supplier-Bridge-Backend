import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Seed basic RBAC
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrator' },
    update: {},
    create: { name: 'Administrator' }
  });

  // Seed Dummy Supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: 'TechData Electronics',
      company: 'TechData Corp',
      email: 'sync@techdata.com',
      status: 'active'
    }
  });

  // Seed Dummy Product
  await prisma.product.create({
    data: {
      sku: 'TD-1001-A',
      title: 'Enterprise Server Rack 42U',
      status: 'published',
      supplierId: supplier.id
    }
  });

  console.log('Database seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
