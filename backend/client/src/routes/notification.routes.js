// /api/v1/notifications
import { Router } from 'express';
import * as notifications from '../controllers/notification.controller.js';
import { requireUser } from '../middleware/auth.js';

const router = Router();
router.use(requireUser);

router.get('/', notifications.list);
router.post('/read-all', notifications.readAll);
router.patch('/:id/read', notifications.readOne);

export default router;
