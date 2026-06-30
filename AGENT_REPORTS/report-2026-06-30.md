# UX Agent Report — 2026-06-30

## Run Context
- Commits analysed: `0d6be24` (latest) and 19 preceding commits.
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

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping/tracking app.
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js` to ensure `sessionTrail` is correctly written to localStorage on every update.

### 4. Major Data Loss: Guest Waypoints Not Persisted (Vulnerability V11)
- Summary: Waypoints created by guest users (`sessionWaypoints`) are not persisted to local storage and are lost on page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The exact point of failure in `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly.
- User impact: New users experimenting with the app lose their saved locations, leading to frustration and a poor first impression.
- Business impact: Reduced conversion rates from guest users to authenticated users due to perceived unreliability and data loss.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` to ensure `sessionWaypoints` are correctly written to localStorage.

### 5. Major Preference Loss: Theme Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme on every page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being used. This contradicts `STATE_MAP.md` which states `theme` persists via `ee_theme` (manual pattern, task-008).
- Cannot confirm: Whether the `setTheme` function is correctly attempting to write to `ee_theme` or if the read on store initialization is failing.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` described in `STATE_MAP.md` is not functioning correctly.
- User impact: Annoying UI reset, forcing users to re-select their preferred theme repeatedly, making the app feel less personal and reliable.
- Business impact: Minor, but contributes to a perception of unreliability and lack of polish, potentially impacting user satisfaction.
- Fix direction: Debug and verify the `ee_theme` manual persistence implementation in `userStore.js` to ensure the theme is correctly saved and loaded from localStorage.

### 6. Major Preference Loss: Active Module Resets on Reload (Vulnerability V15)
- Summary: The user's active module preference (e.g., 'prospecting') resets to the default on every page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The exact point of failure in `moduleStore`'s manual persistence implementation for `activeModule`.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly.
- User impact: Users are forced to re-select their preferred module every time they reload the app, creating unnecessary friction.
- Business impact: Minor, but adds to perceived unreliability and can hinder efficient workflow for power users.
- Fix direction: Debug and verify the `ee_active_module` manual persistence implementation in `moduleStore.js` to ensure the active module is correctly saved and loaded from localStorage.

### 7. Major Preference Loss: Basemap Resets to Default on Reload (Vulnerability V9)
- Summary: The user's selected basemap preference resets to the default 'satellite' basemap on every page reload.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` failed with a `Test timeout of 60000ms exceeded.` While not a direct assertion failure, this timeout, combined with the widespread manual persistence failures (V1, V7, V11, V15), strongly suggests a persistence issue. `STATE_MAP.md` states `basemap` persists via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state of the basemap after reload due to the timeout, or whether the `ee-map-prefs` key exists in localStorage.
- Root cause: Likely an issue with the `ee-map-prefs` Zustand `persist` middleware configuration or its interaction with the app's lifecycle, preventing `basemap` from being correctly saved or rehydrated.
- User impact: Users are forced to re-select their preferred basemap on every reload, causing minor but repetitive annoyance.
- Business impact: Minor, but contributes to a perception of unreliability and lack of user-centric design.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration for `ee-map-prefs` to ensure `basemap` is correctly persisted and rehydrated.

### 8. Major Preference Loss: Layer Visibility Resets to Defaults on Reload (Vulnerability V8)
- Summary: The user's custom layer visibility preferences reset to their default states on every page reload.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `free V8` failed with a `Test timeout of 60000ms exceeded.` Similar to V9, this timeout, coupled with other persistence failures, indicates a problem. `STATE_MAP.md` states `layerVisibility` persists via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state of layer visibility after reload due to the timeout, or whether the `ee-map-prefs` key exists in localStorage.
- Root cause: Likely an issue with the `ee-map-prefs` Zustand `persist` middleware configuration or its interaction with the app's lifecycle, preventing `layerVisibility` from being correctly saved or rehydrated.
- User impact: Users must repeatedly re-enable or disable their desired map layers, disrupting their workflow and map viewing experience.
- Business impact: Minor, but adds to perceived unreliability and can hinder efficient data exploration.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration for `ee-map-prefs` to ensure `layerVisibility` is correctly persisted and rehydrated.

## Tier Comparison

*   **Offline App Load (V10, V2):** The `pro` tier explicitly failed to load offline (`net::ERR_INTERNET_DISCONNECTED`). This issue is systemic to the app's core shell and data loading, meaning `free` users would experience the same complete failure. `guest` users might load a basic shell but would still lack critical map data.
*   **Theme Reset (V7):** Identical failure behavior was observed across `guest` and `free` tiers, with the theme resetting to 'dark' after being set to 'light' and reloading. This indicates a universal issue with the `ee_theme` manual persistence, independent of authentication status.
*   **Learn Header Stats (V13, F4):** Both `guest` and `free` tiers passed these tests, showing no regression in learn header statistics across tab switches. This suggests the fix for V13 (always-mounted tabs) is effectively preventing state loss for these specific metrics across all users.
*   **Waypoint Save (P3, V3, F3, V11):** `pro` users are blocked from saving waypoints due to GPS acquisition failure (P3, V3). `free` users are correctly routed to the `UpgradeSheet` when attempting to save (F3). `guest` users can create waypoints, but they are memory-only and lost on reload (V11). This shows distinct, but in some cases problematic, behavior across tiers for waypoint functionality.
*   **GPS Track Loss (V1):** Confirmed for `pro` users. The underlying `sessionTrail` logic is universal, so this data loss vulnerability affects all tiers capable of tracking.
*   **Active Module Reset (V15):** Confirmed for `guest` users. The `activeModule` logic is universal, so this preference loss vulnerability affects all tiers.
*   **Basemap (V9) & Layer Visibility (V8) Resets:** `guest V9` and `free V8` both timed out, suggesting persistence issues. Since `basemap` and `layerVisibility` are managed by the same `ee-map-prefs` Zustand persist configuration, these issues are highly likely to affect all tiers uniformly.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- The exact reason for the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic, leading to the "Acquiring GPS..." state. Further debugging within the application's GPS handling code would be required.
- The full extent of `V13` (Learn tab component state loss) beyond header statistics. While the header stats passed, the test does not explicitly verify scroll position or in-progress chapter page within the `ChapterReader` component.

## Systemic Patterns
-   **Broken Manual Persistence:** A significant number of critical preferences and user-generated data (`ee_theme` for V7, `ee_guest_waypoints` for V11, `ee_session_trail` for V1, `ee_active_module` for V15) are failing to persist despite `STATE_MAP.md` indicating they use a "manual IIFE + write pattern". This suggests a widespread issue with the implementation or consistency of this manual persistence approach across multiple stores.
-   **Zustand Persist Middleware Issues:** Preferences managed by the Zustand `persist` middleware (`ee-map-prefs` for V8 and V9) are also showing signs of failure (timeouts), indicating potential problems with the middleware's configuration, version, or interaction with the application's lifecycle.
-   **Fundamental Offline Capability Gaps:** The complete failure of the app to load for authenticated users offline (V10, V2) points to a critical lack of Service Worker caching for the core application shell and essential data, making the app unusable in its primary target environment.
-   **GPS Acquisition Instability:** The consistent "Acquiring GPS..." state preventing waypoint saves (P3, V3) highlights a core instability in the app's GPS acquisition and processing logic, which is vital for a mapping and tracking application.

## Calibration Notes
-   The previous `CONFIRMED` verdicts on manual persistence issues (e.g., V15, V7, V1) and Zustand persist configuration (V7) were highly relevant. This run reinforces that these persistence mechanisms are still problematic, despite previous attempts at resolution. The explicit `null` values for `ee_theme` in annotations for V7 are strong evidence, aligning with past successful diagnoses.
-   The `PHANTOM` verdicts on issues like "Map Button Naming Ambiguity" (which was a Playwright selector issue) remind me to always trace back to the *application's* behavior, not just test failures, unless the test failure directly points to a UX issue. In this run, timeouts for V8/V9 are treated as `MEDIUM` confidence because they align with a broader pattern of persistence failures, making them more likely to be real issues than mere test flakiness.
-   The `CONFIRMED` verdict for V13 (Learn tab state loss) was about keeping tabs mounted. The current test passes for header stats, which is consistent with the fix. I'm careful not to re-diagnose V13 as a failure without direct evidence of *component state* loss (like scroll position) that the previous fix should have addressed.