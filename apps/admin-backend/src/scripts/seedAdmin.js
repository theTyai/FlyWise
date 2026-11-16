// Creates the first desk account from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD in .env.
//  - Runs automatically when the admin backend starts and no admin exists.
//  - Run by hand with:  npm run seed:admin
// It never changes an existing account. To reset a forgotten password, delete the
// document from the "admins" collection and run this again.
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { ADMIN_PERMISSIONS } from '@flywise/shared/constants.js';
import { connectDB, mongoose } from '@flywise/shared/db.js';
import { Admin } from '@flywise/shared/models.js';
import { config } from '../config/index.js';

export async function ensureAdmin() {
  if (await Admin.exists({})) return null;
  const { name, email, password } = config.seed;
  if (!email || !password) {
    console.warn('[admin-backend] No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and restart.');
    return null;
  }
  if (password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const admin = await Admin.create({
    name, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 11),
    role: 'ADMIN', permissions: [...ADMIN_PERMISSIONS],
  });
  console.log(`[admin-backend] Created admin account ${admin.email}`);
  return admin;
}

// True only when this file is the script being run (not when server.js imports it).
const runDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runDirectly) {
  connectDB(config.mongoUri)
    .then(ensureAdmin)
    .then((created) => { if (!created) console.log('[seed] An admin account already exists (or no credentials were set).'); })
    .catch((err) => { console.error('[seed] failed:', err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
