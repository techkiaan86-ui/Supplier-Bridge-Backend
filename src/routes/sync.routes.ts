import express from 'express';
import {
  getSyncJobs,
  createSyncJob,
  getInventorySync,
  triggerInventorySync,
  getImageSync,
  triggerImageSync,
  triggerCardinalSync
} from '../controllers/sync.controller';

const router = express.Router();

// Jobs
router.get('/jobs', getSyncJobs);
router.post('/jobs', createSyncJob);

// Inventory
router.get('/inventory', getInventorySync);
router.post('/inventory', triggerInventorySync);
router.post('/inventory/sync', triggerInventorySync);

// Images
router.get('/images', getImageSync);
router.post('/images', triggerImageSync);
router.post('/images/sync', triggerImageSync);

// Cardinal Health Automated Sync
router.post('/cardinal', triggerCardinalSync);
router.post('/cardinal/sync', triggerCardinalSync);

export default router;

