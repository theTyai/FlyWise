// /internal - called by the admin backend only, never by a browser.
import { Router } from 'express';
import { requireInternalKey, validate } from '@flywise/shared/http.js';
import { config } from '../config/index.js';
import { relayEvent } from '../controllers/internal.controller.js';
import { internalEventSchema } from '../validators/internal.validators.js';

const router = Router();
router.use(requireInternalKey(config.internalKey));

router.post('/events', validate(internalEventSchema), relayEvent);

export default router;
