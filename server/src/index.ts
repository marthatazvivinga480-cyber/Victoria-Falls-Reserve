import mongoose from 'mongoose';
import { env } from './config.js';
import { app } from './app.js';
await mongoose.connect(env.MONGODB_URI);
const server = app.listen(env.PORT, () =>
  console.log(`Victoria Falls Reserve API: http://localhost:${env.PORT}`),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () =>
    server.close(() => {
      void mongoose.disconnect().then(() => process.exit(0));
    }),
  );
