import mongoose from 'mongoose';
import { env } from './config.js';
import { seedData } from './seed-data.js';
await mongoose.connect(env.MONGODB_URI);
await seedData();
console.log('Seed complete. Demo password: ReserveDemo123!');
await mongoose.disconnect();
