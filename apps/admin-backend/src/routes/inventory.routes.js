// /api/v1/admin/inventory - simulated seat counts per flight.
import { Router } from 'express';
import { validate } from '@flywise/shared/http.js';
import * as inventory from '../controllers/inventory.controller.js';
import { requirePermission } from '../middleware/auth.js';
import { pageQuerySchema } from '../validators/common.js';
import { createInventorySchema, updateInventorySchema } from '../validators/inventory.validators.js';

const router = Router();
router.use(requirePermission('MANAGE_INVENTORY'));

router.get('/', validate(pageQuerySchema, 'query'), inventory.list);
router.post('/', validate(createInventorySchema), inventory.create);
router.patch('/:id', validate(updateInventorySchema), inventory.update);

export default router;
