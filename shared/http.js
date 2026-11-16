// Small Express helpers used by both backends so responses and errors look the same.
// Response format:  { success: true, data, meta? }  /  { success: false, error: { code, message, details? } }
import crypto from 'node:crypto';

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function ok(res, data, meta, status = 200) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

// Validate one part of the request with a zod schema and replace it with the parsed value.
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return next(new ApiError(400, 'VALIDATION_ERROR', details[0]?.message || 'Invalid request', details));
  }
  if (source === 'query') req.validQuery = result.data;
  else req[source] = result.data;
  return next();
};

// Drop any key that could be read as a MongoDB operator or a dotted path.
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key];
      else value[key] = scrub(value[key]);
    }
  }
  return value;
}

export function sanitizeRequest(req, _res, next) {
  if (req.body) scrub(req.body);
  if (req.params) scrub(req.params);
  if (req.query) scrub(req.query);
  next();
}

const SENSITIVE = /password|passengers?|token|secret|authorization|dateOfBirth|phone/i;

// Redact sensitive fields before anything is written to a log.
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? '[redacted]' : redact(v)]),
    );
  }
  return value;
}

export function notFound(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'BAD_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, error: { code: 'BAD_ID', message: 'Invalid identifier' } });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}:`, err?.message, redact(req.body || {}));
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' },
  });
}

export function paginate(query, defaults = { limit: 20, max: 100 }) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(defaults.max, Math.max(1, Number.parseInt(query.limit, 10) || defaults.limit));
  return { page, limit, skip: (page - 1) * limit };
}

// The "meta" block of a paginated response.
export function pageMeta(page, limit, total) {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

// Escape user text before using it inside a RegExp search.
export function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Guard for service-to-service routes: the caller must send the shared key in the
// x-internal-key header. Compared in constant time so the key cannot be guessed byte by byte.
export const requireInternalKey = (expectedKey) => (req, _res, next) => {
  if (!expectedKey || typeof expectedKey !== 'string' || expectedKey.trim() === '') {
    return next(new ApiError(500, 'INTERNAL_KEY_NOT_CONFIGURED', 'Internal service key is not configured'));
  }
  const given = Buffer.from(String(req.headers['x-internal-key'] || ''));
  const expected = Buffer.from(String(expectedKey));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return next(new ApiError(401, 'INTERNAL_KEY_INVALID', 'Invalid internal service key'));
  }
  return next();
};

// POST JSON to another FlyWise service. Never throws: delivery problems must not
// change the outcome of the request that triggered them.
export async function postInternal(url, key, body, timeoutMs = 3000) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[internal] could not reach ${url}: ${err.message}`);
    return false;
  }
}
