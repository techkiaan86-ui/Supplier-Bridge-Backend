const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up categories and brands...');
  
  // Delete all categories and brands
  const deletedBrands = await prisma.brand.deleteMany({});
  console.log('Deleted brands:', deletedBrands.count);

  const deletedCategories = await prisma.category.deleteMany({});
  console.log('Deleted categories:', deletedCategories.count);

  console.log('Cleanup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
