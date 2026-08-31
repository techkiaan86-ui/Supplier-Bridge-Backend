import { Router } from 'express';
import { getVariants, createVariant, updateVariant, deleteVariant } from '../controllers/variant.controller';

const router = Router();

router.get('/', getVariants);
router.post('/', createVariant);
router.put('/:id', updateVariant);
router.delete('/:id', deleteVariant);

export default router;
