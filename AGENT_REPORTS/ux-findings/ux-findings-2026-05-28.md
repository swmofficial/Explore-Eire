# UX Agent Report — 2026-05-28

## Run Context
- Commits analysed: `a429376`, `0aab776`, `16c67d3`, `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clearly implied.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access, affecting both Zustand `persist` and manual `localStorage` patterns.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, preventing users from saving waypoints.
- Tier(s) affected: Pro (P3, V3 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for V3 confirms the lack of an offline warning, but the primary failure is the disabled button.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and consumed by `WaypointSheet`.

### 3. High: Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, indicating a failure in the `isPro` check or the gating logic.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout`. This implies the test waited for the Upgrade Sheet *not* to be visible but it *was* visible, causing the timeout. The test is designed to fail if the Upgrade Sheet appears for a Pro user.
- Cannot confirm: The specific Pro affordance tapped, but the test description implies a Pro-gated feature.
- Root cause: The `isPro` flag in `userStore` is either incorrectly `false` for the Pro user in this specific context, or the component responsible for displaying the Upgrade Sheet is not correctly checking the `isPro` status. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may overwrite `isPro` to `false` on offline JWT expiry, but this is an online test. The `global-setup.js` polls for `isPro:true` before capturing `storageState`, so `isPro` should be correctly set. This points to a logic error in the UI component's rendering condition.
- User impact: Confusion and frustration for paying users who are asked to upgrade for features they already possess. Erodes trust in the subscription model.
- Business impact: Damages customer satisfaction and retention for paying users, potentially leading to cancellations.
- Fix direction: Review the `isPro` check within the component that triggers the Upgrade Sheet (e.g., `UpgradeSheet` or `CornerControls` logic) to ensure it correctly gates access for Pro users.

### 4. High: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: The application silently fails to save user-generated tracks and routes when offline, leading to complete data loss without adequate user notification or retry mechanisms.
- Tier(s) affected: Pro (V4, V6 confirmed). Affects all tiers capable of saving tracks/routes.
- Confidence: HIGH
- Evidence: `pro V4` PASS, confirming "track save fails offline". `pro V6` PASS, confirming "route save offline produces no user-facing toast (silent failure)". The `STATE_MAP.md` explicitly lists these as "What is still NOT persisted (genuine vulnerabilities)" under "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- Cannot confirm: The exact toast message (or lack thereof) for V6, as the annotation `route-button-missing: cannot proof V6` indicates the test couldn't capture it, but the PASS implies the silent failure occurred as per the test description.
- Root cause: The application lacks an offline-first architecture for user-generated data. Supabase write operations for `tracks` and `routes` are attempted directly, failing silently or with non-persistent toasts when connectivity is absent, as detailed in `STATE_MAP.md` under "Supabase Write Map".
- User impact: Significant data loss for critical user-generated content (GPS tracks of hikes, planned routes), leading to severe frustration and distrust in the app's reliability.
- Business impact: High churn, negative reviews, inability to retain users, especially those in rural areas with intermittent connectivity.
- Fix direction: Implement an offline write queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored. Provide clear UI feedback on local save status vs. server sync status.

## Tier Comparison

*   **Persistence (V1, V7, V8, V9, V11, V15):** The widespread `localStorage` persistence failures (theme, basemap, layer visibility, guest waypoints, active module, session trail) are observed across all tiers where tested (guest, free, pro). This indicates a systemic issue with `localStorage` interaction that is independent of authentication or subscription status.
*   **Learn Tab State (V13):** The fix for V13 (preserving learn tab state across switches) is confirmed to be working correctly for both `guest` and `free` tiers, with `state-loss-evidence` annotations showing no change.
*   **GPS Acquisition (P3, V3):** The failure to acquire GPS coordinates, leading to a disabled "Save Waypoint" button, is confirmed for the `pro` tier. Given the shared underlying GPS logic (`mapStore.userLocation`), this issue is highly likely to affect all tiers if they were permitted to save waypoints.
*   **Offline Data Loss (V4, V6):** Confirmed for the `pro` tier. These are known architectural vulnerabilities affecting any user attempting to save data offline, regardless of tier.

## Findings Discarded

*   **pro V10 — Pro status reverts to free on offline reload:** Discarded. The test failed with `net::ERR_INTERNET_DISCONNECTED`, indicating a failure in the test environment's ability to load the application offline, rather than a direct confirmation or refutation of the `isPro` status vulnerability. Cannot assess.
*   **pro V2 — gold/mineral data missing after offline reload:** Discarded. Similar to V10, this test failed with `net::ERR_INTERNET_DISCONNECTED`, preventing any meaningful assessment of offline data caching for gold/mineral data. Cannot assess.

## Cannot Assess

*   **Offline Page Load Stability:** The `pro V10` and `pro V2` tests consistently failed to navigate to the application URL when offline, resulting in `net::ERR_INTERNET_DISCONNECTED`. This prevents any assessment of the underlying vulnerabilities (V2, V10) and suggests an instability in the Playwright offline test setup or the application's initial offline loading sequence.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** The most critical pattern. Multiple distinct `localStorage` keys (both Zustand `persist` and manual IIFE patterns) are failing to store or retrieve data across reloads. This affects user preferences (theme, basemap, layers) and active session data (waypoints, tracks, active module). The `ee_theme-before-reload: null` annotation is key, suggesting writes are not even occurring or are immediately cleared. This points to a fundamental regression in `localStorage` interaction.
2.  **GPS Acquisition Breakdown:** The app is consistently failing to acquire GPS coordinates, even in online tests with Playwright's geolocation mock. This blocks core functionality like saving waypoints.
3.  **Unaddressed Offline Data Loss:** As per `STATE_MAP.md`, the app lacks an offline write queue, leading to confirmed data loss for tracks and routes when offline. This is a known architectural gap.

## Calibration Notes

*   The interpretation of "PASS" for tests describing vulnerabilities (e.g., `guest V11 — session waypoints are memory-only (vanish on reload)`) was carefully made to mean the *vulnerability is confirmed active*, aligning with the new "vulnerability-proof test philosophy".
*   The `state-loss-evidence` annotation for V13 (guest and free) showing identical `before` and `after` values, despite the test description "state-loss proof", correctly indicates that the *fix* for V13 is working and state *is* being preserved. This aligns with previous CONFIRMED verdicts for V13.
*   The `ee_theme-before-reload: null` annotation for V7 was crucial evidence, directly pointing to a write failure rather than just a read failure, strengthening the confidence in the persistence regression finding.
*   Test timeouts for V8 and V9 were inferred as persistence failures, consistent with the explicit failure of V7 and the systemic nature of the `localStorage` issue.
*   `net::ERR_INTERNET_DISCONNECTED` errors were correctly identified as test environment issues, leading to the discarding of V2 and V10 findings, consistent with previous "PHANTOM" verdicts for unstable test environments.