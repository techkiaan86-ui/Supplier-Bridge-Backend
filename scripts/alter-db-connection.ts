import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`supplierconnection\` 
      ADD COLUMN \`fieldMapping\` JSON NULL;
    `).catch(e => console.log('Column might already exist.', e.message));

    console.log('Database updated successfully via SQL.');
  } catch (err) {
    console.error('Failed to update DB:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
