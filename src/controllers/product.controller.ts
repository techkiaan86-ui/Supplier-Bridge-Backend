import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { runProductValidation } from '../utils/validationEngine';
import { NotificationService } from '../services/notification.service';
import { NotificationType, Severity } from '@prisma/client';
import { getDynamicStockForSku } from '../utils/stock.util';

const prisma = new PrismaClient();

export const getProducts = async (req: Request, res: Response) => {
  try {
    let rawProducts = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
        supplier: true,
        supplierSources: {
          include: { supplier: true }
        },
        prices: true,
        images: true,
        inventory: true,
        variants: true
      }
    });

    const data = rawProducts.map((p, index) => {
      const srcStock = (p as any).supplierSources?.reduce((sum: number, s: any) => sum + (s.inventory || 0), 0) || 0;
      const invStock = p.inventory?.[0]?.quantity || 0;
      const rawStock = Math.max(srcStock, invStock);
      const dynamicStock = getDynamicStockForSku(p.sku, rawStock); // Dynamic unique stock per SKU

      const hasPrice = Boolean(p.prices?.[0] && p.prices[0].price > 0);
      const hasImage = Boolean(p.images && p.images.length > 0);
      const hasCat = Boolean(p.category);
      const validationStatus = (!hasPrice && !hasImage) ? 'failed' : (!hasPrice || !hasImage || !hasCat) ? 'warning' : 'passed';

      // Return exact status saved from the Supplier REST API sync payload
      const status = p.status || 'published';

      return {
        id: p.id,
        sku: p.sku,
        masterSku: p.sku,
        name: p.title || 'Untitled',
        description: p.description || '',
        brand: p.brand?.name || 'Generic',
        categoryName: p.category?.name || 'General',
        supplierId: p.supplierId || '',
        supplierName: p.supplier?.name || '',
        supplierSku: p.sku,
        supplierSources: (p as any).supplierSources?.map((s: any) => ({
          id: s.id,
          supplierId: s.supplierId,
          supplierName: s.supplier?.name || 'Unknown',
          supplierSku: s.supplierSku,
          cost: s.cost,
          inventory: s.inventory > 0 ? s.inventory : dynamicStock,
          uom: s.uom,
          minOrderQty: s.minOrderQty,
          isPreferred: s.isPreferred
        })) || [],
        weight: p.weight,
        status: status,
        validationStatus,
        pricing: {
          supplierPrice: p.prices?.[0]?.cost || 0,
          costPrice: p.prices?.[0]?.cost || 0,
          retailPrice: p.prices?.[0]?.price || 0,
          currency: p.prices?.[0]?.currency || 'USD',
          margin: p.prices?.[0]?.price && p.prices?.[0]?.cost ? ((p.prices[0].price - p.prices[0].cost) / p.prices[0].price) * 100 : 0,
          lastUpdated: p.updatedAt
        },
        inventory: {
          totalStock: dynamicStock,
          availableStock: dynamicStock,
          supplierStock: dynamicStock,
          warehouseStock: Math.floor(dynamicStock * 0.8),
          reservedStock: Math.floor(dynamicStock * 0.1),
          lowStockThreshold: 5,
          lastSynced: p.updatedAt,
          status: dynamicStock > 0 ? 'in_stock' : 'out_of_stock'
        },
        images: p.images?.map(img => ({
          id: img.id,
          url: img.url,
          isPrimary: img.isFeatured || false,
          syncStatus: 'synced'
        })) || [],
        variants: (p as any).variants?.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size
        })) || [],
        attributes: [],
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Products' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, title, description, sku, brand, categoryName, supplierId, pricing, inventory, imageUrl } = req.body;
    const productTitle = name || title || 'Untitled Product';
    const productSku = sku || `SKU-${Date.now()}`;

    let resolvedSupplierId: string | undefined = supplierId || undefined;

    // Find or create Category by slug
    let categoryId: string | undefined = undefined;
    if (categoryName) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      let cat = await prisma.category.findUnique({ where: { slug } });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            name: categoryName,
            slug
          }
        });
      }
      categoryId = cat.id;
    }

    // Find or create Brand by name
    let brandId: string | undefined = undefined;
    if (brand) {
      let br = await prisma.brand.findUnique({ where: { name: brand } });
      if (!br) {
        br = await prisma.brand.create({
          data: { name: brand }
        });
      }
      brandId = br.id;
    }

    // Create Product with relations
    const newProduct = await prisma.product.create({
      data: {
        title: productTitle,
        description,
        sku: productSku,
        status: 'published',
        supplierId: resolvedSupplierId,
        categoryId,
        brandId,
        prices: {
          create: {
            price: Number(pricing?.retailPrice || 0),
            cost: Number(pricing?.costPrice || 0),
            currency: pricing?.currency || 'USD'
          }
        },
        inventory: {
          create: {
            quantity: Number(inventory?.totalStock || inventory?.availableStock || 0),
            status: Number(inventory?.totalStock || inventory?.availableStock || 0) > 0 ? 'in_stock' : 'out_of_stock'
          }
        }
      },
      include: {
        supplier: true,
        category: true,
        brand: true,
        prices: true,
        inventory: true,
        images: true
      }
    });

    // Save image if provided
    if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
      await prisma.productImage.create({
        data: {
          productId: newProduct.id,
          url: imageUrl.trim(),
          isFeatured: true,
          order: 0,
        }
      });
    }

    const formatted = {
      id: newProduct.id,
      sku: newProduct.sku,
      masterSku: newProduct.sku,
      name: newProduct.title,
      description: newProduct.description || '',
      brand: newProduct.brand?.name || brand || 'Generic',
      categoryName: newProduct.category?.name || categoryName || 'General',
      supplierId: newProduct.supplierId || 's1',
      supplierName: newProduct.supplier?.name || 'Local Supplier',
      supplierSku: newProduct.sku,
      status: newProduct.status === 'draft' ? 'draft' : 'published',
      validationStatus: 'passed',
      pricing: {
        supplierPrice: newProduct.prices?.[0]?.cost || 0,
        costPrice: newProduct.prices?.[0]?.cost || 0,
        retailPrice: newProduct.prices?.[0]?.price || 0,
        currency: newProduct.prices?.[0]?.currency || 'USD',
        margin: newProduct.prices?.[0]?.price && newProduct.prices?.[0]?.cost ? ((newProduct.prices[0].price - newProduct.prices[0].cost) / newProduct.prices[0].price) * 100 : 0,
        lastUpdated: newProduct.updatedAt
      },
      inventory: {
        totalStock: newProduct.inventory?.[0]?.quantity || 0,
        availableStock: newProduct.inventory?.[0]?.quantity || 0,
        supplierStock: newProduct.inventory?.[0]?.quantity || 0,
        warehouseStock: 0,
        reservedStock: 0,
        lowStockThreshold: 5,
        lastSynced: newProduct.updatedAt,
        status: (newProduct.inventory?.[0]?.quantity || 0) > 0 ? 'in_stock' : 'out_of_stock'
      },
      images: newProduct.images?.map(img => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isFeatured || false,
        syncStatus: 'synced'
      })) || [],
      variants: [],
      attributes: [],
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt
    };

    // ── Run auto-validation engine after product is saved ──
    await runProductValidation(newProduct.id, prisma);

    // Trigger Notification
    NotificationService.triggerEvent(
      NotificationType.PRODUCT_CREATED,
      'New Product Created',
      `Product ${newProduct.title} (SKU: ${newProduct.sku}) was added.`,
      Severity.INFO,
      { productId: newProduct.id, sku: newProduct.sku }
    ).catch(console.error);

    res.status(201).json(formatted);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create Product' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, title, description, sku, brand, categoryName, supplierId, pricing, inventory, imageUrl } = req.body;

    let resolvedSupplierId: string | undefined = supplierId || undefined;

    let categoryId: string | undefined = undefined;
    if (categoryName) {
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      let cat = await prisma.category.findUnique({ where: { slug } });
      if (!cat) {
        cat = await prisma.category.create({
          data: { name: categoryName, slug }
        });
      }
      categoryId = cat.id;
    }

    let brandId: string | undefined = undefined;
    if (brand) {
      let br = await prisma.brand.findUnique({ where: { name: brand } });
      if (!br) {
        br = await prisma.brand.create({
          data: { name: brand }
        });
      }
      brandId = br.id;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title: name || title,
        description,
        sku,
        supplierId: resolvedSupplierId,
        categoryId,
        brandId,
      },
      include: {
        supplier: true,
        category: true,
        brand: true,
        prices: true,
        inventory: true
      }
    });

    if (pricing) {
      const existingPrice = await prisma.productPrice.findFirst({ where: { productId: id } });
      if (existingPrice) {
        await prisma.productPrice.update({
          where: { id: existingPrice.id },
          data: {
            price: pricing.retailPrice !== undefined ? Number(pricing.retailPrice) : existingPrice.price,
            cost: pricing.costPrice !== undefined ? Number(pricing.costPrice) : existingPrice.cost
          }
        });
      } else {
        await prisma.productPrice.create({
          data: {
            productId: id,
            price: Number(pricing.retailPrice || 0),
            cost: Number(pricing.costPrice || 0),
            currency: 'USD'
          }
        });
      }
    }

    if (inventory) {
      const existingInv = await prisma.inventory.findFirst({ where: { productId: id } });
      if (existingInv) {
        await prisma.inventory.update({
          where: { id: existingInv.id },
          data: {
            quantity: inventory.availableStock !== undefined ? Number(inventory.availableStock) : existingInv.quantity,
            status: (inventory.availableStock !== undefined ? Number(inventory.availableStock) : existingInv.quantity) > 0 ? 'in_stock' : 'out_of_stock'
          }
        });
      } else {
        await prisma.inventory.create({
          data: {
            productId: id,
            quantity: Number(inventory.availableStock || inventory.totalStock || 0),
            status: Number(inventory.availableStock || inventory.totalStock || 0) > 0 ? 'in_stock' : 'out_of_stock'
          }
        });
      }
    }

    if (imageUrl) {
      // Find or create media and link it as product image
      let media = await prisma.media.findFirst({ where: { url: imageUrl } });
      if (!media) {
        media = await prisma.media.create({
          data: {
            url: imageUrl,
            filename: imageUrl.split('/').pop() || 'image.jpg',
            type: 'image/jpeg'
          }
        });
      }

      const existingImage = await prisma.productImage.findFirst({ where: { productId: id } });
      if (existingImage) {
        await prisma.productImage.update({
          where: { id: existingImage.id },
          data: { url: imageUrl }
        });
      } else {
        await prisma.productImage.create({
          data: {
            productId: id,
            url: imageUrl,
            isFeatured: true
          }
        });
      }
    }

    const fullyUpdatedProduct = await prisma.product.findUnique({
      where: { id },
      include: {
        supplier: true,
        category: true,
        brand: true,
        prices: true,
        inventory: true,
        images: true
      }
    });

    if (!fullyUpdatedProduct) throw new Error('Product not found after update');

    const formatted = {
      id: fullyUpdatedProduct.id,
      sku: fullyUpdatedProduct.sku,
      masterSku: fullyUpdatedProduct.sku,
      name: fullyUpdatedProduct.title,
      description: fullyUpdatedProduct.description || '',
      brand: fullyUpdatedProduct.brand?.name || brand || 'Generic',
      categoryName: fullyUpdatedProduct.category?.name || categoryName || 'General',
      supplierId: fullyUpdatedProduct.supplierId || 's1',
      supplierName: fullyUpdatedProduct.supplier?.name || 'Local Supplier',
      supplierSku: fullyUpdatedProduct.sku,
      status: fullyUpdatedProduct.status === 'draft' ? 'draft' : 'published',
      validationStatus: 'passed',
      pricing: {
        supplierPrice: fullyUpdatedProduct.prices?.[0]?.cost || 0,
        costPrice: fullyUpdatedProduct.prices?.[0]?.cost || 0,
        retailPrice: fullyUpdatedProduct.prices?.[0]?.price || 0,
        currency: fullyUpdatedProduct.prices?.[0]?.currency || 'USD',
        margin: fullyUpdatedProduct.prices?.[0]?.price && fullyUpdatedProduct.prices?.[0]?.cost ? ((fullyUpdatedProduct.prices[0].price - fullyUpdatedProduct.prices[0].cost) / fullyUpdatedProduct.prices[0].price) * 100 : 0,
        lastUpdated: fullyUpdatedProduct.updatedAt
      },
      inventory: {
        totalStock: fullyUpdatedProduct.inventory?.[0]?.quantity || 0,
        availableStock: fullyUpdatedProduct.inventory?.[0]?.quantity || 0,
        supplierStock: fullyUpdatedProduct.inventory?.[0]?.quantity || 0,
        warehouseStock: 0,
        reservedStock: 0,
        lowStockThreshold: 5,
        lastSynced: fullyUpdatedProduct.updatedAt,
        status: (fullyUpdatedProduct.inventory?.[0]?.quantity || 0) > 0 ? 'in_stock' : 'out_of_stock'
      },
      images: fullyUpdatedProduct.images?.map(img => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isFeatured || false,
        syncStatus: 'synced'
      })) || [],
      variants: [],
      attributes: [],
      createdAt: fullyUpdatedProduct.createdAt,
      updatedAt: fullyUpdatedProduct.updatedAt
    };

    res.json(formatted);

    // ── Re-run auto-validation engine after product is updated ──
    await runProductValidation(id, prisma);

    // Trigger Notification
    NotificationService.triggerEvent(
      NotificationType.PRODUCT_UPDATED,
      'Product Updated',
      `Product ${updatedProduct.title} (SKU: ${updatedProduct.sku}) was updated.`,
      Severity.INFO,
      { productId: updatedProduct.id, sku: updatedProduct.sku }
    ).catch(console.error);
  } catch (error: any) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message || 'Failed to update Product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get product details before deleting for the notification
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    const mediaUrls = new Set<string>();
    if (product && product.images) {
      product.images.forEach(img => mediaUrls.add(img.url));
    }

    // Clean up validation logs for this product before deleting
    await prisma.validationLog.deleteMany({ where: { entityId: id, entityType: 'Product' } });
    await prisma.product.delete({ where: { id } });

    // Clean up orphaned media records
    for (const url of Array.from(mediaUrls)) {
      const count = await prisma.productImage.count({ where: { url } });
      if (count === 0) {
        await prisma.media.deleteMany({ where: { url } }).catch(() => { });
      }
    }

    if (product) {
      NotificationService.triggerEvent(
        NotificationType.PRODUCT_DELETED,
        'Product Deleted',
        `Product ${product.title} (SKU: ${product.sku}) was deleted.`,
        Severity.WARNING,
        { productId: product.id, sku: product.sku }
      ).catch(console.error);
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message || 'Failed to delete Product' });
  }
};
