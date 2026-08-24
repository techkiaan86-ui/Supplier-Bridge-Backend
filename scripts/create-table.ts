import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`suppliersource\` (
        \`id\` varchar(191) NOT NULL,
        \`productId\` varchar(191) NOT NULL,
        \`supplierId\` varchar(191) NOT NULL,
        \`supplierSku\` varchar(191) NOT NULL,
        \`cost\` double NOT NULL,
        \`inventory\` int NOT NULL DEFAULT 0,
        \`uom\` varchar(191),
        \`minOrderQty\` int NOT NULL DEFAULT 1,
        \`isPreferred\` boolean NOT NULL DEFAULT false,
        \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`suppliersource_productId_supplierId_key\` (\`productId\`,\`supplierId\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Table suppliersource created successfully.');
  } catch (err) {
    console.error('Failed to create table:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
