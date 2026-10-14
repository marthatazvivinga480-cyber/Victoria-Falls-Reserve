import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:15173', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } }
          : {}),
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:demo',
      url: 'http://127.0.0.1:14000/api/health',
      timeout: 1200000,
      reuseExistingServer: false,
      env: {
        CLIENT_ORIGIN: 'http://127.0.0.1:15173',
        DEMO_ADMIN_PASSWORD: 'BrowserFixtureAdmin123!',
        PORT: '14000',
      },
    },
    {
      command: 'npm run preview -w client -- --port 15173',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:14000' },
      url: 'http://127.0.0.1:15173',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
