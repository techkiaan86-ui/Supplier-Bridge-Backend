const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const brands = await prisma.brand.findMany();
  const zenlife = brands.find(b => b.name === 'ZenLife');
  if (zenlife) {
    console.log(`Deleting ${zenlife.name} with ID ${zenlife.id}...`);
    try {
      await prisma.brand.delete({ where: { id: zenlife.id } });
      console.log('Deleted successfully!');
    } catch (e) {
      console.error('Failed to delete:', e.message);
    }
  } else {
    console.log('ZenLife not found!');
  }
}

main().finally(() => prisma.$disconnect());
