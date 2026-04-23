import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ux',
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'on',
    video: 'retain-on-failure',
    viewport: { width: 390, height: 844 },
  },
  reporter: [['json', { outputFile: 'playwright-report.json' }]],
});
