// playwright.config.js — UX Agent test pipeline configuration.
//
// Three account-tier suites run from this directory: guest.spec.js,
// free.spec.js, pro.spec.js. Each test in those files writes screenshots
// to test-results/<tier>/<name>.png so the UX Agent can attribute findings
// by tier.
//
// global-setup.js runs once before any test and produces the storageState
// files .auth/free.json and .auth/pro.json by logging in via the live
// Supabase auth UI. The free and pro suites declare test.use({ storageState })
// so every test starts already authenticated. Tests skip when the
// corresponding auth file is missing (i.e. credentials secrets unset).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ux',
  // ux-agent.js, _helpers.js, global-setup.js are not test files even
  // though they live in this directory. Restrict matching to *.spec.js.
  testMatch: /.*\.spec\.js$/,
  timeout: 60000,
  globalSetup: './tests/ux/global-setup.js',
  reporter: [
    ['json', { outputFile: 'playwright-report.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 390, height: 844 },
    // Capacitor / mobile-web-style UA reduces the chance of a different
    // responsive layout being served.
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
      '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
});
