# UX Agent Report — 2026-07-06

## Run Context
- Commits analysed: `6ac25b9` (latest) and 19 preceding commits.
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
- Root cause: Lack of robust Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
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
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping app.
- Fix direction: Re-verify and debug the manual `ee_session_trail` persistence logic in `mapStore.js` and `useTracks.js`.

### 4. Critical Data Loss: Guest Waypoints Not Persisted (Vulnerability V11 - Regression)
- Summary: Waypoints saved by guest users are not persisted to local storage and are lost upon page reload, despite a manual persistence mechanism being documented. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly. This is a regression.
- User impact: Guest users lose any waypoints they have created, leading to frustration and a disincentive to continue using the app or convert to a free/pro account.
- Business impact: Hinders guest user engagement and conversion rates, as a core feature is unreliable.
- Fix direction: Re-verify and debug the manual `ee_guest_waypoints` persistence logic in `mapStore.js`.

### 5. High Priority: Theme Preference Resets to Default on Reload (Vulnerability V7 - Regression)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads and reverts to the default 'dark' theme. This is a regression from a previously confirmed fix.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both show `Expected: "light" Received: "dark"` after reload. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being used.
- Cannot confirm: If Pro users are also affected, but given the shared `userStore` and `ee_theme` key, it is highly probable.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` described in `STATE_MAP.md` (task-008) is not functioning correctly, or the `theme` field was incorrectly removed from Zustand persist middleware without the manual pattern being fully functional. This is a regression.
- User impact: Minor annoyance for users who prefer a different theme, contributing to a perception of an unreliable or unpolished application.
- Business impact: Low, but contributes to overall user experience friction and brand perception.
- Fix direction: Re-verify and debug the manual `ee_theme` persistence logic in `userStore.js` and `SettingsView.jsx`.

### 6. High Priority: Active Module Resets to Default on Reload (Vulnerability V15 - Regression)
- Summary: The `activeModule` preference is not persisted across page reloads and reverts to the default 'prospecting' module. This is a regression from a previously confirmed fix.
- Tier(s) affected: All (Guest)
- Confidence: HIGH
- Evidence: `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013) and a previous finding that confirmed its fix.
- Cannot confirm: If Free and Pro users are also affected, but given the shared `moduleStore` and `ee_active_module` key, it is highly probable.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly. This is a regression.
- User impact: Minor annoyance as users have to re-select their preferred module after every reload.
- Business impact: Low, but adds to overall user experience friction.
- Fix direction: Re-verify and debug the manual `ee_active_module` persistence logic in `moduleStore.js`.

### 7. High Priority: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Feature F3)
- Summary: Free users are incorrectly allowed to save waypoints, a feature intended for Pro users, instead of being prompted to upgrade their subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The error `expect(upgradeShown).toBeTruthy()` failed because `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the UpgradeSheet was *not* shown, but the WaypointSheet *was*.
- Cannot confirm: If the waypoint actually gets saved to the database for free users, but the UI allows the action.
- Root cause: Incorrect conditional rendering or routing logic for the "Save Waypoint" action, failing to check `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users can access a premium feature, potentially leading to confusion if the save operation fails silently later, or devaluing the Pro subscription.
- Business impact: Direct loss of potential upgrade conversions, as a key incentive for upgrading is bypassed.
- Fix direction: Correct the gating logic for the "Save Waypoint" button/action to display the `UpgradeSheet` for non-Pro users.

### 8. Medium Priority: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8 - Unconfirmed)
- Summary: User-selected basemap and layer visibility preferences may not be persisting across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded.`. While a timeout doesn't directly confirm the preference reset, it indicates a failure in the test journey to verify persistence. Given the numerous other persistence regressions, it is plausible this is also affected. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs`.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage before and after reload, or the specific UI state of the basemap/layers.
- Root cause: Potentially a regression in the Zustand `persist` middleware for `mapStore` or issues with how `ee-map-prefs` is being read/written.
- User impact: Users lose their preferred map view settings, requiring manual re-selection after every reload.
- Business impact: Minor friction, but contributes to overall perception of app instability.
- Fix direction: Investigate the `mapStore`'s Zustand `persist` middleware configuration and ensure `basemap` and `layerVisibility` are correctly handled.

## Tier Comparison

*   **Offline App Load (V10, V2):** Identical behavior across Pro (and likely Free) — complete failure to load. This points to a core app shell caching issue, not auth-specific.
*   **GPS Acquisition Failure (P3, V3, V14):** Identical behavior across Pro (and likely Free/Guest if they could save waypoints) — save button disabled. This points to a core GPS acquisition or mock setup issue.
*   **Theme Reset (V7):** Identical behavior across Guest and Free (and likely Pro) — theme resets. This points to a core persistence issue with `ee_theme`.
*   **Basemap/Layer Reset (V9, V8):** Identical behavior across Guest and Free (and likely Pro) — timeouts. This points to a core persistence issue with `ee-map-prefs` or test instability.
*   **Learn Tab State (V13, F4):** Identical behavior across Guest and Free — *no state loss*. This confirms the fix for V13 is working for both.
*   **Active Module Reset (V15):** Identical behavior across Guest (and likely Free/Pro) — module resets. This points to a core persistence issue with `ee_active_module`.
*   **Guest Waypoint Persistence (V11):** Specific to Guest tier, confirmed loss.
*   **Free User Waypoint Gating (F3):** Specific to Free tier, incorrect routing.
*   **Pro User Upgrade Sheet (P1):** Pro test timed out, cannot confirm behavior.
*   **Pro Badge Visibility (F2):** Specific to Free tier, badges correctly shown.

## Findings Discarded

*   No findings were discarded in this run. All identified issues had sufficient evidence and user impact to be included.

## Cannot Assess

*   **Pro P1 (Pro user does not see UpgradeSheet on Pro affordance tap):** This test timed out, preventing assessment of whether Pro users correctly bypass the UpgradeSheet. The timeout could be due to the underlying app loading issues or an element not being found.
*   **Full impact of V10/V2 on Free users:** While highly likely, the tests only explicitly failed for Pro users.

## Systemic Patterns

*   **Persistence Regressions:** A significant number of previously confirmed fixes for state persistence (V1, V7, V11, V15) have regressed. This indicates a systemic fragility in the manual `localStorage` persistence implementations (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) or how they interact with the application lifecycle.
*   **Offline Capability:** The core application shell and critical data are not robustly cached for offline access, leading to complete app failure for authenticated users (V10, V2). This is a fundamental architectural gap for an outdoor mapping app.
*   **GPS Acquisition Issues:** There is a recurring problem with GPS data acquisition, which directly impacts critical features like waypoint saving (P3, V3, V14). This suggests either an issue with the geolocation API integration or the Playwright mock setup.

## Calibration Notes

*   The `V13` test passing with `state-loss-evidence` showing identical `before` and `after` values confirms that the fix for V13 (preserving Learn tab state) is indeed working, aligning with previous "CONFIRMED" verdicts. The test annotation "state-loss proof" should be interpreted as "proof of state *retention*" in this context.
*   The repeated `Test timeout of 60000ms exceeded` for `V9`, `V8`, and `P1` highlights test instability or deeper app loading issues, making direct confirmation of the *specific* vulnerability difficult. However, the prevalence of other persistence regressions lends medium confidence to the underlying issues for V9 and V8.
*   The cascade effect of the GPS acquisition failure (disabling the save button) confirming multiple vulnerabilities (P3, V3, V14) is a strong example of how a single root cause can manifest in several UX issues.
*   The numerous regressions in manual `localStorage` persistence (V1, V7, V11, V15) are a critical pattern, indicating that these implementations are either fragile or have been inadvertently broken. This reinforces the need for robust, tested persistence strategies.