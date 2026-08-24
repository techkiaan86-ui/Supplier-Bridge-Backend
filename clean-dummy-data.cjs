const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDummyData() {
  console.log('Starting dummy data cleanup...');
  try {
    // Delete all products (this cascades to variants, inventory, prices, images)
    const productDeleteResult = await prisma.product.deleteMany({});
    console.log(`Deleted ${productDeleteResult.count} products.`);

    // Delete all suppliers
    const supplierDeleteResult = await prisma.supplier.deleteMany({});
    console.log(`Deleted ${supplierDeleteResult.count} suppliers.`);

    // Delete all brands
    const brandDeleteResult = await prisma.brand.deleteMany({});
    console.log(`Deleted ${brandDeleteResult.count} brands.`);

    // Delete all categories
    const categoryDeleteResult = await prisma.category.deleteMany({});
    console.log(`Deleted ${categoryDeleteResult.count} categories.`);

    // Delete all manufacturers
    const manufacturerDeleteResult = await prisma.manufacturer.deleteMany({});
    console.log(`Deleted ${manufacturerDeleteResult.count} manufacturers.`);

    console.log('Dummy data cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDummyData();
