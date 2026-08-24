const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMedia() {
  const images = await prisma.productImage.findMany({
    include: { product: true }
  });
  
  let added = 0;
  for (const img of images) {
    const existing = await prisma.media.findFirst({ where: { url: img.url } });
    if (!existing) {
      await prisma.media.create({
        data: {
          url: img.url,
          filename: `${img.product.sku}-feed-image.jpg`,
          folder: img.product.sku,
          type: 'image/jpeg',
          size: 1024
        }
      });
      added++;
    }
  }
  console.log(`Added ${added} existing product images to Media library.`);
}

fixMedia().catch(console.error).finally(() => prisma.$disconnect());
