import express from 'express';
import { getRules, createRule, updateRule, deleteRule, getAudits, syncPrices } from '../controllers/pricing.controller';

const router = express.Router();

router.get('/rules', getRules);
router.post('/rules', createRule);
router.put('/rules/:id', updateRule);
router.delete('/rules/:id', deleteRule);

router.get('/audits', getAudits);
router.post('/sync', syncPrices);

export default router;
