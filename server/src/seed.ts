import mongoose from 'mongoose';
import { env } from './config.js';
import { seedData } from './seed-data.js';
await mongoose.connect(env.MONGODB_URI);
await seedData({ adminPassword: env.SEED_ADMIN_PASSWORD });
console.log('Seed complete. Admin credentials are private; customer demo account is unchanged.');
await mongoose.disconnect();
