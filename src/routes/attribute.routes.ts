import { Router } from 'express';
import {
  getAttributes,
  createAttribute,
  updateAttribute,
  deleteAttribute
} from '../controllers/attribute.controller';

const router = Router();

router.get('/', getAttributes);
router.post('/', createAttribute);
router.put('/:id', updateAttribute);
router.delete('/:id', deleteAttribute);

export default router;
