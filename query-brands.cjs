const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany();
  console.log("Brands:");
  console.log(brands);
}

main().finally(() => prisma.$disconnect());
