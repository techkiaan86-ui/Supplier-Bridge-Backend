import { Router } from 'express';
import { handleShift4ShopCallback, handleShift4ShopRedirect } from '../controllers/shift4shopOAuth.controller';

const router = Router();

router.post('/callback', handleShift4ShopCallback);
router.get('/redirect', handleShift4ShopRedirect);

export default router;
