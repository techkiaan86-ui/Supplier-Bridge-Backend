const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up database...');
  
  // Delete all suppliers, which will cascade delete products, inventory, prices, mappings, etc.
  const deletedSuppliers = await prisma.supplier.deleteMany({});
  console.log('Deleted suppliers:', deletedSuppliers.count);

  // Fallback: Delete any orphaned products just in case
  const deletedProducts = await prisma.product.deleteMany({});
  console.log('Deleted orphaned products:', deletedProducts.count);

  console.log('Cleanup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
