import express from 'express';
import {
  getSuppliers,
  getSupplierAuditData,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  syncSupplier,
  syncAllSuppliers,
  testSupplierConnection,
  testNewConnection,
  getSupplierSchedules,
  updateSupplierSchedules
} from '../controllers/supplier.controller';

const router = express.Router();

router.get('/', getSuppliers);
router.get('/audit', getSupplierAuditData);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
router.post('/:id/sync', syncSupplier);
router.post('/sync-all', syncAllSuppliers);
router.post('/test-connection', testNewConnection);
router.post('/:id/test', testSupplierConnection);
router.get('/:id/schedules', getSupplierSchedules);
router.put('/:id/schedules', updateSupplierSchedules);

export default router;
