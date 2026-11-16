// Answer 404 early when :id is not a MongoDB ObjectId, instead of letting a query fail on it.
import { isValidId } from '@flywise/shared/db.js';
import { ApiError } from '@flywise/shared/http.js';

export const requireValidId = (code, message) => (req, _res, next) => (
  isValidId(req.params.id) ? next() : next(new ApiError(404, code, message))
);
