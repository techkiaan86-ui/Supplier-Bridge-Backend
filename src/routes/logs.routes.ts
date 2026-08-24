import express from 'express';
import { getLogs, createLog, clearLogs } from '../controllers/logs.controller';

const router = express.Router();

router.get('/', getLogs);
router.post('/', createLog);
router.delete('/clear', clearLogs);

export default router;
