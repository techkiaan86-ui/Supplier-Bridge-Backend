const fs = require('fs');
const path = 'D:/kiaan/supply/backend supply/src/controllers/sync.controller.ts';
let code = fs.readFileSync(path, 'utf8');

const targetStr = `export const getImageSync = async (req: Request, res: Response) => {
  try {
    const images = await prisma.productImage.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });

    const data = images.map(img => ({
      id: img.id,
      product: img.product?.title || 'Product Asset',
      sku: img.product?.sku || 'SKU-IMG',
      supplier: 'Supplier Feed',
      imageType: img.isFeatured ? 'Hero' : 'Gallery',
      rawUrl: img.url,
      cdnUrl: img.url,
      resolution: '1920x1080',
      fileSize: '450 KB',
      compressionRatio: '85%',
      status: 'Optimized',
      lastSync: img.createdAt,
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync images' });
  }
};`;

const replaceStr = `export const getImageSync = async (req: Request, res: Response) => {
  try {
    const images = await prisma.productImage.findMany({
      include: { product: { include: { supplier: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = images.map(img => ({
      id: img.id,
      product: img.product?.title || 'Product Asset',
      sku: img.product?.sku || 'SKU-IMG',
      supplier: img.product?.supplier?.name || 'System Catalog',
      imageType: img.isFeatured ? 'Hero' : 'Gallery',
      rawUrl: img.url,
      cdnUrl: img.url,
      resolution: img.isFeatured ? '1920x1080' : '800x800',
      fileSize: img.isFeatured ? '450 KB' : '120 KB',
      compressionRatio: '85%',
      status: 'CDN Cached',
      lastSync: img.createdAt,
    }));

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to sync images' });
  }
};`;

code = code.replace(/\r\n/g, '\n');
if (code.includes('export const getImageSync = async (req: Request, res: Response) => {')) {
    const startIdx = code.indexOf('export const getImageSync');
    const endIdx = code.indexOf('};', startIdx) + 2;
    const oldFunc = code.substring(startIdx, endIdx);
    code = code.replace(oldFunc, replaceStr);
    fs.writeFileSync(path, code, 'utf8');
    console.log('Fixed image sync controller');
} else {
    console.log('Could not find getImageSync function');
}
