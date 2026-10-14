import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 120000,
    hookTimeout: 1200000,
    env: {
      NODE_ENV: 'test',
      MONGOMS_DOWNLOAD_DIR: fileURLToPath(new URL('../.cache/mongodb', import.meta.url)),
      MONGODB_URI: 'mongodb://placeholder',
      CLIENT_ORIGIN: 'http://localhost:5173',
      JWT_ACCESS_SECRET: 'test-access-secret-123456789012345678',
      JWT_REFRESH_SECRET: 'test-refresh-secret-123456789012345678',
    },
  },
});
