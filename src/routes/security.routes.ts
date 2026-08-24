import { Router } from 'express';
import {
  setup2FA,
  verify2FA,
  disable2FA,
  getIpWhitelist,
  addIpWhitelist,
  deleteIpWhitelist,
  getAuditLogs,
} from '../controllers/security.controller';

const router = Router();

// 2FA Routes
router.post('/2fa/setup', setup2FA);
router.post('/2fa/verify', verify2FA);
router.post('/2fa/disable', disable2FA);

// IP Whitelist Routes
router.get('/ip-whitelist', getIpWhitelist);
router.post('/ip-whitelist', addIpWhitelist);
router.delete('/ip-whitelist/:id', deleteIpWhitelist);

// Audit Logs Route
router.get('/audit-logs', getAuditLogs);

export default router;
