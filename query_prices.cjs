const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prices = await prisma.productPrice.findMany({ include: { product: { include: { supplier: true } } } });
  console.log(JSON.stringify(prices, null, 2));
}
main().finally(() => prisma.$disconnect());
