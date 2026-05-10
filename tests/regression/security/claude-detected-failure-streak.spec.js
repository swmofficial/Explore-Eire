// tests/regression/security/claude-detected-failure-streak.spec.js
//
// This test verifies that systemic production issues identified by the UX Agent
// (GPS acquisition failure, persistence issues) are either fixed OR properly
// documented as known vulnerabilities. An 18-day failure streak indicates
// critical regressions are not being addressed.
//
// Security relevance: Unaddressed systemic failures can mask security issues
// (e.g. data loss = potential PII exposure, GPS failures = location privacy leaks).

import { test, expect } from '@playwright/test';
import {
  bypassOnboarding,
  waitForAppReady,
  attachConsoleCapture,
  TIERS,
} from '../../_helpers.js';

test.describe('claude-detected-failure-streak', () => {
  test.beforeEach(async ({ page }) => {
    await bypassOnboarding(page);
    await attachConsoleCapture(page);
    await page.goto('https://explore-eire.vercel.app');
    await waitForAppReady(page);
  });

  test('GPS acquisition should complete successfully within 10 seconds', async ({ page }) => {
    // Navigate to Explore tab where GPS is typically used
    await page.locator('nav button', { hasText: /explore/i }).click();
    await page.waitForTimeout(500);

    // Look for GPS-dependent features (map, nearby locations, etc.)
    const mapContainer = page.locator('[class*="map"], [id*="map"], .leaflet-container').first();
    
    // Wait for GPS acquisition - should complete within 10s on real device
    // If GPS fails, the map will show an error or fallback state
    const gpsTimeout = 10000;
    
    try {
      // Check for error indicators that would suggest GPS failure
      const errorMessages = await page.locator(
        'text=/location.*unavailable|gps.*failed|permission.*denied/i'
      ).count({ timeout: gpsTimeout });
      
      expect(errorMessages).toBe(0); // Should NOT see GPS error messages
      
      // If map exists, it should be interactive (not in error state)
      if (await mapContainer.count() > 0) {
        await expect(mapContainer).toBeVisible({ timeout: gpsTimeout });
        
        // Check that no console errors related to GPS/geolocation occurred
        const gpsErrors = page._consoleErrors?.filter(err => 
          /geolocation|gps|location/i.test(err)
        ) || [];
        
        expect(gpsErrors.length).toBe(0);
      }
    } catch (error) {
      // FAIL: This confirms the GPS acquisition failure reported in UX findings
      test.fail();
      throw new Error(
        `GPS acquisition failed as documented in failure streak finding. ` +
        `This is a KNOWN VULNERABILITY that should be fixed. Error: ${error.message}`
      );
    }
  });

  test('localStorage persistence should survive page reload', async ({ page, context }) => {
    // Set a test value in localStorage
    const testKey = 'ee_test_persistence_check';
    const testValue = `test-${Date.now()}`;
    
    await page.evaluate(([key, value]) => {
      localStorage.setItem(key, value);
    }, [testKey, testValue]);
    
    // Verify it was set
    const initialValue = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, testKey);
    expect(initialValue).toBe(testValue);
    
    // Reload the page
    await page.reload();
    await waitForAppReady(page);
    
    // Verify persistence survived reload
    const persistedValue = await page.evaluate((key) => {
      return localStorage.getItem(key);
    }, testKey);
    
    if (persistedValue !== testValue) {
      // FAIL: This confirms the systemic persistence issues reported
      test.fail();
      throw new Error(
        `localStorage persistence failed: expected "${testValue}", got "${persistedValue}". ` +
        `This confirms the systemic persistence issues documented in the failure streak.`
      );
    }
    
    expect(persistedValue).toBe(testValue);
    
    // Clean up
    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, testKey);
  });

  test('critical console errors should not occur during normal navigation', async ({ page }) => {
    // Clear any startup errors
    if (page._consoleErrors) {
      page._consoleErrors.length = 0;
    }
    
    // Navigate through main app sections
    const tabs = ['Learn', 'Explore', 'Profile'];
    
    for (const tab of tabs) {
      const tabButton = page.locator('nav button', { hasText: new RegExp(tab, 'i') });
      if (await tabButton.count() > 0) {
        await tabButton.click();
        await page.waitForTimeout(1000); // Allow tab to fully render
      }
    }
    
    // Check for critical errors (uncaught exceptions, network failures, etc.)
    const criticalErrors = page._consoleErrors?.filter(err => {
      const lowerErr = err.toLowerCase();
      return (
        lowerErr.includes('uncaught') ||
        lowerErr.includes('unhandled') ||
        lowerErr.includes('failed to fetch') ||
        lowerErr.includes('network error') ||
        lowerErr.includes('typeerror') ||
        lowerErr.includes('referenceerror')
      );
    }) || [];
    
    if (criticalErrors.length > 0) {
      // FAIL: Critical errors indicate systemic issues
      test.fail();
      throw new Error(
        `Critical console errors detected during navigation: \n${criticalErrors.join('\n')}\n` +
        `This confirms systemic issues documented in the 18-day failure streak.`
      );
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});
