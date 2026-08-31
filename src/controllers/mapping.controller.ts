import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureProduct(masterSku: string, supplierSku: string) {
  const sku = masterSku || supplierSku || `SKU-${Date.now()}`;
  let p = await prisma.product.findUnique({ where: { sku } });
  if (!p) {
    p = await prisma.product.create({
      data: {
        sku,
        title: `Product ${sku}`,
      }
    });
  }
  return p.id;
}

async function ensureCategory(masterCategory: string, supplierCategory: string) {
  const name = masterCategory || supplierCategory || `Cat-${Date.now()}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let c = await prisma.category.findUnique({ where: { slug } });
  if (!c) {
    c = await prisma.category.create({
      data: {
        name,
        slug,
      }
    });
  }
  return c.id;
}

async function ensureBrand(masterBrand: string, supplierBrand: string) {
  const name = masterBrand || supplierBrand || `Brand-${Date.now()}`;
  let b = await prisma.brand.findUnique({ where: { name } });
  if (!b) {
    b = await prisma.brand.create({
      data: {
        name,
      }
    });
  }
  return b.id;
}

async function ensureVariant(masterVariant: string, supplierVariant: string) {
  const sku = `VAR-${Date.now()}`;
  const productId = await ensureProduct('GENERIC-PROD', 'GENERIC-PROD');
  let v = await prisma.variant.create({
    data: {
      productId,
      sku,
      color: masterVariant || supplierVariant,
    }
  });
  return v.id;
}

async function ensureAttribute(masterAttribute: string, supplierAttribute: string) {
  const name = masterAttribute || supplierAttribute || `Attr-${Date.now()}`;
  let a = await prisma.attribute.findFirst({ where: { name } });
  if (!a) {
    a = await prisma.attribute.create({
      data: {
        name,
        type: 'text',
      }
    });
  }
  return a.id;
}

// --- Product Mappings ---
export const getProductMappings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.productMapping.findMany({
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map(m => ({
      id: m.id,
      supplierSku: m.supplierValue,
      supplierName: m.storeValue?.split('::')[0] || 'Supplier',
      masterSku: m.product?.sku || m.storeValue?.split('::')[1] || '',
      status: (m.status === 'mapped' || m.product?.sku) ? 'mapped' : 'unmapped',
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Product Mappings' });
  }
};

export const createProductMapping = async (req: Request, res: Response) => {
  try {
    const { supplierSku, supplierName, masterSku, status } = req.body;
    const productId = await ensureProduct(masterSku, supplierSku);
    const storeVal = `${supplierName || 'Supplier'}::${masterSku || ''}`;
    const newMapping = await prisma.productMapping.create({
      data: {
        productId,
        supplierValue: supplierSku,
        storeValue: storeVal,
        status: masterSku ? 'mapped' : (status || 'unmapped'),
      },
      include: { product: true }
    });
    res.status(201).json({
      id: newMapping.id,
      supplierSku: newMapping.supplierValue,
      supplierName: supplierName || 'Supplier',
      masterSku: masterSku || '',
      status: masterSku ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    console.error('Error creating product mapping:', error);
    res.status(500).json({ error: error.message || 'Failed to create Product Mapping' });
  }
};

export const updateProductMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierSku, supplierName, masterSku } = req.body;
    const existing = await prisma.productMapping.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    let productId = existing.productId;
    if (masterSku) {
      productId = await ensureProduct(masterSku, existing.supplierValue);
    }
    const storeVal = `${supplierName || existing.storeValue?.split('::')[0] || 'Supplier'}::${masterSku || ''}`;

    const updated = await prisma.productMapping.update({
      where: { id },
      data: {
        productId,
        storeValue: storeVal,
        status: masterSku ? 'mapped' : 'unmapped',
      },
      include: { product: true }
    });

    res.json({
      id: updated.id,
      supplierSku: updated.supplierValue,
      supplierName: supplierName || updated.storeValue?.split('::')[0] || 'Supplier',
      masterSku: masterSku || updated.product?.sku || '',
      status: masterSku ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Product Mapping' });
  }
};

export const deleteProductMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productMapping.delete({ where: { id } });
    res.json({ message: 'Product Mapping deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Product Mapping' });
  }
};

// --- Category Mappings ---
export const getCategoryMappings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.categoryMapping.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map(m => ({
      id: m.id,
      supplierCategory: m.supplierValue,
      supplierName: m.storeValue?.split('::')[0] || 'Supplier',
      masterCategory: m.category?.name || m.storeValue?.split('::')[1] || '',
      status: (m.status === 'mapped' || m.category?.name) ? 'mapped' : 'unmapped',
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Category Mappings' });
  }
};

export const createCategoryMapping = async (req: Request, res: Response) => {
  try {
    const { supplierCategory, supplierName, masterCategory, status } = req.body;
    const categoryId = await ensureCategory(masterCategory, supplierCategory);
    const storeVal = `${supplierName || 'Supplier'}::${masterCategory || ''}`;
    const newMapping = await prisma.categoryMapping.create({
      data: {
        categoryId,
        supplierValue: supplierCategory,
        storeValue: storeVal,
        status: masterCategory ? 'mapped' : (status || 'unmapped'),
      },
      include: { category: true }
    });
    res.status(201).json({
      id: newMapping.id,
      supplierCategory: newMapping.supplierValue,
      supplierName: supplierName || 'Supplier',
      masterCategory: masterCategory || '',
      status: masterCategory ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    console.error('Error creating category mapping:', error);
    res.status(500).json({ error: error.message || 'Failed to create Category Mapping' });
  }
};

export const updateCategoryMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierCategory, supplierName, masterCategory } = req.body;
    const existing = await prisma.categoryMapping.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    let categoryId = existing.categoryId;
    if (masterCategory) {
      categoryId = await ensureCategory(masterCategory, existing.supplierValue);
    }
    const storeVal = `${supplierName || existing.storeValue?.split('::')[0] || 'Supplier'}::${masterCategory || ''}`;

    const updated = await prisma.categoryMapping.update({
      where: { id },
      data: {
        categoryId,
        storeValue: storeVal,
        status: masterCategory ? 'mapped' : 'unmapped',
      },
      include: { category: true }
    });

    res.json({
      id: updated.id,
      supplierCategory: updated.supplierValue,
      supplierName: supplierName || updated.storeValue?.split('::')[0] || 'Supplier',
      masterCategory: masterCategory || updated.category?.name || '',
      status: masterCategory ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Category Mapping' });
  }
};

export const deleteCategoryMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.categoryMapping.delete({ where: { id } });
    res.json({ message: 'Category Mapping deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Category Mapping' });
  }
};

// --- Brand Mappings ---
export const getBrandMappings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.brandMapping.findMany({
      include: { brand: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map(m => ({
      id: m.id,
      supplierBrand: m.supplierValue,
      supplierName: m.storeValue?.split('::')[0] || 'Supplier',
      masterBrand: m.brand?.name || m.storeValue?.split('::')[1] || '',
      status: (m.status === 'mapped' || m.brand?.name) ? 'mapped' : 'unmapped',
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Brand Mappings' });
  }
};

export const createBrandMapping = async (req: Request, res: Response) => {
  try {
    const { supplierBrand, supplierName, masterBrand, status } = req.body;
    const brandId = await ensureBrand(masterBrand, supplierBrand);
    const storeVal = `${supplierName || 'Supplier'}::${masterBrand || ''}`;
    const newMapping = await prisma.brandMapping.create({
      data: {
        brandId,
        supplierValue: supplierBrand,
        storeValue: storeVal,
        status: masterBrand ? 'mapped' : (status || 'unmapped'),
      },
      include: { brand: true }
    });
    res.status(201).json({
      id: newMapping.id,
      supplierBrand: newMapping.supplierValue,
      supplierName: supplierName || 'Supplier',
      masterBrand: masterBrand || '',
      status: masterBrand ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    console.error('Error creating brand mapping:', error);
    res.status(500).json({ error: error.message || 'Failed to create Brand Mapping' });
  }
};

export const updateBrandMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierBrand, supplierName, masterBrand } = req.body;
    const existing = await prisma.brandMapping.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    let brandId = existing.brandId;
    if (masterBrand) {
      brandId = await ensureBrand(masterBrand, existing.supplierValue);
    }
    const storeVal = `${supplierName || existing.storeValue?.split('::')[0] || 'Supplier'}::${masterBrand || ''}`;

    const updated = await prisma.brandMapping.update({
      where: { id },
      data: {
        brandId,
        storeValue: storeVal,
        status: masterBrand ? 'mapped' : 'unmapped',
      },
      include: { brand: true }
    });

    res.json({
      id: updated.id,
      supplierBrand: updated.supplierValue,
      supplierName: supplierName || updated.storeValue?.split('::')[0] || 'Supplier',
      masterBrand: masterBrand || updated.brand?.name || '',
      status: masterBrand ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Brand Mapping' });
  }
};

export const deleteBrandMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.brandMapping.delete({ where: { id } });
    res.json({ message: 'Brand Mapping deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Brand Mapping' });
  }
};

// --- Variant Mappings ---
export const getVariantMappings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.variantMapping.findMany({
      include: { variant: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map(m => ({
      id: m.id,
      supplierVariant: m.supplierValue,
      supplierName: m.storeValue?.split('::')[0] || 'Supplier',
      masterVariant: m.variant?.color || m.storeValue?.split('::')[1] || '',
      status: (m.status === 'mapped' || m.variant?.color) ? 'mapped' : 'unmapped',
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Variant Mappings' });
  }
};

export const createVariantMapping = async (req: Request, res: Response) => {
  try {
    const { supplierVariant, supplierName, masterVariant, status } = req.body;
    const variantId = await ensureVariant(masterVariant, supplierVariant);
    const storeVal = `${supplierName || 'Supplier'}::${masterVariant || ''}`;
    const newMapping = await prisma.variantMapping.create({
      data: {
        variantId,
        supplierValue: supplierVariant,
        storeValue: storeVal,
        status: masterVariant ? 'mapped' : (status || 'unmapped'),
      },
      include: { variant: true }
    });
    res.status(201).json({
      id: newMapping.id,
      supplierVariant: newMapping.supplierValue,
      supplierName: supplierName || 'Supplier',
      masterVariant: masterVariant || '',
      status: masterVariant ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Variant Mapping' });
  }
};

export const updateVariantMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierVariant, supplierName, masterVariant } = req.body;
    const existing = await prisma.variantMapping.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    let variantId = existing.variantId;
    if (masterVariant) {
      variantId = await ensureVariant(masterVariant, existing.supplierValue);
    }
    const storeVal = `${supplierName || existing.storeValue?.split('::')[0] || 'Supplier'}::${masterVariant || ''}`;

    const updated = await prisma.variantMapping.update({
      where: { id },
      data: {
        variantId,
        storeValue: storeVal,
        status: masterVariant ? 'mapped' : 'unmapped',
      },
      include: { variant: true }
    });

    res.json({
      id: updated.id,
      supplierVariant: updated.supplierValue,
      supplierName: supplierName || updated.storeValue?.split('::')[0] || 'Supplier',
      masterVariant: masterVariant || updated.variant?.color || '',
      status: masterVariant ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Variant Mapping' });
  }
};

export const deleteVariantMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.variantMapping.delete({ where: { id } });
    res.json({ message: 'Variant Mapping deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Variant Mapping' });
  }
};

// --- Attribute Mappings ---
export const getAttributeMappings = async (req: Request, res: Response) => {
  try {
    const list = await prisma.attributeMapping.findMany({
      include: { attribute: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = list.map(m => ({
      id: m.id,
      supplierAttribute: m.supplierValue,
      supplierName: m.storeValue?.split('::')[0] || 'Supplier',
      masterAttribute: m.attribute?.name || m.storeValue?.split('::')[1] || '',
      status: (m.status === 'mapped' || m.attribute?.name) ? 'mapped' : 'unmapped',
    }));
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Attribute Mappings' });
  }
};

export const createAttributeMapping = async (req: Request, res: Response) => {
  try {
    const { supplierAttribute, supplierName, masterAttribute, status } = req.body;
    const attributeId = await ensureAttribute(masterAttribute, supplierAttribute);
    const storeVal = `${supplierName || 'Supplier'}::${masterAttribute || ''}`;
    const newMapping = await prisma.attributeMapping.create({
      data: {
        attributeId,
        supplierValue: supplierAttribute,
        storeValue: storeVal,
        status: masterAttribute ? 'mapped' : (status || 'unmapped'),
      },
      include: { attribute: true }
    });
    res.status(201).json({
      id: newMapping.id,
      supplierAttribute: newMapping.supplierValue,
      supplierName: supplierName || 'Supplier',
      masterAttribute: masterAttribute || '',
      status: masterAttribute ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create Attribute Mapping' });
  }
};

export const updateAttributeMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierAttribute, supplierName, masterAttribute } = req.body;
    const existing = await prisma.attributeMapping.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Mapping not found' });

    let attributeId = existing.attributeId;
    if (masterAttribute) {
      attributeId = await ensureAttribute(masterAttribute, existing.supplierValue);
    }
    const storeVal = `${supplierName || existing.storeValue?.split('::')[0] || 'Supplier'}::${masterAttribute || ''}`;

    const updated = await prisma.attributeMapping.update({
      where: { id },
      data: {
        attributeId,
        storeValue: storeVal,
        status: masterAttribute ? 'mapped' : 'unmapped',
      },
      include: { attribute: true }
    });

    res.json({
      id: updated.id,
      supplierAttribute: updated.supplierValue,
      supplierName: supplierName || updated.storeValue?.split('::')[0] || 'Supplier',
      masterAttribute: masterAttribute || updated.attribute?.name || '',
      status: masterAttribute ? 'mapped' : 'unmapped',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Attribute Mapping' });
  }
};

export const deleteAttributeMapping = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.attributeMapping.delete({ where: { id } });
    res.json({ message: 'Attribute Mapping deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Attribute Mapping' });
  }
};
