// @ts-nocheck
import { ingestSupplierFeed } from './services/feedParser.service';
import { PrismaClient } from '@prisma/client';
import { StorefrontConnectorService } from './services/storefrontConnector.service';

const prisma = new PrismaClient();

async function runTest() {
  console.log("Starting test-sync directly without Redis workers if possible...");
  
  let supplier = await prisma.supplier.findFirst();

  if (!supplier) {
    console.log("No supplier found. Creating a dummy supplier for testing.");
    supplier = await prisma.supplier.create({
      data: {
        name: "Test Supplier",
        code: "TEST-001",
        country: "US"
      }
    });
  }

  let store = await prisma.store.findFirst();
  if (!store) {
    console.log("No store found. Creating a dummy store.");
    store = await prisma.store.create({
      data: {
        name: "Test Store",
        platform: "shopify",
        storeKey: "test-store.myshopify.com",
        autoRoutingRule: "ALL",
        connectionStatus: "active"
      }
    });
  }

  console.log(`Triggering direct ingestSupplierFeed for supplier ${supplier.id}`);
  
  const dummyFeed = [
    { sku: "SKU-9999", title: "Test Product", category: "Test Category", brand: "Test Brand", price: 100, inventory: 50, description: "Hello world" }
  ];

  const activeStore = await prisma.store.findFirst();
  if (activeStore) {
    console.log(`Pushing to store ${activeStore.id}...`);
    try {
      const pushResult = await StorefrontConnectorService.pushSyncStore({ storeId: activeStore.id });
      console.log("Push Result:", pushResult);
    } catch (err) {
      console.log("Push Error expected due to missing credentials:", err.message);
    }
  }

  console.log("Exiting test script.");
  process.exit(0);
}

runTest();
