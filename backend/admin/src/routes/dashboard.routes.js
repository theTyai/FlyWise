// /api/v1/admin/dashboard
import { Router } from 'express';
import { overview } from '../controllers/dashboard.controller.js';
import { requirePermission } from '../middleware/auth.js';

const router = Router();

router.get('/', requirePermission('VIEW_REQUESTS'), overview);

export default router;
