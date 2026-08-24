import { Router } from 'express';
import { getPermissions, createPermission, updatePermission, deletePermission, assignPermissionToRole, removePermissionFromRole } from '../controllers/permission.controller';
// import { authenticate, checkPermission } from '../middleware/auth.middleware';

const router = Router();

// router.use(authenticate);

router.get('/', getPermissions);
router.post('/', createPermission);
router.put('/:id', updatePermission);
router.delete('/:id', deletePermission);

router.post('/assign', assignPermissionToRole);
router.post('/remove', removePermissionFromRole);

export default router;
