import prisma from '../utils/prisma';

export class StoreRoutingService {
  /**
   * Evaluates a product against all registered Storefront routing rules and auto-assigns it to Store A, Store B, or All Stores
   */
  static async evaluateAndRouteProduct(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, brand: true },
    });

    if (!product) return [];

    const stores = await prisma.store.findMany();
    const assignedStores = [];

    for (const store of stores) {
      const rule = store.autoRoutingRule || 'ALL';
      let matches = false;

      if (rule === 'ALL') {
        matches = true;
      } else if (rule === 'MEDICAL_ONLY') {
        const catName = (product.category?.name || '').toLowerCase();
        matches = catName.includes('medical') || catName.includes('health') || catName.includes('pharma');
      } else if (rule === 'RETAIL_ONLY') {
        const catName = (product.category?.name || '').toLowerCase();
        matches = !catName.includes('medical');
      } else {
        matches = true;
      }

      if (matches) {
        await prisma.productStoreMapping.upsert({
          where: {
            productId_storeId: {
              productId: product.id,
              storeId: store.id,
            },
          },
          update: {
            syncStatus: 'pending_push',
          },
          create: {
            productId: product.id,
            storeId: store.id,
            syncStatus: 'pending_push',
          },
        });
        assignedStores.push(store.name);
      }
    }

    return assignedStores;
  }
}
