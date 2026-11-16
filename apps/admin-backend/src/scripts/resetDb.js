// Deletes ALL FlyWise data (travellers, requests, inventory, audit log, desk accounts) so a
// demo can start from scratch. The desk account is recreated the next time the admin
// backend starts. Refuses to run without --yes:
//
//   npm run db:reset -- --yes
import { connectDB, mongoose } from '@flywise/shared/db.js';
import { config } from '../config/index.js';

if (!process.argv.includes('--yes')) {
  console.log('This deletes every document in the FlyWise database. To go ahead, run:  npm run db:reset -- --yes');
  process.exit(0);
}

connectDB(config.mongoUri)
  .then(async (connection) => {
    const name = connection.name;
    await connection.dropDatabase();
    console.log(`[db:reset] Dropped database "${name}". Restart the backends, then run: npm run seed:demo`);
  })
  .catch((err) => { console.error('[db:reset] failed:', err.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
