const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const p = await prisma.product.findMany();
    console.log("Products fetched successfully:", p.length);
    const s = await prisma.supplier.findMany();
    console.log("Suppliers fetched successfully:", s.length);
  } catch (err) {
    console.error("PRISMA ERROR:");
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
