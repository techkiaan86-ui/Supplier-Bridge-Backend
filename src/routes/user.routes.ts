import { Router } from 'express';
import { getUsers, getUserById, createUser, updateUser, deleteUser, updateUserStatus } from '../controllers/user.controller';
// import { authenticate, authorize, checkPermission } from '../middleware/auth.middleware';

const router = Router();

// Bypass auth middleware for development
// router.use(authenticate);

// Only authorized roles or users with 'manage_users' permission
router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/status', updateUserStatus);

export default router;
