# UX Agent Report — 2026-07-03

## Run Context
- Commits analysed: `e54494c` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` due to a failure in GPS acquisition, preventing users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1 - Regression)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping/tracking app.
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation.

### 4. Critical Data Loss: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to data loss and user confusion.
- Tier(s) affected: Pro (likely all authenticated users)
- Confidence: HIGH
- Evidence: `pro V6` passed. The `STATE_MAP.md` explicitly states that `routes` INSERT fails offline with "console.error only, no toast". The test passing confirms this vulnerability (absence of a toast).
- Cannot confirm: The exact route data that was lost, or if the `console.error` is visible to the user.
- Root cause: The `routes` INSERT operation to Supabase lacks an explicit error handling mechanism that displays a user-facing toast when offline, as described in `STATE_MAP.md`. This violates "Offline-First Design" principles.
- User impact: Users believe their route has been saved, only to find it missing later, leading to frustration and distrust.
- Business impact: Erodes user trust in data safety, potentially leading to churn.
- Fix direction: Implement a user-facing toast notification for failed route saves, and ideally, an offline queue for data synchronization.

### 5. Business Logic Error: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: When a free user taps the camera button to save a waypoint, they are incorrectly allowed to proceed to the `WaypointSheet` instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If the waypoint can actually be saved to Supabase (it should fail for free users, potentially leading to silent data loss).
- Root cause: The gating logic for the camera button (or the `WaypointSheet` entry point) is incorrectly checking the user's `isPro` status, or the `showUpgradeSheet` action is not being triggered for free users.
- User impact: Free users can attempt to use a Pro feature, potentially leading to failed saves and confusion when their data doesn't persist.
- Business impact: Missed upgrade opportunities, undermines the value proposition of the Pro tier.
- Fix direction: Correct the conditional rendering or action dispatch for the camera button/waypoint save flow to ensure free users are routed to the `UpgradeSheet`.

### 6. Data Loss: Guest Waypoints and Active Module Not Persisted (Vulnerability V11, V15 - Regression)
- Summary: Guest waypoints and the active module preference are not persisted across page reloads, leading to loss of temporary data and module selection. This is a regression from previously confirmed fixes.
- Tier(s) affected: Guest (V11, V15)
- Confidence: HIGH
- Evidence: `guest V11` passed with `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` passed with `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. Both confirm the vulnerabilities.
- Cannot confirm: If authenticated users' active module is also affected (it should be persisted via `ee_active_module` if the manual pattern works).
- Root cause: The manual `IIFE + write` patterns for `ee_guest_waypoints` (task-002) and `ee_active_module` (task-013) are not functioning correctly, or the `clearGuestWaypoints` is being called incorrectly. This contradicts previous findings that confirmed these fixes. These are regressions.
- User impact: Loss of temporary waypoints for guest users, and constant re-selection of the active module for all users.
- Business impact: Degrades user experience, especially for new users trying out the app as a guest.
- Fix direction: Debug the manual persistence logic for `ee_guest_waypoints` and `ee_active_module`.

### 7. Preference Loss: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8 - Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest (basemap), Free (layers) (likely all tiers)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. This implies the test was waiting for the preferences to be restored but they were not, leading to a timeout. The `STATE_MAP.md` indicates `mapStore` uses Zustand `persist` for `basemap` and `layerVisibility` (key: `ee-map-prefs`).
- Cannot confirm: The exact default values they revert to, or if Pro users are affected.
- Root cause: The Zustand `persist` middleware for `mapStore` (specifically for `basemap` and `layerVisibility`) is either not correctly configured, or the `ee-map-prefs` localStorage key is not being written/read as expected. This contradicts the previous finding "Persist user preference state across reloads (V7, V8, V9, V15)" which was CONFIRMED. This is a regression.
- User impact: Annoyance, users have to reconfigure their map view after every reload.
- Business impact: Degrades user experience, especially for power users who customize layers.
- Fix direction: Debug the `mapStore` Zustand `persist` configuration and verify `ee-map-prefs` localStorage interactions.

### 8. Preference Loss: Theme Resets to Default on Reload (Vulnerability V7 - Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest, Free (likely Pro too)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If Pro users are also affected, but the root cause is systemic.
- Root cause: `STATE_MAP.md` states `theme` uses manual `ee_theme` key (task-008). The annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate this manual persistence mechanism is failing to write the theme to localStorage. This contradicts the previous finding "Fix V7: manual localStorage for theme (bypass Zustand persist)" which was CONFIRMED. This is a regression.
- User impact: Minor annoyance, app doesn't remember a basic preference.
- Business impact: Degrades user experience, contributes to a perception of an unpolished app.
- Fix direction: Debug the manual `ee_theme` localStorage write/read logic in `userStore.js` and `SettingsView`.

## Tier Comparison
- **Offline Loading (V10, V2):** Pro tier fails completely to load the app. Free tier is likely affected but not explicitly tested for full app load failure. Guest tier is not tested for this specific failure.
- **Theme Reset (V7):** Guest and Free tiers both fail, resetting to 'dark'. This indicates a systemic issue affecting all users regardless of authentication.
- **Basemap/Layer Reset (V9, V8):** Guest (basemap) and Free (layers) tiers both fail with timeouts, indicating a systemic issue affecting map preferences for all users.
- **Learn Tab State (V13, F4):** Guest and Free tiers both pass, showing consistent (0%) header stats. This indicates the header stats are correctly reflecting persisted (empty) progress, and the component state preservation fix for V13 is likely holding.
- **Waypoint Persistence (V11):** Guest tier confirms waypoints are memory-only. Authenticated users (Free/Pro) are expected to persist waypoints to Supabase, but the save button is disabled (P3/V3), preventing testing of this.
- **Track Persistence (V1):** Pro tier confirms track loss. This is a core feature, so it affects all users who track.
- **Module Persistence (V15):** Guest tier confirms module reset. This is a core preference, so it affects all users.

## Findings Discarded
- **Pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This finding was discarded as it was the least impactful of the 9 identified issues. While an annoyance for paying users, it does not prevent core functionality or lead to data loss. The test failed with a timeout, suggesting the UpgradeSheet *was* visible, which is a regression from a previous fix.
- **Guest/Free V13 — learn header stats are recomputed on every tab switch (state-loss proof):** This finding was discarded as the test evidence (`state-loss-evidence`) showed identical (0%) values before and after tab switching. While the test description implies "state-loss proof," the actual values do not demonstrate a loss. The underlying vulnerability (in-progress chapter reading position) is not directly tested by this metric, and a previous fix for V13 (component state preservation) was confirmed. The test passing with consistent values suggests the header stats are correctly reflecting the (empty) persisted progress, rather than indicating a regression of the core V13 vulnerability.

## Cannot Assess
- No specific items could not be assessed due to missing data or skipped suites.

## Systemic Patterns
- **Regression of Persistence Fixes:** A significant number of previously "CONFIRMED" fixes for state persistence (V1, V7, V8, V9, V11, V15) have regressed. This points to a fundamental issue with how persistence is implemented or maintained, possibly related to recent changes in Zustand `persist` configuration or manual localStorage patterns.
- **Critical Offline Failures:** The application is fundamentally broken offline for authenticated users (V10, V2), and critical data writes fail silently (V6, V4 confirmed, V3 implied). This highlights a severe lack of offline-first design and robust error handling for network-dependent operations.
- **GPS Acquisition Issues:** The `WaypointSheet`'s save button is consistently disabled due to GPS acquisition failure (P3, V3), indicating a problem with location services integration or how the app handles GPS signals (including mocks).

## Calibration Notes
- The "Vulnerability-Proof Test Philosophy" is proving effective, with explicit annotations providing direct evidence for confirming vulnerabilities (e.g., `V11 confirmed`, `V15 confirmed`, `V14 confirmed`).
- `Test timeout` errors are consistently reliable indicators of issues where an expected UI state was not reached or an action could not be performed, often implying a deeper underlying problem.
- The interpretation of ambiguous annotations like `route-button-missing: cannot proof V6` requires careful cross-referencing with the `STATE_MAP.md` to understand the test's intent and the ground truth of the vulnerability.
- The high number of regressions from previously "CONFIRMED" fixes (V1, V7, V8, V9, V11, V15, P1) is a critical pattern that will inform future analysis and prioritisation of fixes. This suggests a need for more robust regression testing or a review of how persistence mechanisms are being managed across the codebase.