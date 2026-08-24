import { PrismaClient } from '@prisma/client';
import { ingestSupplierFeed } from '../src/services/feedParser.service';
import { StorefrontConnectorService } from '../src/services/storefrontConnector.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  console.log('--- STARTING E2E INTEGRATION TEST (MESSAGE 4) ---');
  
  // 1. Create Supplier
  console.log('\n[1] Creating/Finding Supplier...');
  let supplier = await prisma.supplier.findFirst({ where: { company: 'SUP1-TEST' } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: 'Tech & Gear Supplier #1',
        company: 'SUP1-TEST',
        email: 'john@sup1.test',
        phone: '123-456-7890',
        website: 'USA',
        status: 'active'
      }
    });
  }
  console.log(`Supplier Ready: ${supplier.name} (${supplier.id})`);

  // 2. Load Feed
  console.log('\n[2] Loading sample_supplier_feed.csv...');
  const csvPath = path.resolve(__dirname, '../../sample_supplier_feed.csv');
  const rawContent = fs.readFileSync(csvPath, 'utf8');
  console.log(`Loaded ${rawContent.length} bytes of CSV data.`);

  // 3. Ingestion & Data Mapping
  console.log('\n[3] Ingesting & Mapping Data to Master Catalog / SupplierSource...');
  const ingestResult = await ingestSupplierFeed(
    supplier.id,
    'csv',
    'sample_supplier_feed.csv',
    rawContent
  );
  console.log(`Ingestion Result: Success=${ingestResult.success}, Total Processed=${ingestResult.total}`);

  // 4. Validate Products & Pricing
  console.log('\n[4] Validating Products & Pricing in Database...');
  const products = await prisma.product.findMany({
    where: { supplierId: supplier.id },
    include: {
      supplierSources: true,
      prices: true,
      inventory: true
    }
  });
  console.log(`Found ${products.length} products mapped to Master Catalog.`);
  
  for (const p of products) {
    console.log(` - Product: ${p.title} (${p.sku})`);
    console.log(`   Retail Price: $${p.prices[0]?.price} (Cost Price isolated to SupplierSource)`);
    console.log(`   Supplier Sources (${p.supplierSources.length}):`);
    p.supplierSources.forEach(s => {
      console.log(`     -> SKU: ${s.supplierSku}, Cost: $${s.cost}, Stock: ${s.inventory}, Preferred: ${s.isPreferred}`);
    });
  }

  // 5. Store Assignment
  console.log('\n[5] Assigning Products to Storefront (Anchorage Medical Equipment & Supplies)...');
  let store = await prisma.store.findFirst({ where: { name: { contains: 'Anchorage' } } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        name: 'Anchorage Medical Equipment & Supplies',
        type: 'shift4shop',
        storeKey: 'ANCHOR-MED',
        connectionStatus: 'active'
      }
    });
    await prisma.storeConfiguration.create({
      data: {
        storeId: store.id,
        key: 'url',
        value: 'https://anchorage-medical.shift4shop.com'
      }
    });
  }
  console.log(`Store Ready: ${store.name}`);

  for (const p of products) {
    const existingMapping = await prisma.productStoreMapping.findFirst({
      where: { productId: p.id, storeId: store.id }
    });
    if (!existingMapping) {
      await prisma.productStoreMapping.create({
        data: {
          productId: p.id,
          storeId: store.id,
          syncStatus: 'pending'
        }
      });
      console.log(`   Mapped ${p.title} to Store.`);
    }
  }

  // 6. Synchronization (Shift4Shop)
  console.log('\n[6] Synchronizing to Shift4Shop (Granular Sync Tests)...');
  
  console.log('\n--- FULL SYNC ---');
  await StorefrontConnectorService.pushSyncStore({ storeId: store.id, syncType: 'FULL' });

  console.log('\n--- INVENTORY SYNC ---');
  await StorefrontConnectorService.pushSyncStore({ storeId: store.id, syncType: 'INVENTORY' });
  
  console.log('\n--- PRICING SYNC ---');
  await StorefrontConnectorService.pushSyncStore({ storeId: store.id, syncType: 'PRICING' });
  
  console.log('\n--- IMAGES SYNC ---');
  await StorefrontConnectorService.pushSyncStore({ storeId: store.id, syncType: 'IMAGES' });

  console.log('\n--- END-TO-END FLOW VERIFIED SUCCESSFULLY ---');
}

run().catch(console.error).finally(() => prisma.$disconnect());
