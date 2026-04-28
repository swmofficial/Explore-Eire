// global-setup.js — runs once before any test in the run.
//
// Logs in the free and pro test accounts via the live Supabase auth UI,
// captures the resulting session in storageState files, and writes them to
// .auth/free.json and .auth/pro.json. The free.spec.js and pro.spec.js
// suites then load those storageState files via test.use() so every test
// starts already authenticated. This is much faster than logging in inside
// every beforeEach and survives the splash/onboarding overlay correctly
// (storageState restores localStorage and cookies before the page script
// runs, so ee_onboarded is set from the start in subsequent runs).
//
// Credentials come from GitHub Actions secrets (TEST_FREE_EMAIL etc.).
// If a credential pair is missing — e.g. a developer runs locally without
// secrets — that account's auth file is skipped silently and the
// corresponding suite's tests will fail at the "is logged in" assertion,
// which is the correct behaviour (tests should fail when the environment is
// not configured for them).
//
// We do NOT attempt to seed the Supabase profile row, accept the legal
// disclaimer, or activate a Stripe subscription from here. Those are
// expected to be pre-configured for the test accounts:
//   - test-free@exploreeire.ie  → profiles.legal_accepted = true,
//                                  profiles.is_pro = false
//   - test-pro@exploreeire.ie   → profiles.legal_accepted = true,
//                                  profiles.is_pro = true,
//                                  active row in subscriptions table
// This must be set up once by a human against the Supabase test instance.

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_DIR = path.join(process.cwd(), '.auth');

async function login(baseURL, email, password, outFile) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Set ee_onboarded BEFORE the first navigation so the onboarding overlay
  // does not block the AuthModal trigger. addInitScript persists for every
  // page in this context.
  await page.addInitScript(() => {
    try { localStorage.setItem('ee_onboarded', 'true'); } catch (_) {}
  });

  await page.goto(baseURL);
  // Past splash + nav visible.
  await page.waitForTimeout(2400);
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 10000 });

  // Open the auth modal. The dashboard's "Sign in" CTA opens it, as does
  // a tap on a Pro-locked module. We use the SettingsView path which is
  // the most reliable: tap Settings tab → "Sign in" row.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForTimeout(500);
  // SettingsView shows "Sign in to Explore Eire" or similar when guest;
  // clicking any sign-in affordance opens AuthModal.
  const signIn = page.getByRole('button', { name: /sign in/i }).first();
  await signIn.click({ timeout: 10000 });
  await page.waitForTimeout(400);

  // AuthModal exposes email + password inputs. The Field component
  // renders a sibling <label> rather than an htmlFor association, so
  // getByLabel is unreliable. Use the input type attributes — they are
  // stable (verified against AuthModal.jsx Field component). The submit
  // button inside the modal has visible text "Sign In".
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  // Multiple "Sign In" buttons may exist (the SettingsView CTA we just
  // tapped, plus the modal's submit). Scope to the modal by picking the
  // last match — modals render at the end of the DOM tree.
  await page.getByRole('button', { name: /^sign in$/i }).last().click();

  // Wait for the modal to close and the auth state to settle. The modal
  // un-renders when showAuthModal=false in the user store; we proxy on
  // the password input disappearing.
  await page.locator('input[type="password"]').first().waitFor({ state: 'detached', timeout: 15000 });

  // Give Supabase + the React tree one final tick to write the session to
  // localStorage (sb-*-auth-token).
  await page.waitForTimeout(1000);

  await context.storageState({ path: outFile });
  await browser.close();
  console.log(`[global-setup] saved auth state to ${outFile}`);
}

export default async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL;
  if (!baseURL) {
    console.warn('[global-setup] no baseURL — skipping auth setup');
    return;
  }

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

  const tasks = [];

  if (process.env.TEST_FREE_EMAIL && process.env.TEST_FREE_PASSWORD) {
    tasks.push(
      login(
        baseURL,
        process.env.TEST_FREE_EMAIL,
        process.env.TEST_FREE_PASSWORD,
        path.join(AUTH_DIR, 'free.json'),
      ).catch((e) => {
        console.error(`[global-setup] free login failed: ${e.message}`);
      }),
    );
  } else {
    console.warn('[global-setup] TEST_FREE_EMAIL/PASSWORD not set — free suite will run unauthenticated and fail');
  }

  if (process.env.TEST_PRO_EMAIL && process.env.TEST_PRO_PASSWORD) {
    tasks.push(
      login(
        baseURL,
        process.env.TEST_PRO_EMAIL,
        process.env.TEST_PRO_PASSWORD,
        path.join(AUTH_DIR, 'pro.json'),
      ).catch((e) => {
        console.error(`[global-setup] pro login failed: ${e.message}`);
      }),
    );
  } else {
    console.warn('[global-setup] TEST_PRO_EMAIL/PASSWORD not set — pro suite will run unauthenticated and fail');
  }

  await Promise.all(tasks);
}
