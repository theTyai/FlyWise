// /api/v1/admin/settings
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as settings from '../controllers/settings.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { settingsSchema } from '../validators/settings.validators.js';

const router = Router();
router.use(requirePermission('MANAGE_SETTINGS'));

router.get('/', settings.read);
router.patch('/', validate(settingsSchema), settings.update);
router.get('/services', settings.services);

export default router;
