import { asyncHandler, ok, pageMeta, paginate } from '@flywise/shared/http.js';
import { listAuditLogs } from '../services/audit.service.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.validQuery, { limit: 25, max: 100 });
  const { logs, total } = await listAuditLogs({ q: req.validQuery.q, skip, limit });
  ok(res, { logs }, pageMeta(page, limit, total));
});
