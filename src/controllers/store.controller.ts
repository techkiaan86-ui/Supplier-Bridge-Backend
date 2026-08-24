import { Request, Response } from 'express';
import { PrismaClient, NotificationType, Severity } from '@prisma/client';
import { NotificationService } from '../services/notification.service';
import { StorefrontConnectorService } from '../services/storefrontConnector.service';
import { encryptSecret } from '../utils/crypto';

const prisma = new PrismaClient();

function formatStore(s: any) {
  const urlConfig = s.configurations?.find((c: any) => c.key === 'url')?.value;
  const regionConfig = s.configurations?.find((c: any) => c.key === 'region')?.value || 'North America';
  return {
    id: s.id,
    name: s.name,
    type: s.type || 'Shopify',
    storeKey: s.storeKey || `store_${s.id?.substring(0, 6)}`,
    autoRoutingRule: s.autoRoutingRule || 'ALL',
    url: urlConfig || 'https://store.myshopify.com',
    region: regionConfig,
    status: s.connectionStatus || 'active',
    syncStatus: s.syncStatus || 'synced',
    productCount: s.productMappings?.length || 0,
    inventoryCron: s.inventoryCron || '*/15 * * * *',
    pricingCron: s.pricingCron || '0 * * * *',
    catalogCron: s.catalogCron || '0 2 * * *',
    lastSync: s.lastSync || s.createdAt,
    createdAt: s.createdAt,
  };
}

export const getStores = async (req: Request, res: Response) => {
  try {
    const rawStores = await (prisma.store as any).findMany({
      include: { configurations: true, credentials: true, productMappings: true },
      orderBy: { createdAt: 'desc' },
    });
    const data = rawStores.map(formatStore);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Stores' });
  }
};

export const getStoreById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const store = await (prisma.store as any).findUnique({
      where: { id },
      include: { configurations: true, credentials: true, productMappings: true },
    });
    if (!store) {
      return res.status(404).json({ error: 'Storefront not found' });
    }
    res.json(formatStore(store));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch Store details' });
  }
};

export const createStore = async (req: Request, res: Response) => {
  try {
    const { name, url, platform, storeKey, autoRoutingRule, region, apiKey, apiSecret, inventoryCron, pricingCron } = req.body;

    let key = storeKey ? storeKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_') : (name || 'store').toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Ensure unique storeKey
    const existingStore = await (prisma.store as any).findFirst({ where: { storeKey: key } });
    if (existingStore) {
      key = `${key}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const newStore: any = await (prisma.store as any).create({
      data: {
        name: name || 'New Storefront',
        type: platform || 'Shopify',
        storeKey: key,
        autoRoutingRule: autoRoutingRule || 'ALL',
        connectionStatus: 'active',
        syncStatus: 'synced',
        inventoryCron: inventoryCron || '*/15 * * * *',
        pricingCron: pricingCron || '0 * * * *',
        lastSync: new Date(),
        configurations: {
          create: [
            { key: 'url', value: url || 'https://store.myshopify.com' },
            { key: 'region', value: region || 'North America' },
          ],
        },
        credentials: {
          create: {
            apiKey: apiKey || 'sb_store_key_live',
            secret: apiSecret || '',
            encryptedApiKey: apiKey ? encryptSecret(apiKey) : undefined,
            encryptedSecret: apiSecret ? encryptSecret(apiSecret) : undefined,
            storeUrl: url || 'https://store.myshopify.com',
          },
        },
      },
      include: { configurations: true, credentials: true },
    });

    NotificationService.triggerEvent(
      NotificationType.STORE_CONNECTED,
      'Storefront Onboarded',
      `Zero-Code Storefront ${newStore.name} (Key: ${newStore.storeKey}) connected successfully!`,
      Severity.INFO,
      { storeId: newStore.id }
    );

    res.status(201).json(formatStore(newStore));
  } catch (error: any) {
    console.error('Error creating store:', error);
    res.status(400).json({ error: error.message || 'Failed to create Storefront' });
  }
};

export const updateStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, platform, storeKey, autoRoutingRule, inventoryCron, pricingCron, productsCron, imagesCron, categoriesCron, variantsCron, statusCron } = req.body;

    await (prisma.store as any).update({
      where: { id },
      data: {
        name: name || undefined,
        type: platform || undefined,
        storeKey: storeKey || undefined,
        autoRoutingRule: autoRoutingRule || undefined,
        inventoryCron: inventoryCron || undefined,
        pricingCron: pricingCron || undefined,
        productsCron: productsCron || undefined,
        imagesCron: imagesCron || undefined,
        categoriesCron: categoriesCron || undefined,
        variantsCron: variantsCron || undefined,
        statusCron: statusCron || undefined,
      },
    });

    if (url) {
      await prisma.storeConfiguration.deleteMany({ where: { storeId: id, key: 'url' } });
      await prisma.storeConfiguration.create({ data: { storeId: id, key: 'url', value: url } });
    }

    const refreshed = await (prisma.store as any).findUnique({
      where: { id },
      include: { configurations: true, credentials: true },
    });

    res.json(formatStore(refreshed));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update Storefront' });
  }
};

export const deleteStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await (prisma.store as any).delete({ where: { id } });
    res.json({ message: 'Storefront deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to delete Storefront' });
  }
};

// --- Push Sync & Direct Connect Actions ---

export const testStoreConnection = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await StorefrontConnectorService.testConnection(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to connect to Storefront API' });
  }
};

export const pushSyncStore = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { syncType } = req.body;
    const result = await StorefrontConnectorService.pushSyncStore({ storeId: id, syncType });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to execute Direct Push Sync' });
  }
};

export const pushInventoryOnly = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await StorefrontConnectorService.pushInventoryOnly(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to push Inventory' });
  }
};

export const pushPricingOnly = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await StorefrontConnectorService.pushPricingOnly(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to push Pricing' });
  }
};

export const getStoreProducts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mappings = await prisma.productStoreMapping.findMany({
      where: { storeId: id },
      include: {
        product: {
          include: {
            images: true,
            prices: true,
          }
        }
      }
    });
    
    const products = mappings.map((m: any) => ({
      sku: m.product.sku,
      name: m.product.name,
      status: m.syncStatus,
      lastPushed: m.lastPushedAt,
      remoteId: m.remoteStorefrontId,
      image: m.product.images?.[0]?.url || null,
      price: m.product.prices?.[0]?.amount || 0,
    }));
    
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch store products' });
  }
};
