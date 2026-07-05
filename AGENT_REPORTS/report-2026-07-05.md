# UX Agent Report — 2026-07-05

## Run Context
- Commits analysed: `00e8e49` (latest) and 19 preceding commits.
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
- Business impact: Severe damage to user trust and retention, especially for a core feature for prospectors.
- Fix direction: Re-verify and fix the manual localStorage persistence for `sessionTrail` in `mapStore.js` and `useTracks.js`.

### 4. Business Critical: Free Users Bypass Upgrade Gate for Waypoints (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet when tapping the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was not shown, but the waypoint sheet was. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the waypoint save would then fail (it likely would, given P3/V3 issues).
- Root cause: The logic gating access to the `WaypointSheet` for free users is flawed, allowing them to proceed without an upgrade prompt. This likely involves `userStore.isPro` or `userStore.subscriptionStatus` not being correctly checked before showing the sheet.
- User impact: Free users might be confused or frustrated if they fill out the form only to find they cannot save, or if they expect an upgrade prompt and don't get one.
- Business impact: Direct loss of potential Pro conversions, as a key upgrade incentive is bypassed.
- Fix direction: Correct the conditional rendering or routing logic for the camera button tap to ensure free users are directed to the `UpgradeSheet` before accessing the `WaypointSheet`.

### 5. Preference Loss: Theme Resets on Reload (Vulnerability V7 - Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, requiring users to re-select their preference every time. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest, Free (likely Pro as well)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Both tests show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the manual `localStorage` key `ee_theme` is not being written or read correctly. `STATE_MAP.md` states `ee_theme` is a manual localStorage key for `userStore.theme` (task-008).
- Cannot confirm: If Pro users are also affected, but the root cause (failure to write/read `ee_theme`) suggests it would be universal.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` described in `STATE_MAP.md` is not functioning correctly, or the `setTheme` action is not triggering the write to localStorage as intended. This is a regression.
- User impact: Minor annoyance, as users have to re-apply their theme preference on every app load.
- Business impact: Degrades user experience, potentially leading to a perception of an unpolished or buggy application.
- Fix direction: Re-verify and fix the manual localStorage persistence for `userStore.theme` (key `ee_theme`) in `userStore.js` and `SettingsView.jsx`.

### 6. Preference Loss: Basemap and Layer Visibility Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for basemap selection and layer visibility reset to their default states upon page reload.
- Tier(s) affected: Guest, Free (likely Pro as well)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, this typically indicates the test could not find the expected state after reload, implying a reset. `STATE_MAP.md` states `mapStore.basemap` and `mapStore.layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state after reload due to the timeout, but the vulnerability description and common behavior for non-persisted state strongly suggest a reset.
- Root cause: The `persist` middleware for `mapStore` (key `ee-map-prefs`) is either not correctly configured, or the fields `basemap` and `layerVisibility` are not being correctly included in the `partialize` function, or there's an issue with `localStorage` access.
- User impact: Users have to re-select their preferred basemap and re-enable desired layers on every app load, leading to minor frustration.
- Business impact: Degrades user experience, especially for power users who customize their map view, potentially reducing engagement.
- Fix direction: Investigate `mapStore.js`'s Zustand `persist` configuration, specifically the `partialize` function, to ensure `basemap` and `layerVisibility` are correctly saved and rehydrated.

### 7. Data Loss: Guest Waypoints Not Persisted (Vulnerability V11 - Regression)
- Summary: Waypoints created by guest users are not persisted to local storage and are lost upon page reload. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The exact point of failure in the `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `SampleSheet "Save Waypoint"` action is not triggering the write to localStorage as intended. This is a regression.
- User impact: Guest users lose any waypoints they create, leading to frustration and a poor first impression of the app's reliability.
- Business impact: Reduces the value proposition for guest users, potentially hindering conversion to free or paid tiers.
- Fix direction: Re-verify and fix the manual localStorage persistence for `sessionWaypoints` (key `ee_guest_waypoints`) in `mapStore.js` and `SampleSheet.jsx`.

### 8. Preference Loss: Active Module Resets on Reload (Vulnerability V15 - Regression)
- Summary: The user's selected active module (e.g., 'prospecting') resets to its default state upon page reload. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The exact point of failure in the `moduleStore`'s manual persistence implementation for `activeModule`.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly, or the `ModuleDashboard` action is not triggering the write to localStorage as intended. This is a regression.
- User impact: Minor annoyance, as users have to re-select their active module on every app load.
- Business impact: Degrades user experience, especially for users who frequently switch modules or rely on a specific module for their workflow.
- Fix direction: Re-verify and fix the manual localStorage persistence for `moduleStore.activeModule` (key `ee_active_module`) in `moduleStore.js` and `ModuleDashboard.jsx`.

## Tier Comparison
- **Offline App Load (V10, V2):** Fails for Pro, preventing app load. The underlying issue (lack of Service Worker caching) would affect all tiers, though guest tests do not explicitly cover this.
- **Waypoint Save Button Disabled (P3, V3, V14):** Fails for Pro due to GPS acquisition issues. This underlying problem likely affects all tiers attempting to save waypoints.
- **GPS Track Loss (V1):** Confirmed for Pro. The root cause (persistence failure) would affect all tiers using tracking.
- **Theme Resets (V7):** Fails for Guest and Free. The root cause (manual persistence failure) would affect all tiers.
- **Basemap/Layer Resets (V9, V8):** Fails for Guest and Free (timeouts). The root cause (Zustand persist failure) would affect all tiers.
- **Guest Waypoint Loss (V11):** Confirmed for Guest. This vulnerability is specific to unauthenticated users.
- **Active Module Resets (V15):** Confirmed for Guest. The root cause (manual persistence failure) would affect all tiers.
- **Learn Header Stats (V13, F4):** Passes for Guest and Free, showing identical stats before/after tab switch. This indicates the previous fix for V13 (preserving component state) is holding, and data consistency is maintained across these tiers.
- **PRO Badges (F2):** Free users correctly see PRO badges, which is expected behavior for encouraging upgrades.

## Findings Discarded
- `pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap): Discarded. The `Test timeout` is ambiguous and does not provide clear evidence of a regression (e.g., a screenshot showing the UpgradeSheet). It's possible the GPS acquisition issue (Finding 2) prevented the test from completing its assertions. Confidence is too low to include in the top 8.

## Cannot Assess
- The exact state of `mapStore.basemap` and `mapStore.layerVisibility` after reload for `guest V9` and `free V8` due to test timeouts. While a reset is highly probable, direct evidence of the reset value is missing.
- The behavior of `isPro` status reverting to 'free' on offline reload (V10) because the app fails to load entirely, preventing the check.

## Systemic Patterns
-   **Persistence Failures (Regressions):** Multiple critical regressions in persistence mechanisms (`V1`, `V7`, `V11`, `V15`). The `STATE_MAP.md` explicitly states these should be persisted (either via Zustand `persist` or manual `IIFE + write` patterns), but tests confirm they are not. This indicates a systemic issue with how persistence is implemented or maintained, possibly due to recent refactoring or incorrect application of the patterns.
-   **Offline Capability Gaps:** The app fundamentally fails to load offline for authenticated users (`V10`, `V2`), and core actions like saving waypoints (`V3`) and tracks (`V4`) fail without a robust offline queue. This highlights a severe lack of adherence to offline-first design principles.
-   **GPS Acquisition Issues:** A recurring problem where the app struggles to acquire GPS, leading to disabled functionality (`P3`, `V3`). This suggests either a problem with the `useTracks` hook, `mapStore.userLocation` updates, or Playwright's geolocation mock setup.

## Calibration Notes
-   Prioritized findings with direct evidence of data loss or app unavailability (V10, V2, P3, V3, V1, V11) as per previous CONFIRMED verdicts on data safety and offline-first principles.
-   Treated `Test timeout` for preference resets (V9, V8) as MEDIUM confidence, inferring a reset, rather than PHANTOM, as these are known vulnerabilities and timeouts often occur when expected elements (reflecting persisted state) are not found.
-   Carefully distinguished between "data loss" (e.g., V1, V11) and "component state loss" (e.g., V13). The V13 tests passing with identical `state-loss-evidence` values, combined with the previous fix, indicates the *data* is consistent and the *component state* loss (e.g. scroll position) is likely resolved.
-   Noted contradictions between `STATE_MAP.md` and test results for V1, V11, V15, V7. Trusting the test results as direct evidence of current behavior, which suggests `STATE_MAP.md` might be out of sync with the current codebase for these specific persistence mechanisms.