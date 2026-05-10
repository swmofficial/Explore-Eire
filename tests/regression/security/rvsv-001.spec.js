// rvsv-001-zustand-auth-token-leak.spec.js — Zustand persist middleware stores auth tokens in localStorage
//
// Vulnerability: userStore uses Zustand's persist() middleware. If auth tokens
// (user object) leak into the persisted state, they are written to localStorage
// in plain text, accessible to XSS or malicious Capacitor plugins.
//
// Attack scenario:
// 1. Sign in as a free-tier user.
// 2. Inspect localStorage for 'ee-user-prefs' key.
// 3. Parse stored JSON and search for auth tokens (access_token, refresh_token).
// 4. FAIL if tokens are found (vulnerability present).
// 5. PASS if tokens are absent (partialize() correctly excludes user object).
//
// Current state (per source): userStore.js line 62–66 partializes only
// isPro/subscriptionStatus, excluding the user object. This test verifies
// that exclusion is enforced at runtime.

import { test, expect } from '@playwright/test';
import {
  bypassOnboarding,
  waitForAppReady,
  attachConsoleCapture,
  TIERS,
} from '../_helpers.js';

test.describe('rvsv-001: Zustand auth token persistence', () => {
  test.beforeEach(async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('https://explore-eire.vercel.app');
    await waitForAppReady(page);
    attachConsoleCapture(page);
  });

  test('auth tokens must not persist to localStorage after sign-in', async ({ page }) => {
    // Step 1: Open auth modal and sign in with free-tier test account.
    // Use the account switcher button in the header (visible on all tiers).
    await page.locator('button[aria-label="Account menu"]').click();
    await page.locator('text=Sign In').click();

    // Wait for auth modal to appear.
    await page.locator('form').filter({ hasText: 'Email' }).waitFor({ state: 'visible' });

    // Fill credentials for free-tier test account (from handover doc).
    await page.fill('input[type="email"]', 'testuser@exploreeire.com');
    await page.fill('input[type="password"]', 'TestUser123!');
    await page.locator('button[type="submit"]').click();

    // Wait for auth to complete — user avatar or account button should update.
    await page.waitForTimeout(2000); // Allow Supabase auth + store hydration.

    // Step 2: Extract localStorage 'ee-user-prefs' key.
    const persistedState = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('ee-user-prefs');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });

    // Step 3: Verify persisted state exists (partialize should write isPro/subscriptionStatus).
    expect(persistedState).not.toBeNull();
    expect(persistedState.state).toBeDefined();

    const state = persistedState.state;

    // Step 4: Assert no auth tokens are present.
    // Check for common Supabase auth token field names.
    const stateJson = JSON.stringify(state).toLowerCase();

    expect(stateJson).not.toContain('access_token');
    expect(stateJson).not.toContain('refresh_token');
    expect(stateJson).not.toContain('access token');
    expect(stateJson).not.toContain('refresh token');

    // Step 5: Verify the user object itself is not persisted.
    expect(state.user).toBeUndefined();

    // Step 6: Confirm expected fields ARE present (partialize working correctly).
    expect(state.isPro).toBeDefined();
    expect(state.subscriptionStatus).toBeDefined();
  });

  test('auth tokens must not persist after guest-mode browsing', async ({ page }) => {
    // Guest mode should never store auth state, but verify partialize prevents leaks.
    // Trigger guest mode by clicking "Continue as Guest" from onboarding or auth modal.
    // For this test, we assume the app allows guest browsing without sign-in.

    // Extract localStorage immediately (no sign-in performed).
    const persistedState = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('ee-user-prefs');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });

    // If no persisted state exists yet, that's fine (guest mode may not trigger persist).
    if (persistedState && persistedState.state) {
      const state = persistedState.state;
      const stateJson = JSON.stringify(state).toLowerCase();

      // Assert no auth tokens present.
      expect(stateJson).not.toContain('access_token');
      expect(stateJson).not.toContain('refresh_token');
      expect(state.user).toBeUndefined();
    }

    // Step 2: Navigate to LearnView (guest-accessible T6/T7).
    await page.locator('button[aria-label="Learn"]').click();
    await page.waitForTimeout(1000);

    // Re-check localStorage after navigation.
    const persistedStateAfter = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem('ee-user-prefs');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    });

    if (persistedStateAfter && persistedStateAfter.state) {
      const state = persistedStateAfter.state;
      const stateJson = JSON.stringify(state).toLowerCase();

      expect(stateJson).not.toContain('access_token');
      expect(stateJson).not.toContain('refresh_token');
      expect(state.user).toBeUndefined();
    }
  });

  test('Capacitor environment: verify encrypted storage is not used (localStorage fallback)', async ({ page }) => {
    // This test documents the current insecure state: localStorage is used in Capacitor.
    // Once fixed (using @capacitor/preferences), this test should be updated to verify
    // that sensitive data is NOT in localStorage but in secure storage.

    // For now, we verify localStorage IS used (documenting the vulnerability).
    const isLocalStorageUsed = await page.evaluate(() => {
      try {
        // Zustand persist writes to localStorage by default.
        const raw = localStorage.getItem('ee-user-prefs');
        return raw !== null;
      } catch {
        return false;
      }
    });

    // Current vulnerable state: localStorage is used.
    expect(isLocalStorageUsed).toBe(true);

    // TODO: After fix (rvsv-001), this test should assert isLocalStorageUsed === false
    // and verify @capacitor/preferences.get('ee-user-prefs') returns the data instead.
    // That would require a Capacitor native bridge mock in Playwright or a manual
    // verification step in the native app.
  });
});
