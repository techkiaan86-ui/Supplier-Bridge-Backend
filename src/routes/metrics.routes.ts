import express from 'express';
import { getDashboardMetrics } from '../controllers/metrics.controller';

const router = express.Router();

router.get('/stats', getDashboardMetrics);

export default router;
