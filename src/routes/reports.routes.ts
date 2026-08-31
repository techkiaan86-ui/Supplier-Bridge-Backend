import express from 'express';
import { getReportsData } from '../controllers/reports.controller';

const router = express.Router();

router.get('/', getReportsData);

export default router;
