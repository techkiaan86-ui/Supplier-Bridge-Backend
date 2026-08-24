const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const catMappings = await prisma.categoryMapping.findMany();
  const brandMappings = await prisma.brandMapping.findMany();
  console.log('Category Mappings:', catMappings);
  console.log('Brand Mappings:', brandMappings);
}
main().finally(() => prisma.$disconnect());
