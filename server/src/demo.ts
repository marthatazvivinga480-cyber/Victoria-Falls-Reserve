import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(
  new URL('../../.cache/mongodb', import.meta.url),
);
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mongo.getUri();
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';
process.env.JWT_ACCESS_SECRET ??= 'demo-access-secret-only-for-local-123456789';
process.env.JWT_REFRESH_SECRET ??= 'demo-refresh-secret-only-for-local-123456789';
const { app } = await import('./app.js');
const { seedData } = await import('./seed-data.js');
await mongoose.connect(process.env.MONGODB_URI);
const demoAdminPassword = process.env.DEMO_ADMIN_PASSWORD ?? randomBytes(24).toString('hex');
await seedData({ adminPassword: demoAdminPassword });
if (!process.env.DEMO_ADMIN_PASSWORD)
  console.log('Temporary demo admin password (this process only): ' + demoAdminPassword);
const port = Number(process.env.PORT || 4000);
const server = app.listen(port, '127.0.0.1', () =>
  console.log(`Seeded temporary demo API on http://127.0.0.1:${port}. Data resets on restart.`),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () =>
    server.close(() => {
      void mongoose
        .disconnect()
        .then(() => mongo.stop())
        .then(() => process.exit(0));
    }),
  );
