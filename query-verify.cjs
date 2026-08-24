const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: true }
  });
  console.log(`Total Products: ${products.length}`);
  products.forEach(p => {
    console.log(`Product: ${p.title} - Variants: ${p.variants.length}`);
  });
}

main().finally(() => prisma.$disconnect());
