import mongoose from 'mongoose';
import { env } from './config.js';
import { setAdminPassword } from './services/admin-password.js';
if (!env.SEED_ADMIN_PASSWORD)
  throw new Error('Set a private SEED_ADMIN_PASSWORD in server/.env first');
try {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  await setAdminPassword('admin@vfr.example', env.SEED_ADMIN_PASSWORD);
  console.log('Admin password updated. Previous admin sessions revoked. Password was not printed.');
} catch {
  console.error(
    'Admin password update failed. Check Atlas access and that the admin account exists. No credentials were printed.',
  );
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
