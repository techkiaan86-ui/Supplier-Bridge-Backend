import { Router } from 'express';
import { getOrders, fetchLiveOrderStatus, fetchLiveProofOfDelivery } from '../controllers/order.controller';

const router = Router();

router.get('/', getOrders);
router.get('/status/:poNumber', fetchLiveOrderStatus);
router.get('/pod/:trackingNumber', fetchLiveProofOfDelivery);

export default router;
