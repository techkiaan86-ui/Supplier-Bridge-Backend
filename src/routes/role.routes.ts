import { Router } from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/role.controller';
// import { authenticate, checkPermission } from '../middleware/auth.middleware';

const router = Router();

// router.use(authenticate);

router.get('/', getRoles);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
