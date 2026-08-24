import express from 'express';
import {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore,
  testStoreConnection,
  pushSyncStore,
  pushInventoryOnly,
  pushPricingOnly,
  getStoreProducts,
} from '../controllers/store.controller';

const router = express.Router();

router.get('/', getStores);
router.get('/:id', getStoreById);
router.post('/', createStore);
router.put('/:id', updateStore);
router.delete('/:id', deleteStore);

// Push Sync & Store Connectivity APIs
router.post('/:id/test-connection', testStoreConnection);
router.post('/:id/sync', pushSyncStore);
router.post('/:id/push-sync', pushSyncStore);
router.post('/:id/push-inventory', pushInventoryOnly);
router.post('/:id/push-pricing', pushPricingOnly);
router.get('/:id/products', getStoreProducts);

export default router;
