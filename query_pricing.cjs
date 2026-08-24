const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const audits = await prisma.pricingAudit.findMany();
  console.log(audits);
}
main().finally(() => prisma.$disconnect());
