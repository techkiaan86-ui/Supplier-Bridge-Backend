import express from 'express';
import { getImports, createImport, updateImport } from '../controllers/import.controller';

const router = express.Router();
router.get('/', getImports);
router.post('/', createImport);
router.put('/:id', updateImport);
export default router;
