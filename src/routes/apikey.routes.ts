import { Router } from 'express';
import {
  getApiKeys,
  generateApiKey,
  revokeApiKey,
  regenerateApiKey,
  deleteApiKey,
} from '../controllers/apikey.controller';

const router = Router();

router.get('/', getApiKeys);
router.post('/generate', generateApiKey);
router.put('/:id/revoke', revokeApiKey);
router.post('/:id/regenerate', regenerateApiKey);
router.delete('/:id', deleteApiKey);

export default router;
