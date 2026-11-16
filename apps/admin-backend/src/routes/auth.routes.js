// /api/v1/admin/auth - there is no registration route on purpose.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as auth from '../controllers/auth.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { loginSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', validate(loginSchema), auth.login);
router.get('/me', requireAdmin, auth.me);

export default router;
