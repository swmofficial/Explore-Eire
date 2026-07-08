# UX Agent Report — 2026-07-08

## Run Context
- Commits analysed: `4f68ffd` (latest) and 19 preceding commits.
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
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
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

### 3. Critical: Free User Bypasses Upgrade Gate for Waypoints (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet instead of being prompted to upgrade to a Pro subscription, undermining the freemium model.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly confirms the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: If the free user can actually *save* the waypoint, or just open the form. However, opening the form for a premium feature is a gating failure.
- Root cause: The conditional logic for the camera button (or waypoint creation flow) is flawed, allowing free users to access the `WaypointSheet` directly instead of triggering the `UpgradeSheet`.
- User impact: Free users gain access to a premium feature without upgrading, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, undermining the app's revenue model and feature differentiation.
- Fix direction: Correct the conditional rendering or routing logic for the camera button to ensure free users are directed to the `UpgradeSheet` when attempting to create a waypoint.

### 4. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1 - Regression)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability.
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `sessionTrail` via `ee_session_trail` (task-006) is not functioning correctly, leading to `sessionTrail` data being lost on reload. This contradicts `STATE_MAP.md` and is a regression.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature like tracking.
- Fix direction: Debug the `useTracks` hook and `mapStore`'s `appendSessionTrailPoint` to ensure `ee_session_trail` is consistently updated in `localStorage` during active tracking.

### 5. Major Regression: Theme Preference Resets on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light' or 'dark') is not persisted across page reloads, reverting to the default theme. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest, Free (likely Pro)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` localStorage key is not being set or read.
- Cannot confirm: The specific code error preventing the `ee_theme` key from being written or read.
- Root cause: The manual `IIFE + write` pattern for `userStore.theme` via `ee_theme` (task-008) is not correctly writing or reading the theme preference to/from `localStorage`. This contradicts `STATE_MAP.md` and is a regression.
- User impact: Users' chosen theme preference is lost on every app reload, requiring manual re-selection and creating a jarring experience.
- Business impact: Minor annoyance, but contributes to a perception of an unreliable or unpolished app, impacting user satisfaction.
- Fix direction: Debug the `userStore`'s `setTheme` action and initialisation to ensure `ee_theme` is correctly written and read from `localStorage`.

### 6. Major Regression: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are not persisted to local storage and are lost upon page reload. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the vulnerability.
- Cannot confirm: The specific code error preventing the `ee_guest_waypoints` key from being written or read.
- Root cause: The manual `IIFE + write` pattern for `sessionWaypoints` via `ee_guest_waypoints` (task-002) is not functioning correctly, leading to guest waypoint data being lost on reload. This contradicts `STATE_MAP.md` and is a regression.
- User impact: Guest users lose any waypoints they create during a session if the app is reloaded, making the feature unreliable and discouraging engagement.
- Business impact: Hinders guest user engagement and conversion to authenticated users if their initial data is not preserved.
- Fix direction: Debug `mapStore`'s `sessionWaypoints` logic to ensure `ee_guest_waypoints` is consistently updated in `localStorage`.

### 7. Major Regression: Active Module Resets on Reload (Vulnerability V15)
- Summary: The user's last active module preference (e.g., 'prospecting') is not persisted across page reloads, reverting to the default module. This is a regression from a previously confirmed fix.
- Tier(s) affected: Guest (likely Free, Pro)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms the vulnerability.
- Cannot confirm: The specific code error preventing the `ee_active_module` key from being written or read.
- Root cause: The manual `IIFE + write` pattern for `moduleStore.activeModule` via `ee_active_module` (task-013) is not functioning correctly, leading to the active module preference being lost on reload. This contradicts `STATE_MAP.md` and is a regression.
- User impact: Users' preferred module is not remembered, requiring manual re-selection after every reload.
- Business impact: Minor annoyance, but contributes to a perception of an unreliable app.
- Fix direction: Debug `moduleStore`'s `setActiveModule` action and initialisation to ensure `ee_active_module` is correctly written and read from `localStorage`.

### 8. Major Regression: Map Layer and Basemap Preferences Reset on Reload (Vulnerability V8, V9)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to their default states. This is a regression.
- Tier(s) affected: Guest (basemap), Free (layers) (likely Pro)
- Confidence: HIGH
- Evidence: `guest V9` (basemap) and `free V8` (layers) both failed with `Test timeout of 60000ms exceeded`. This indicates the expected state (flipped basemap/layer visibility) was not found after reload, implying the preferences were not restored.
- Cannot confirm: The exact state of the `ee-map-prefs` localStorage key due to the timeout.
- Root cause: The `mapStore`'s Zustand `persist` middleware configuration for `basemap` and `layerVisibility` (key: `ee-map-prefs`) is not correctly saving or restoring these preferences. This contradicts `STATE_MAP.md` and is a regression.
- User impact: Users' customised map view settings are lost on every app reload, requiring manual re-selection and leading to a less efficient workflow.
- Business impact: Annoyance for users who rely on specific map configurations, potentially impacting productivity and satisfaction.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly saving and restoring `basemap` and `layerVisibility`.

## Tier Comparison
- **Offline App Load (V10, V2):** Confirmed for Pro. Likely affects Free as well, as both require authentication. Guest users might load partially, but critical data like `gold_samples` would still be missing.
- **Waypoint Save/GPS Issue (P3, V3, V14):** Confirmed for Pro. The underlying GPS acquisition issue is universal and would affect any tier attempting to save a waypoint.
- **Free User Waypoint Gating (F3):** Specific to the Free tier, where users should be prompted to upgrade.
- **GPS Track Loss (V1):** Confirmed for Pro. Affects all tiers that can track (Free, Pro).
- **Theme Reset (V7):** Confirmed for Guest and Free. Likely affects Pro as well, as `userStore.theme` is a global preference.
- **Guest Waypoints Lost (V11):** Specific to the Guest tier.
- **Active Module Reset (V15):** Confirmed for Guest. Likely affects Free and Pro as well, as `moduleStore.activeModule` is a global preference.
- **Map Preferences Reset (V8, V9):** Basemap (V9) confirmed for Guest. Layer visibility (V8) confirmed for Free. Both likely affect all tiers, as `mapStore` preferences are global.
- **Learn Tab State (V13, F4):** The fix for V13 (preserving component state) appears to be working across Guest and Free tiers, as indicated by passing tests and identical header stats before/after tab switches. This behaviour is consistent across tiers.
- **PRO Badges (F2):** Free users correctly see PRO badges on gated features in the LayerPanel. This is expected and consistent.

## Findings Discarded
- `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: Discarded due to timeout. A timeout does not provide clear evidence of the UpgradeSheet appearing or not. It could be test flakiness or an app hang, rather than a direct failure of the gating logic. Given the other critical and clearly evidenced issues, this is lower priority for now.

## Cannot Assess
- The exact reason for the `Test timeout of 60000ms exceeded` for `guest V9`, `free V8`, and `pro P1`. While indicative of a problem, the specific root cause (e.g., app hung, element not found, or actual state not matching) is not directly evident from the timeout alone without further logs or screenshots at the point of failure. However, for V8/V9, the architectural map points to `mapStore` persistence, making it highly probable.

## Systemic Patterns
- **Widespread Persistence Regressions:** A significant number of previously fixed persistence vulnerabilities (V1, V7, V8, V9, V11, V15) have reappeared. This indicates a systemic issue with how `localStorage` is being managed, both for Zustand's `persist` middleware and the manual `IIFE + write` patterns. It suggests either the persistence mechanisms themselves are failing, or the tests that confirmed their fixes were insufficient or have become outdated.
- **Offline Unusability:** The app remains fundamentally unusable offline for authenticated users, indicating a lack of core Service Worker caching for the app shell and initial data.
- **GPS Integration Issues:** The GPS acquisition logic appears to be failing, leading to disabled functionality (waypoint saving). This suggests a problem with the `useTracks` hook or its interaction with the browser's geolocation API/mock.
- **Gating Logic Flaws:** A critical business logic flaw allows free users to bypass an upgrade gate for a premium feature.

## Calibration Notes
- The new test philosophy (tests are journeys, passing means evidence produced) is crucial. `guest V11`, `guest V15`, and `pro V1` are examples where a "PASS" actually confirms a vulnerability, requiring careful reading of annotations.
- The recurring nature of persistence issues (V1, V7, V8, V9, V11, V15) despite previous "CONFIRMED" fixes suggests that the fixes were either incomplete, fragile, or have been regressed by subsequent changes. This highlights the need for more robust, end-to-end persistence tests that verify the actual `localStorage` content.
- The `page.goto: net::ERR_INTERNET_DISCONNECTED` errors are clear and directly confirm the offline loading vulnerability, reinforcing its high priority.
- The GPS acquisition issue (P3/V3) is a recurring critical problem, reinforcing its high priority.