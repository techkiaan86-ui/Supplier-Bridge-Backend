const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sups = await prisma.supplier.findMany({ include: { products: true } });
  console.log(sups.map(s => ({ id: s.id, name: s.name, productsCount: s.products.length })));
}
main().finally(() => prisma.$disconnect());
