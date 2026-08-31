import { Router } from 'express';
import { getCategorys, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';

const router = Router();

router.get('/', getCategorys);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
