// /api/v1/auth
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as auth from '../controllers/auth.controller.js';
import { requireUser } from '../middleware/auth.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.validators.js';

const router = Router();

router.post('/register', validate(registerSchema), auth.register);
router.post('/login', validate(loginSchema), auth.login);
router.post('/refresh', validate(refreshSchema), auth.refresh);
router.post('/logout', requireUser, auth.logout);

export default router;
