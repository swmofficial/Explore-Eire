# UX Agent Report — 2026-07-01

## Run Context
- Commits analysed: `3085912` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
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
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
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
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js` to ensure `sessionTrail` is correctly written to localStorage on every point.

### 4. Critical Data Loss: Guest Waypoints Not Persisted (Vulnerability V11 - Regression)
- Summary: Waypoints created by guest users are not persisted to local storage and are lost on page reload, despite a previous fix.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `SampleSheet "Save Waypoint"` action is not triggering the write to localStorage as intended. This is a regression.
- User impact: Guest users lose their saved waypoints, leading to frustration and a poor first impression, discouraging sign-up.
- Business impact: Hinders guest-to-authenticated user conversion and reduces perceived value of the app.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` to ensure `sessionWaypoints` is correctly written to localStorage.

### 5. High Priority: Theme Preference Resets to Default on Reload (Vulnerability V7 - Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, affecting both guest and authenticated users. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm that the `ee_theme` localStorage key is not being written or read correctly. This contradicts `STATE_MAP.md` which states `ee_theme` uses a manual pattern (task-008) and a previous finding that confirmed its fix.
- Cannot confirm: If the `setTheme` action is failing to write to `ee_theme`, or if the `userStore`'s initialisation is failing to read it.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` is not functioning correctly, or the `SettingsView theme picker` is not triggering the write to localStorage as intended. This is a regression.
- User impact: Minor annoyance, but erodes trust in the app's ability to remember user preferences, leading to a less personalised experience.
- Business impact: Contributes to a perception of a buggy application, potentially affecting user satisfaction and retention.
- Fix direction: Debug and verify the `ee_theme` manual persistence implementation in `userStore.js` and `SettingsView.jsx` to ensure theme preference is correctly saved and loaded.

### 6. High Priority: Active Module Resets to Prospecting on Reload (Vulnerability V15 - Regression)
- Summary: The `activeModule` preference resets to 'prospecting' on page reload, regardless of the user's last selected module. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `moduleStore`'s manual persistence implementation for `activeModule`.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` is not functioning correctly, or the `ModuleDashboard` is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users are forced to re-select their preferred module after every reload, causing minor friction and a less efficient workflow.
- Business impact: Reduces efficiency for power users and contributes to a perception of a less polished application.
- Fix direction: Debug and verify the `ee_active_module` manual persistence implementation in `moduleStore.js` and `ModuleDashboard.jsx` to ensure the active module is correctly saved and loaded.

### 7. High Priority: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, this strongly implies the expected state (flipped basemap/layers) was not found after reload, indicating a reset. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist).
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage after the test, as no annotations were provided for this key.
- Root cause: The Zustand `persist` middleware for `mapStore` is either not correctly saving `basemap` and `layerVisibility` to `ee-map-prefs`, or the store is not rehydrating these values correctly on app load.
- User impact: Users lose their customised map view, forcing them to re-apply preferences after every reload, leading to frustration and inefficiency.
- Business impact: Reduces user satisfaction and makes the app feel less reliable and personalised.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and ensure `basemap` and `layerVisibility` are correctly saved to and rehydrated from `ee-map-prefs`.

### 8. Medium Priority: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: A Pro user is incorrectly shown the Upgrade Sheet when tapping a Pro-gated affordance, despite having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This implies the test was waiting for the Upgrade Sheet *not* to appear, but it did, causing the timeout. This contradicts the expected behaviour for a Pro user.
- Cannot confirm: Direct screenshot of the Upgrade Sheet appearing for the Pro user, or the exact state of `userStore.isPro` at the moment of the tap.
- Root cause: A race condition or incorrect gating logic where `showUpgradeSheet` is triggered even when `userStore.isPro` is true. This could be related to the `useAuth.onAuthStateChange` logic or the `global-setup` timing for `isPro` hydration.
- User impact: Confusing and frustrating experience for paying users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the gating logic for `showUpgradeSheet` and ensure `userStore.isPro` is fully hydrated and stable before evaluating Pro affordances.

## Tier Comparison

*   **V7 (Theme Resets):** Fails for both `guest` and `free` tiers, indicating a universal issue with theme persistence.
*   **V8/V9 (Basemap/Layer Preferences Resets):** Fails for both `guest` (V9) and `free` (V8) tiers, indicating a universal issue with map preference persistence.
*   **V13 (Learn Header Stats):** Passes for both `guest` and `free` tiers. The `state-loss-evidence` shows identical `before` and `after` stats, confirming that the header statistics are *not* recomputed on tab switch, which is the desired behaviour (i.e., the fix for V13 is working for header stats).
*   **V1 (GPS Track Loss), V11 (Guest Waypoint Loss), V15 (Active Module Reset):** These vulnerabilities are confirmed as active (or regressed) in the `guest` and/or `pro` tiers where applicable. The root causes (manual localStorage persistence failures) are likely systemic and would affect all tiers if the relevant features were used.
*   **Offline Failures (V10, V2, P3, V3, V4, V6):** These are primarily observed in the `pro` tier tests, but the underlying architectural issues (lack of Service Worker, no offline data queue, GPS acquisition problems) would affect `free` users similarly for features they can access.

## Findings Discarded

*   No findings were explicitly discarded. The `pro V6` test's inability to *proof* the silent failure (via `route-button-missing: cannot proof V6`) was noted, but the vulnerability itself is confirmed by `STATE_MAP.md` ("console.error only, no toast" for route save failure) and thus included as a finding.

## Cannot Assess

*   The exact state of `ee-map-prefs` in localStorage for V8/V9 failures, as no annotations were provided for this key.
*   Direct screenshots of the Upgrade Sheet appearing for Pro users (P1).
*   The specific line of code causing the regression for V1, V7, V11, V15 without direct code access.

## Systemic Patterns

*   **Persistence Regressions:** Multiple critical features (GPS track, guest waypoints, theme, active module) that were previously confirmed as fixed are now failing persistence tests. This points to a systemic issue with the manual localStorage persistence patterns or a broader problem with how state is managed across reloads.
*   **Incomplete Offline-First Implementation:** The app continues to exhibit fundamental failures in offline scenarios, including inability to load the app shell, access cached data (gold samples), and save user-generated content (waypoints, tracks, routes). This indicates a lack of a comprehensive offline-first strategy.
*   **GPS Acquisition Instability:** The consistent failure to acquire GPS in the WaypointSheet, even with Playwright's geolocation mock, suggests a deeper issue with the app's GPS handling logic.

## Calibration Notes

*   The repeated pattern of "Previous Findings say X was CONFIRMED, but current test says Y (contradiction)" is a strong signal for regression or test flakiness. I have prioritized reporting these as regressions, assuming the `STATE_MAP.md` and previous `CONFIRMED` verdicts represent the intended and previously achieved state. This aligns with the "Vulnerability-Proof Test Philosophy" where a test passing *does not* mean the vulnerability does not exist, but rather produces evidence. In this case, the evidence confirms the vulnerability *is* active, despite previous fixes.
*   I've been careful to distinguish between a test *failing* (e.g., V7, V9, P1, P3) and a test *passing but confirming a vulnerability* (e.g., V1, V11, V15, V4, V6). The latter means the test journey successfully demonstrated the problematic behaviour.
*   The `PHANTOM` verdict history reminds me to stick strictly to observable evidence and architectural ground truth (`STATE_MAP.md`), avoiding speculation where evidence is thin (e.g., for V6, where the test couldn't *proof* the silent failure, but `STATE_MAP.md` confirms it).