import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { adminListUsers, adminSetUserRole } from '../controllers/user.controller.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/users', adminListUsers);
router.patch('/users/:id/role', adminSetUserRole);

export default router;
