const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDates() {
  try {
    console.log("Fixing zero dates in Product...");
    await prisma.$executeRawUnsafe(`UPDATE Product SET createdAt = '2025-01-01 00:00:00' WHERE createdAt = '0000-00-00 00:00:00'`);
    await prisma.$executeRawUnsafe(`UPDATE Product SET updatedAt = '2025-01-01 00:00:00' WHERE updatedAt = '0000-00-00 00:00:00'`);
    
    console.log("Fixing zero dates in Supplier...");
    await prisma.$executeRawUnsafe(`UPDATE Supplier SET createdAt = '2025-01-01 00:00:00' WHERE createdAt = '0000-00-00 00:00:00'`);
    await prisma.$executeRawUnsafe(`UPDATE Supplier SET updatedAt = '2025-01-01 00:00:00' WHERE updatedAt = '0000-00-00 00:00:00'`);
    
    console.log("Dates fixed.");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
fixDates();
