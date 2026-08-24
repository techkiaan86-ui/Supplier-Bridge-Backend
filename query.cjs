const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const sups = await prisma.supplier.findMany();
  console.log(sups);
}
main().finally(() => prisma.$disconnect());
