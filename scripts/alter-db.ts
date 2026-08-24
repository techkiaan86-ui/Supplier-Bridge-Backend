import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    // 1. Alter store table
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`store\` 
      ADD COLUMN \`productsCron\` varchar(191) DEFAULT '0 2 * * *',
      ADD COLUMN \`categoriesCron\` varchar(191) DEFAULT '0 3 * * *',
      ADD COLUMN \`variantsCron\` varchar(191) DEFAULT '0 4 * * *',
      ADD COLUMN \`statusCron\` varchar(191) DEFAULT '0 5 * * *';
    `).catch(e => console.log('Store columns might already exist.', e.message));

    // 2. Drop and Recreate pricingrule table
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS \`pricingrule\`;`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE \`pricingrule\` (
        \`id\` varchar(191) NOT NULL,
        \`name\` varchar(191) NOT NULL,
        \`type\` varchar(191) NOT NULL,
        \`value\` double NOT NULL,
        \`priority\` int NOT NULL DEFAULT 100,
        \`targetSupplierId\` varchar(191),
        \`targetCategoryId\` varchar(191),
        \`targetBrandId\` varchar(191),
        \`active\` boolean NOT NULL DEFAULT true,
        \`createdAt\` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` datetime(3) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Database updated successfully via SQL.');
  } catch (err) {
    console.error('Failed to update DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
