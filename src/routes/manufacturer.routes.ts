import { Router } from 'express';
import { getManufacturers, createManufacturer, updateManufacturer, deleteManufacturer } from '../controllers/manufacturer.controller';

const router = Router();

router.get('/', getManufacturers);
router.post('/', createManufacturer);
router.put('/:id', updateManufacturer);
router.delete('/:id', deleteManufacturer);

export default router;
