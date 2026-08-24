import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM \`pricingrule\`;`);
    console.log('Pricing rules deleted successfully.');
  } catch (err) {
    console.error('Failed to delete pricing rules:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
