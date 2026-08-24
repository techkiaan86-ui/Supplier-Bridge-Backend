const fs = require('fs');
const file = 'D:/kiaan/supply/backend supply/src/controllers/sync.controller.ts';
let content = fs.readFileSync(file, 'utf8');

const findStr = `    const inv = await prisma.inventory.findMany({
      include: { product: true, variant: true },
      orderBy: { updatedAt: 'desc' },
    });

    const data = inv.map(i => ({
      id: i.id,
      name: i.product?.title || 'Catalog Product',
      sku: i.product?.sku || i.variant?.sku || 'SKU-INV',
      supplier: 'Primary Supplier',
      supplierStock: i.quantity + 5,
      buffer: 5,
      storefrontStock: i.quantity,
      syncStatus: i.status === 'in_stock' ? 'Synced' : 'Out of Sync',`;

const replaceStr = `    const inv = await prisma.inventory.findMany({
      include: { product: { include: { supplier: true } }, variant: true },
      orderBy: { updatedAt: 'desc' },
    });

    const data = inv.map(i => ({
      id: i.id,
      name: i.product?.title || 'Catalog Product',
      sku: i.product?.sku || i.variant?.sku || 'SKU-INV',
      supplier: i.product?.supplier?.name || 'System Catalog',
      supplierStock: i.quantity,
      buffer: 5,
      storefrontStock: i.status === 'in_stock' ? Math.max(0, i.quantity - 5) : 0,
      syncStatus: i.status === 'in_stock' ? 'Synced' : 'Out of Sync',`;

const normalizedContent = content.replace(/\r\n/g, '\n');
if (normalizedContent.includes(findStr)) {
  const newContent = normalizedContent.replace(findStr, replaceStr);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully fixed sync.controller.ts');
} else {
  console.error('Could not find the target string!');
}
