import express from 'express';
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  testProtocol,
  runE2EPipelineTest,
} from '../controllers/integration.controller';

const router = express.Router();

router.get('/', getIntegrations);
router.post('/', createIntegration);
router.put('/:id', updateIntegration);
router.post('/test', testProtocol);
router.post('/e2e-pipeline-test', runE2EPipelineTest);

export default router;
