import express from 'express';
import { getSettings, updateSettings, sendTestEmailController } from '../controllers/setting.controller';

const router = express.Router();

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test-email', sendTestEmailController);

export default router;
