import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. SUPPLIERS IN DATABASE ===');
  const suppliers = await prisma.supplier.findMany();
  console.log(JSON.stringify(suppliers, null, 2));

  console.log('\n=== 2. SUPPLIER SYNC LOGS ===');
  const syncLogs = await prisma.supplierSync.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(syncLogs, null, 2));

  console.log('\n=== 3. PRODUCTS CONNECTED TO SUPPLIER ===');
  const products = await prisma.product.findMany({
    include: {
      supplier: true,
      supplierSources: true,
      prices: true,
      inventory: true,
      category: true,
      brand: true,
      images: true,
    },
    take: 10
  });

  const formattedProducts = products.map(p => ({
    id: p.id,
    sku: p.sku,
    title: p.title,
    supplier: p.supplier?.name,
    category: p.category?.name,
    brand: p.brand?.name,
    price: p.prices?.[0]?.price,
    cost: p.prices?.[0]?.cost,
    stock: p.inventory?.[0]?.quantity,
    supplierSourceCount: p.supplierSources.length,
    supplierSourceDetails: p.supplierSources.map(s => ({
      cost: s.cost,
      inventory: s.inventory,
      uom: s.uom,
      isSpecialOrder: (s as any).isSpecialOrder,
      isDropshipped: (s as any).isDropshipped,
      webProductPage: (s as any).webProductPage
    })),
    status: p.status,
    images: p.images.map(img => img.url)
  }));
  console.log(JSON.stringify(formattedProducts, null, 2));

  console.log('\n=== 4. ORDERS & 5-SERVICE RECORDS ===');
  try {
    if ((prisma as any).orderEntry) {
      const orders = await (prisma as any).orderEntry.findMany({
        include: { orderStatuses: true, proofOfDeliveries: true }
      });
      console.log(JSON.stringify(orders, null, 2));
    }
  } catch (err: any) {
    console.log('Order table info:', err.message);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
