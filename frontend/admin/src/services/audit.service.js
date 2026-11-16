// Audit log (/audit-logs). Read-only.
import { api, query } from './api.js';

export const listAuditLogs = (params) => api.get(`/audit-logs${query(params)}`); // { logs, meta }
