import { asyncHandler, ok, pageMeta, paginate } from '@flywise/shared/http.js';
import * as inventoryService from '../services/inventory.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.validQuery);
  const { inventory, total } = await inventoryService.listInventory({ q: req.validQuery.q, skip, limit });
  ok(res, { inventory }, pageMeta(page, limit, total));
});

export const create = asyncHandler(async (req, res) => {
  ok(res, { inventory: await inventoryService.createInventory(req.admin, req.body) }, undefined, 201);
});

export const update = asyncHandler(async (req, res) => {
  ok(res, { inventory: await inventoryService.updateSeatTotal(req.admin, req.params.id, req.body.totalSeats) });
});
