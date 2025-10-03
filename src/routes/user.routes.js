import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listUsers,deleteMe } from '../controllers/user.controller.js';

const router = Router();
router.use(requireAuth);

// GET /users  -> [{ id, name, email }]
router.get('/', listUsers);
router.delete('/me', deleteMe);

export default router;
