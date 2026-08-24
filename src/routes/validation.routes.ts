import express from 'express';
import {
  getValidationItems,
  runValidationForProduct,
  resolveProductValidation,
  rejectProductValidation,
  deleteValidationItem,
} from '../controllers/validation.controller';

const router = express.Router();

// GET  /api/validation                        → all validation items grouped by product
router.get('/', getValidationItems);

// POST /api/validation/run/:productId         → manually re-run validation for a product
router.post('/run/:productId', runValidationForProduct);

// POST /api/validation/:productId/resolve     → approve (resolve all issues for product)
router.post('/:productId/resolve', resolveProductValidation);

// POST /api/validation/:productId/reject      → reject all issues for product
router.post('/:productId/reject', rejectProductValidation);

// DELETE /api/validation/:id                  → delete a single validation log entry
router.delete('/:id', deleteValidationItem);

export default router;
