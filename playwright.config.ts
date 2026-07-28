import { defineConfig, devices } from '@playwright/test';

/**
 * E2E — base URL allineata a vite.config.ts (port 8084).
 * Avvio: npm run test:e2e  (avvia Vite se non è già su)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8084',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8084',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
