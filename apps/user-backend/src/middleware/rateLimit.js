// Request limits per IP address over a 15-minute window, answered in the standard error format.
import rateLimit from 'express-rate-limit';

export const limiter = (max, message) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message } },
});
