import { defineConfig, devices } from '@playwright/test';

const port = 3001;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  outputDir: 'output/playwright/test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'output/playwright/report' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command: `PORT=${port} npm run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_GOOGLE_ID: 'playwright-google-client-id',
      AUTH_GOOGLE_SECRET: 'playwright-google-client-secret',
      AUTH_SECRET: 'playwright-auth-secret-playwright-auth-secret',
      NEXTAUTH_URL: baseURL,
      NEXT_PUBLIC_PUSHER_CLUSTER: 'us2',
      NEXT_PUBLIC_PUSHER_KEY: 'playwright-pusher-key',
      PUSHER_APP_ID: '123456',
      PUSHER_CLUSTER: 'us2',
      PUSHER_SECRET: 'playwright-pusher-secret',
    },
  },
});
