import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
createTask,
getTasks,
getTaskById,
updateTask,
deleteTask,
shareTask,
unshareTask 
} from '../controllers/task.controller.js';

const router = Router();

// all task routes require authentication
router.use(requireAuth);

// Create
router.post('/', createTask);

// Read (list with optional ?filter=all|pending|completed)
router.get('/', getTasks);

// Read by id (only owner or shared)
router.get('/:id', getTaskById);

// Update (owner only)
router.patch('/:id', updateTask);

// Delete (owner only)
router.delete('/:id', deleteTask);

router.post('/:id/unshare', unshareTask);

router.post('/:id/share', shareTask);

export default router;
