import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
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
await seedData();
const server = app.listen(4000, () =>
  console.log('Seeded local demo API on http://localhost:4000. Data resets on restart.'),
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
