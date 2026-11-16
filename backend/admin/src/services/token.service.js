// JSON Web Tokens for desk (admin) accounts. Signed with ADMIN_JWT_SECRET, which the
// user backend never sees - so nothing a traveller holds can be accepted here.
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin._id), role: 'ADMIN' }, config.jwtSecret, { expiresIn: config.tokenTtl });
}

// Throws when the token is missing, expired, forged, or not an admin token.
export function verifyAdminToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload.role !== 'ADMIN') throw new Error('wrong role');
  return payload;
}
