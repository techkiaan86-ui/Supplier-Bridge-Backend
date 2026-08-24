const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany();
  console.log("Products:");
  console.log(products);
  const suppliers = await prisma.supplier.findMany();
  console.log("Suppliers:");
  console.log(suppliers);
}

main().finally(() => prisma.$disconnect());
