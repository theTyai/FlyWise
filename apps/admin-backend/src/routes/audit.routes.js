// /api/v1/admin/audit-logs - read-only. No route can change or delete an entry.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import { list } from '../controllers/audit.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { pageQuerySchema } from '../validators/common.js';

const router = Router();
router.use(requirePermission('VIEW_AUDIT_LOGS'));

router.get('/', validate(pageQuerySchema, 'query'), list);

export default router;
