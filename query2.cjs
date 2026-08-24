const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const products = await prisma.product.findMany();
  console.log("Products count:", products.length);
  const jobs = await prisma.importJob.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  console.log("Latest Import Jobs:", JSON.stringify(jobs, null, 2));
}
main().finally(() => prisma.$disconnect());
