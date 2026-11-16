// /api/v1/admin/users - traveller accounts.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as users from '../controllers/user.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { pageQuerySchema } from '../validators/common.js';
import { accountStatusSchema } from '../validators/user.validators.js';

const router = Router();
router.use(requirePermission('MANAGE_USERS'));

router.get('/', validate(pageQuerySchema, 'query'), users.list);
router.patch('/:id/status', validate(accountStatusSchema), users.setStatus);

export default router;
