import { PrismaClient } from '@prisma/client';
import { runProductValidation } from '../utils/validationEngine';
import { StoreRoutingService } from './storeRouting.service';

const prisma = new PrismaClient();

interface ParsedProductRow {
  sku: string;
  title: string;
  price?: number;
  cost?: number;
  stock?: number;
  category?: string;
  brand?: string;
  imageUrl?: string;
  description?: string;
  color?: string;
  size?: string;
  weight?: number;
  manufacturer?: string;
  attributes?: Record<string, string>;
}

/**
 * Parses raw CSV content text into structured product objects
 */
export function parseCSVFeed(csvText: string, fieldMapping?: Record<string, string>): ParsedProductRow[] {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Parse header line if present
  const headerLine = lines[0].toLowerCase();
  const hasHeader = headerLine.includes('sku') || headerLine.includes('title') || headerLine.includes('name') || headerLine.includes('price');

  const headers = hasHeader
    ? lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
    : ['sku', 'title', 'price', 'stock', 'category', 'brand', 'imageurl'];

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const products: ParsedProductRow[] = [];

  for (const line of dataLines) {
    // Handle quoted fields properly (split by comma outside quotes)
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cols.length === 0) continue;

    const rowData: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowData[h] = cols[idx] || '';
    });

    // Helper to find the first matching key in rowData based on substrings
    const findValue = (possibleKeys: string[], fallbackCol: string) => {
      for (const pk of possibleKeys) {
        for (const actualKey of Object.keys(rowData)) {
          if (actualKey.includes(pk)) return rowData[actualKey];
        }
      }
      return fallbackCol;
    };

    const getMappedValue = (internalKey: string, possibleKeys: string[], fallbackCol: string) => {
      // If a dynamic field mapping is provided and has a specific header configured for this field
      if (fieldMapping && fieldMapping[internalKey]) {
        const mappedHeader = fieldMapping[internalKey].toLowerCase();
        // Exact match or contains check for the mapped header
        for (const actualKey of Object.keys(rowData)) {
          if (actualKey.includes(mappedHeader) || mappedHeader.includes(actualKey)) {
             return rowData[actualKey];
          }
        }
      }
      // Fallback to fuzzy logic
      return findValue(possibleKeys, fallbackCol);
    };

    const sku = getMappedValue('sku', ['sku', 'code', 'partnumber'], cols[0]) || `SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const title = getMappedValue('title', ['title', 'name', 'product', 'description'], cols[1]) || `Product ${sku}`;
    const price = parseFloat(getMappedValue('price', ['retail', 'msrp', 'price'], cols[2]) || '0') || 0;
    const cost = parseFloat(getMappedValue('cost', ['cost', 'wholesale'], cols[3]) || '0') || (price > 0 ? price * 0.7 : 0);
    
    // Parse stock carefully avoiding NaN
    const rawStock = getMappedValue('stock', ['stock', 'qty', 'quantity'], cols[4]);
    let stock = parseInt(rawStock, 10);
    if (isNaN(stock)) stock = 0;

    const category = getMappedValue('category', ['category', 'cat', 'department'], cols[5]) || 'General';
    const brand = getMappedValue('brand', ['brand', 'vendor'], cols[6]) || 'Generic';
    const imageUrl = getMappedValue('imageUrl', ['image', 'photo', 'picture'], cols[7]) || undefined;

    // Extra fields extraction
    const description = getMappedValue('description', ['desc', 'detail', 'summary'], '');
    const color = getMappedValue('color', ['color', 'colour'], '');
    const size = getMappedValue('size', ['size', 'dimension'], '');
    const weightRaw = getMappedValue('weight', ['weight', 'wt'], '');
    const weight = parseFloat(weightRaw) || undefined;
    const manufacturer = getMappedValue('manufacturer', ['manufacturer', 'maker', 'factory'], '');

    const knownKeys = ['sku', 'code', 'partnumber', 'title', 'name', 'product', 'description', 'retail', 'msrp', 'price', 'cost', 'wholesale', 'stock', 'qty', 'quantity', 'category', 'cat', 'department', 'brand', 'vendor', 'image', 'photo', 'picture', 'desc', 'detail', 'summary', 'color', 'colour', 'size', 'dimension', 'weight', 'wt', 'manufacturer', 'maker', 'factory'];
    
    // Check field mappings values as known keys
    if (fieldMapping) {
      Object.values(fieldMapping).forEach(v => knownKeys.push(v.toLowerCase()));
    }

    const attributes: Record<string, string> = {};
    for (const key of Object.keys(rowData)) {
      const lowerKey = key.toLowerCase();
      if (!knownKeys.some(k => lowerKey.includes(k) || k.includes(lowerKey))) {
        if (rowData[key] && rowData[key].trim() !== '') {
          attributes[key] = rowData[key].trim();
        }
      }
    }

    products.push({
      sku: sku.trim(),
      title: title.trim(),
      price,
      cost,
      stock,
      category: category.trim(),
      brand: brand.trim(),
      imageUrl: imageUrl?.trim(),
      description: description?.trim() || undefined,
      color: color?.trim() || undefined,
      size: size?.trim() || undefined,
      weight,
      manufacturer: manufacturer?.trim() || undefined,
      attributes,
    });

    if (products.length === 1) {
      console.log('DEBUG PARSER - HEADERS:', headers);
      console.log('DEBUG PARSER - ROWDATA:', rowData);
    }
  }

  return products;
}

/**
 * Parses raw XML content text into structured product objects
 */
export function parseXMLFeed(xmlText: string, fieldMapping?: Record<string, string>): ParsedProductRow[] {
  const products: ParsedProductRow[] = [];
  
  // Extract item/product blocks using regex
  const itemMatches = xmlText.match(/<(?:item|product|row|entry)[\s\S]*?<\/(?:item|product|row|entry)>/gi) || [];

  for (const block of itemMatches) {
    const extractTag = (tagNames: string[]) => {
      for (const tag of tagNames) {
        const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
        if (match && match[1]) return match[1].trim();
      }
      return '';
    };

    const getMappedTag = (internalKey: string, fallbackTags: string[]) => {
      if (fieldMapping && fieldMapping[internalKey]) {
        const mappedTag = fieldMapping[internalKey];
        const match = block.match(new RegExp(`<${mappedTag}[^>]*>([\\s\\S]*?)<\\/${mappedTag}>`, 'i'));
        if (match && match[1]) return match[1].trim();
      }
      return extractTag(fallbackTags);
    };

    const sku = getMappedTag('sku', ['sku', 'code', 'id', 'partnumber']) || `XML-SKU-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const title = getMappedTag('title', ['title', 'name', 'product']) || `XML Product ${sku}`;
    const description = getMappedTag('description', ['description', 'desc', 'summary', 'detail']);
    const priceStr = getMappedTag('price', ['price', 'retail_price', 'msrp']);
    const costStr = getMappedTag('cost', ['cost', 'wholesale_price']);
    const stockStr = getMappedTag('stock', ['stock', 'quantity', 'qty']);
    const category = getMappedTag('category', ['category', 'cat', 'type']) || 'General';
    const brand = getMappedTag('brand', ['brand', 'manufacturer']) || 'Generic';
    const imageUrl = getMappedTag('imageUrl', ['image', 'image_url', 'photo', 'picture']);
    const color = getMappedTag('color', ['color', 'colour']);
    const size = getMappedTag('size', ['size', 'dimension']);
    const weightStr = getMappedTag('weight', ['weight', 'mass']);

    products.push({
      sku,
      title,
      description,
      price: parseFloat(priceStr) || 0,
      cost: parseFloat(costStr) || 0,
      stock: parseInt(stockStr, 10) || 10,
      category,
      brand,
      imageUrl: imageUrl || undefined,
      color: color || undefined,
      size: size || undefined,
      weight: parseFloat(weightStr) || undefined,
      manufacturer: brand, // Fallback for XML as usually brand=manufacturer there
    });
  }

  return products;
}

import * as xlsx from 'xlsx';

/**
 * Ingests a list of parsed products into the database under a specific supplier
 */
export async function ingestSupplierFeed(
  supplierId: string,
  connectionType: string,
  fileName: string,
  rawContent: string
): Promise<{ success: boolean; total: number; supplierName: string }> {
  const type = connectionType.toLowerCase();
  let parsedRows: ParsedProductRow[] = [];

  // Decode if base64 (which comes from frontend readAsDataURL)
  let actualContent = rawContent;
  
  console.log(`[INGEST] Type: ${type}, FileName: ${fileName}`);
  console.log(`[INGEST] Raw length: ${rawContent.length}, Starts with data:: ${rawContent.trim().substring(0, 50)}`);

  const isBase64 = rawContent.trim().startsWith('data:');
  if (isBase64) {
    const base64Data = rawContent.trim().split(',')[1] || rawContent.trim();
    if (type === 'excel' || fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) {
      console.log(`[INGEST] Processing as Excel base64...`);
      try {
        const workbook = xlsx.read(base64Data, { type: 'base64' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        actualContent = xlsx.utils.sheet_to_csv(worksheet);
        console.log(`[INGEST] Successfully converted Excel to CSV, length: ${actualContent.length}`);
      } catch (err) {
        console.error(`[INGEST] Failed to parse Excel base64:`, err);
      }
    } else {
      console.log(`[INGEST] Processing as generic base64...`);
      actualContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    }
  }

  const supplier = await prisma.supplier.findUnique({ 
    where: { id: supplierId },
    include: { connections: true }
  });
  const supplierName = supplier?.name || 'Supplier Feed';
  
  // Find field mapping from connection (if any)
  let fieldMapping: Record<string, string> | undefined = undefined;
  if (supplier && supplier.connections && supplier.connections.length > 0) {
    const conn = supplier.connections[0];
    if (conn.fieldMapping && typeof conn.fieldMapping === 'object') {
      fieldMapping = conn.fieldMapping as Record<string, string>;
    }
  }

  if (type === 'xml') {
    parsedRows = parseXMLFeed(actualContent, fieldMapping);
  } else {
    // CSV / Excel CSV text format
    parsedRows = parseCSVFeed(actualContent, fieldMapping);
  }

  const supplierPrefix = `${supplierName}::`;

  // --- MAPPING ENGINE: Pre-load active mappings for this supplier ---
  const catMappingsRaw = await prisma.categoryMapping.findMany({
    where: { storeValue: { startsWith: supplierPrefix }, status: 'mapped' },
    include: { category: true }
  });
  const brandMappingsRaw = await prisma.brandMapping.findMany({
    where: { storeValue: { startsWith: supplierPrefix }, status: 'mapped' },
    include: { brand: true }
  });
  const productMappingsRaw = await prisma.productMapping.findMany({
    where: { storeValue: { startsWith: supplierPrefix }, status: 'mapped' },
    include: { product: true }
  });
  
  const attributeMappingsRaw = await prisma.attributeMapping.findMany({
    where: { storeValue: { startsWith: supplierPrefix } },
    include: { attribute: true }
  });

  const masterAttributesRaw = await prisma.attribute.findMany();
  const masterAttributes = new Map<string, { id: string; name: string }>();
  masterAttributesRaw.forEach(a => {
    masterAttributes.set(a.name.toLowerCase(), { id: a.id, name: a.name });
  });

  const attrMap = new Map<string, { id?: string; name: string; status: string }>();
  attributeMappingsRaw.forEach(m => {
    if (m.attribute?.name) {
      attrMap.set(m.supplierValue.toLowerCase(), {
        id: m.attributeId,
        name: m.attribute.name,
        status: m.status
      });
    } else {
      attrMap.set(m.supplierValue.toLowerCase(), {
        status: m.status,
        name: m.supplierValue
      });
    }
  });

  const catMap = new Map<string, string>();
  catMappingsRaw.forEach(m => {
    if (m.category?.name) catMap.set(m.supplierValue.toLowerCase(), m.category.name);
  });

  const brandMap = new Map<string, string>();
  brandMappingsRaw.forEach(m => {
    if (m.brand?.name) brandMap.set(m.supplierValue.toLowerCase(), m.brand.name);
  });

  const skuMap = new Map<string, string>();
  productMappingsRaw.forEach(m => {
    if (m.product?.sku) skuMap.set(m.supplierValue.toLowerCase(), m.product.sku);
  });

  // Note: We now process all attributes dynamically in the loop
  const pricingRules = await prisma.pricingRule.findMany({
    where: { active: true },
    orderBy: { priority: 'asc' }
  });
  // ------------------------------------------------------------------

  let successCount = 0;
  const processedSkus = new Set<string>();

  for (const item of parsedRows) {
    try {
      const originalSupplierSku = item.sku || `SKU-${Date.now()}`;

      // Auto-Apply Mappings
      if (item.sku && skuMap.has(item.sku.toLowerCase())) {
        item.sku = skuMap.get(item.sku.toLowerCase())!;
      }
      if (item.category && catMap.has(item.category.toLowerCase())) {
        item.category = catMap.get(item.category.toLowerCase())!;
      }
      if (item.brand && brandMap.has(item.brand.toLowerCase())) {
        item.brand = brandMap.get(item.brand.toLowerCase())!;
      }
      // 0. Process dynamic attributes & auto-matching
      const finalAttributes: Record<string, string> = {};
      
      const allSupplierAttrs = { ...(item.attributes || {}) };
      if (item.color) allSupplierAttrs['color'] = item.color;
      if (item.size) allSupplierAttrs['size'] = item.size;

      for (const [attrName, attrValue] of Object.entries(allSupplierAttrs)) {
        if (!attrValue) continue;
        
        const lowerAttrName = attrName.toLowerCase();
        let mapping = attrMap.get(lowerAttrName);

        if (!mapping) {
          // Auto-match logic
          let matchedMasterId = '';
          let matchedMasterName = '';
          for (const [mName, mData] of masterAttributes.entries()) {
            if (mName === lowerAttrName || mName.includes(lowerAttrName) || lowerAttrName.includes(mName)) {
              matchedMasterId = mData.id;
              matchedMasterName = mData.name;
              break;
            }
          }

          if (matchedMasterId) {
            // Auto-matched successfully
            const newMapping = await prisma.attributeMapping.create({
              data: {
                supplierValue: attrName,
                attributeId: matchedMasterId,
                storeValue: `${supplierName}::${matchedMasterName}`,
                status: 'mapped',
              }
            });
            mapping = { id: matchedMasterId, name: matchedMasterName, status: 'mapped' };
            attrMap.set(lowerAttrName, mapping);
          } else {
            // Needs Review: Unmapped.
            // Create a dummy Master Attribute first (using current controller pattern)
            const fallbackAttr = await prisma.attribute.create({
              data: { name: attrName, type: 'text' }
            });
            masterAttributes.set(attrName.toLowerCase(), { id: fallbackAttr.id, name: attrName });
            
            await prisma.attributeMapping.create({
              data: {
                supplierValue: attrName,
                attributeId: fallbackAttr.id,
                storeValue: `${supplierName}::`,
                status: 'unmapped',
              }
            });
            mapping = { status: 'unmapped', name: attrName };
            attrMap.set(lowerAttrName, mapping);
          }
        }

        // Apply mapped value
        if (mapping && mapping.status === 'mapped' && mapping.name) {
          const masterNameLower = mapping.name.toLowerCase();
          if (masterNameLower === 'color') item.color = attrValue;
          else if (masterNameLower === 'size') item.size = attrValue;
          else finalAttributes[mapping.name] = attrValue;
        } else {
          // Unmapped attributes are ignored or stored generically
          finalAttributes[attrName] = attrValue;
        }
      }

      item.attributes = finalAttributes;
      
      processedSkus.add(item.sku);

      // 1. Category Hierarchy parsing
      let categoryId: string | undefined = undefined;
      if (item.category) {
        const parts = item.category.split(/\s*[>/]\s*/).filter((p: string) => p.trim() !== '');
        
        let currentParentId: string | null = null;
        let pathSlug = "";
        
        for (const part of parts) {
          const catName = part.trim();
          const partSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          pathSlug = pathSlug ? `${pathSlug}-${partSlug}` : partSlug;
          
          let cat = await prisma.category.findUnique({ where: { slug: pathSlug } });
          if (!cat) {
            cat = await prisma.category.create({ 
              data: { 
                name: catName, 
                slug: pathSlug,
                parentId: currentParentId
              } 
            });
          }
          currentParentId = cat.id;
        }
        categoryId = currentParentId || undefined;
      }

      // 2. Brand
      let brandId: string | undefined = undefined;
      if (item.brand) {
        let br = await prisma.brand.findUnique({ where: { name: item.brand } });
        if (!br) {
          br = await prisma.brand.create({ data: { name: item.brand } });
        }
        brandId = br.id;
      }

      // 2.5 Manufacturer
      let manufacturerId: string | undefined = undefined;
      if (item.manufacturer) {
        let mfg = await prisma.manufacturer.findUnique({ where: { company: item.manufacturer } });
        if (!mfg) {
          mfg = await prisma.manufacturer.create({ data: { company: item.manufacturer } });
        }
        manufacturerId = mfg.id;
      }

      // --- Pricing Engine Application ---
      let calculatedRetailPrice = item.price || 0;
      const supplierCost = item.cost || 0;
      
      if (supplierCost > 0) {
        const applicableRule = pricingRules.find(rule => {
          if (rule.targetSupplierId && rule.targetSupplierId !== supplierId) return false;
          if (rule.targetCategoryId && rule.targetCategoryId !== categoryId) return false;
          if (rule.targetBrandId && rule.targetBrandId !== brandId) return false;
          return true;
        });

        if (applicableRule) {
          if (applicableRule.type === 'markup_percentage') {
            calculatedRetailPrice = supplierCost + (supplierCost * (applicableRule.value / 100));
          } else if (applicableRule.type === 'fixed_margin') {
            calculatedRetailPrice = supplierCost + applicableRule.value;
          } else if (applicableRule.type === 'fixed_price') {
            calculatedRetailPrice = applicableRule.value;
          }
          calculatedRetailPrice = Math.round(calculatedRetailPrice * 100) / 100;
        }
      }

      // 3. Upsert Product (Group by Title to support variants)
      let product = await prisma.product.findFirst({
        where: { title: item.title, supplierId }
      });

      if (!product) {
        // If product doesn't exist, try finding by SKU (in case it was renamed)
        product = await prisma.product.findUnique({ where: { sku: item.sku } });
      }

      if (product) {
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            description: item.description || product.description,
            weight: item.weight || product.weight,
            categoryId: categoryId || product.categoryId,
            brandId: brandId || product.brandId,
            manufacturerId: manufacturerId || product.manufacturerId,
          },
        });
      } else {
        product = await prisma.product.create({
          data: {
            sku: item.sku, // Base product gets the first variant's SKU
            title: item.title,
            description: item.description,
            weight: item.weight,
            supplierId,
            categoryId,
            brandId,
            manufacturerId,
            status: 'draft',
          },
        });
      }

      // 3.5 Persist Product Mapping
      const storeVal = `${supplierPrefix}::${product.sku}`;
      const existingMapping = await prisma.productMapping.findFirst({
        where: { supplierValue: originalSupplierSku }
      });
      if (existingMapping) {
        if (existingMapping.productId !== product.id || existingMapping.storeValue !== storeVal) {
          await prisma.productMapping.update({
            where: { id: existingMapping.id },
            data: { productId: product.id, storeValue: storeVal, status: 'mapped' }
          });
        }
      } else {
        await prisma.productMapping.create({
          data: {
            productId: product.id,
            supplierValue: originalSupplierSku,
            storeValue: storeVal,
            status: 'mapped'
          }
        });
      }

      // 4. Upsert Variant
      let variantSku = String(item.sku || `SKU-${Date.now()}`);
      const colorStr = item.color ? String(item.color) : '';
      const sizeStr = item.size ? String(item.size) : '';

      if (colorStr && !variantSku.toLowerCase().includes(colorStr.toLowerCase())) {
        variantSku += `-${colorStr.replace(/\s+/g, '')}`;
      }
      if (sizeStr && !variantSku.toLowerCase().includes(sizeStr.toLowerCase())) {
        variantSku += `-${sizeStr.replace(/\s+/g, '')}`;
      }
      
      const dynamicOptionsStr = item.attributes ? JSON.stringify(item.attributes) : undefined;
      
      const variant = await prisma.variant.upsert({
        where: { sku: variantSku },
        update: {
          color: item.color,
          size: item.size,
          dynamicOptions: dynamicOptionsStr,
        },
        create: {
          sku: variantSku,
          productId: product.id,
          color: item.color,
          size: item.size,
          dynamicOptions: dynamicOptionsStr,
        }
      });

      // 5. Product Price (Link to Variant if color/size exist, else Product)
      const existingPrice = await prisma.productPrice.findFirst({ where: { variantId: variant.id } });
      if (existingPrice) {
        await prisma.productPrice.update({
          where: { id: existingPrice.id },
          data: { price: calculatedRetailPrice || existingPrice.price },
        });
      } else {
        await prisma.productPrice.create({
          data: { productId: product.id, variantId: variant.id, price: calculatedRetailPrice, cost: 0, currency: 'USD' },
        });
      }

      // 5.5 Supplier Source
      const existingSource = await prisma.supplierSource.findFirst({
        where: { productId: product.id, supplierId }
      });
      if (existingSource) {
        await prisma.supplierSource.update({
          where: { id: existingSource.id },
          data: {
            supplierSku: variantSku,
            cost: item.cost || existingSource.cost,
            inventory: item.stock || 0
          }
        });
      } else {
        const preferredCount = await prisma.supplierSource.count({ where: { productId: product.id } });
        await prisma.supplierSource.create({
          data: {
            productId: product.id,
            supplierId,
            supplierSku: variantSku,
            cost: item.cost || 0,
            inventory: item.stock || 0,
            uom: 'Each',
            minOrderQty: 1,
            isPreferred: preferredCount === 0
          }
        });
      }

      // 6. Product Inventory (Link to Variant)
      const existingInv = await prisma.inventory.findFirst({ where: { variantId: variant.id } });
      if (existingInv) {
        await prisma.inventory.update({
          where: { id: existingInv.id },
          data: { quantity: item.stock || 0, status: (item.stock || 0) > 0 ? 'in_stock' : 'out_of_stock' },
        });
      } else {
        await prisma.inventory.create({
          data: { productId: product.id, variantId: variant.id, quantity: item.stock || 0, status: (item.stock || 0) > 0 ? 'in_stock' : 'out_of_stock' },
        });
      }

      // 6. Product Image
      if (item.imageUrl) {
        const existingImg = await prisma.productImage.findFirst({ where: { productId: product.id } });
        if (!existingImg) {
          await prisma.productImage.create({
            data: { productId: product.id, url: item.imageUrl, isFeatured: true, order: 0 },
          });
        }
        
        // Add to central Media library if not exists
        const existingMedia = await prisma.media.findFirst({ where: { url: item.imageUrl } });
        if (!existingMedia) {
          await prisma.media.create({
            data: {
              url: item.imageUrl,
              filename: `${item.sku}-feed-image.jpg`,
              folder: item.sku,
              type: 'image/jpeg',
              size: 1024
            }
          });
        }
      }

      // 7. Run Validation check
      const isValid = await runProductValidation(product.id, prisma);
      
      // Update product status based on validation
      await prisma.product.update({
        where: { id: product.id },
        data: { status: isValid ? 'published' : 'needs_review' }
      });

      // 7.5 Run Store Routing mapping ONLY if valid
      if (isValid) {
        await StoreRoutingService.evaluateAndRouteProduct(product.id);
      } else {
        console.warn(`[IngestionEngine] SKU ${item.sku} failed validation. Kept in 'needs_review' and skipped routing.`);
      }
      
      successCount++;
    } catch (err) {
      console.error(`[IngestionEngine] Error importing SKU ${item.sku}:`, err);
    }
  }
  
  // 8. Discontinued Products Detection (if this is a full sync, mark non-processed as archived)
  // We assume here that if it's not a single product incremental update, any product not in the feed is discontinued.
  // In a real scenario, this would be a parameter (isFullSync). 
  // Let's implement this generically: if parsing > 10 items, it's likely a full feed.
  if (parsedRows.length > 10) {
    const allSupplierProducts = await prisma.product.findMany({
      where: { supplierId },
      select: { id: true, sku: true }
    });
    
    for (const prod of allSupplierProducts) {
      if (!processedSkus.has(prod.sku)) {
         await prisma.product.update({
           where: { id: prod.id },
           data: { status: 'archived' }
         });
      }
    }
  }

  // Record Import Job history entry
  await prisma.importJob.create({
    data: {
      source: type.toUpperCase(),
      type: 'Products Feed',
      status: 'completed',
      recordsProcessed: successCount,
      recordsFailed: Math.max(0, parsedRows.length - successCount),
      logs: `Imported ${successCount} products from file ${fileName} for supplier ${supplierName}`,
    },
  });

  return {
    success: true,
    total: successCount,
    supplierName,
  };
}
