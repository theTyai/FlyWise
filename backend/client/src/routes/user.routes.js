// /api/v1/users
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as users from '../controllers/user.controller.js';
import { requireUser } from '../middleware/auth.js';
import { updateProfileSchema } from '../validators/user.validators.js';

const router = Router();
router.use(requireUser);

router.get('/me', users.getMe);
router.patch('/me', validate(updateProfileSchema), users.updateMe);

export default router;
