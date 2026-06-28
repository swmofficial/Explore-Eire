# UX Agent Report — 2026-06-28

## Run Context
- Commits analysed: `c7948ed` (latest) and 19 preceding commits.
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
- Tier(s) affected: All (Pro test confirms, but logic is universal)
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping/tracking app.
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js` to ensure `sessionTrail` is written to localStorage on every update.

### 4. Critical Data Loss: Guest Waypoints Not Persisted (Vulnerability V11)
- Summary: Waypoints created by guest users (`sessionWaypoints`) are not persisted to local storage and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The exact point of failure in the `SampleSheet`'s "Save Waypoint" action or `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `SampleSheet` is not triggering the write to localStorage as intended.
- User impact: Guest users lose any waypoints they create, making the app unreliable for casual use and discouraging conversion to authenticated users.
- Business impact: Hinders user acquisition and conversion by providing a broken core feature for unauthenticated users.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` and `SampleSheet.js` to ensure `sessionWaypoints` are written to localStorage.

### 5. Widespread Preference Loss: Theme, Basemap, and Layer Visibility Reset on Reload (Vulnerability V7, V9, V8)
- Summary: User preferences for theme, basemap, and map layer visibility are not persisted across page reloads, reverting to default settings and requiring users to reconfigure them every session.
- Tier(s) affected: All (Guest, Free, likely Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` localStorage key is not being written or read.
    - `guest V9` (basemap) and `free V8` (layers) failed with `Test timeout of 60000ms exceeded.`, strongly indicating persistence failure for `mapStore.basemap` and `mapStore.layerVisibility`.
- Cannot confirm: The exact point of failure for `ee-map-prefs` Zustand persist middleware.
- Root cause: The manual `ee_theme` persistence is broken. The `ee-map-prefs` Zustand `persist` middleware for `basemap` and `layerVisibility` is also failing, or its configuration is incorrect, preventing these preferences from being saved and restored.
- User impact: Annoying and repetitive task for users to reset their preferred visual settings and map configurations on every app load.
- Business impact: Degrades user experience, leading to frustration and reduced engagement, especially for power users who customize their map view.
- Fix direction: Debug the manual `ee_theme` persistence. Investigate and fix the `ee-map-prefs` Zustand `persist` middleware configuration and implementation.

### 6. Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The user's `activeModule` preference is not persisted across page reloads, always reverting to 'prospecting'.
- Tier(s) affected: All (Guest test confirms, but logic is universal)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The exact point of failure in the `ModuleDashboard` or `moduleStore`'s manual persistence implementation for `activeModule`.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly.
- User impact: Minor annoyance as users have to re-select their preferred module after every reload.
- Business impact: Slight degradation of user experience, potentially slowing down workflow for users who frequently switch modules.
- Fix direction: Debug and verify the `ee_active_module` manual persistence implementation in `moduleStore.js` and `ModuleDashboard.js`.

### 7. Pro User Incorrectly Shown Upgrade Sheet (Vulnerability P1 Regression)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, indicating a regression in the Pro status gating logic.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. This test is designed to *pass* if the UpgradeSheet is *not* visible. A timeout strongly implies the UpgradeSheet *was* visible, preventing the test from completing its assertion.
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `userStore.isPro` at the moment of failure.
- Root cause: A regression in the logic that gates Pro features, specifically `showUpgradeSheet` in `userStore`, or how `isPro` is evaluated when a Pro affordance is tapped. This contradicts the fix for P1 in previous reports ("Hide PRO badges in LayerPanel for authenticated Pro users (P1) → CONFIRMED").
- User impact: Paying Pro users are incorrectly prompted to upgrade, leading to confusion, frustration, and a perception of being treated as a free user.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations and negative reviews.
- Fix direction: Investigate the Pro gating logic for `showUpgradeSheet` and ensure `isPro` is correctly evaluated for Pro users across all Pro-gated features.

### 8. Offline Data Write Failures for Tracks and Routes (Vulnerability V4, V6)
- Summary: Saving tracks and routes offline results in data loss, with track saves failing with a toast and route saves failing silently.
- Tier(s) affected: All authenticated (Pro tests confirm, but logic is universal for Free)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the expected behavior: track save fails offline. `STATE_MAP.md` states `tracks` INSERT fails offline with a toast.
    - `pro V6` passed, confirming the expected behavior: route save offline produces no user-facing toast. `STATE_MAP.md` states `routes` INSERT fails offline with `console.error only, no toast`.
- Cannot confirm: The exact content of the toast for V4, or the console error for V6.
- Root cause: The application lacks an offline data queue or local-first write strategy for user-generated content. All writes directly attempt to hit Supabase, failing when offline. This is explicitly noted as "genuine vulnerabilities" and "deferred" in `STATE_MAP.md`.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, leading to frustration and potentially re-doing work.
- Business impact: Significant barrier to adoption and reliable use in rural areas, directly impacting the app's core value proposition for prospectors.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., IndexedDB) for all user-generated content.

## Tier Comparison

-   **Offline Loading (V10, V2)**: Confirmed for Pro, likely affects Free users due to shared app shell and data loading mechanisms. Guest users might load partially but wouldn't have authenticated data.
-   **Waypoint Save Disabled (P3, V3, V14)**: Confirmed for Pro. Free users are gated to the UpgradeSheet (confirmed by `free F3`), so they would not encounter this specific disabled button issue. Guest users have memory-only waypoints (confirmed by `guest V11`), so while they might encounter GPS acquisition issues, the data loss implications are different.
-   **GPS Track Loss (V1)**: Confirmed for Pro. The underlying `sessionTrail` logic is universal, so this vulnerability affects Free users as well. Guest users cannot initiate tracking.
-   **Guest Waypoints Loss (V11)**: Specific to the Guest tier, as Free and Pro users save waypoints to Supabase (when online).
-   **Preference Resets (V7, V9, V8)**: Theme (V7) is confirmed for both Guest and Free. Basemap (V9) and Layer Visibility (V8) are confirmed for Guest and Free respectively. These are universal preferences and likely affect Pro users identically.
-   **Active Module Reset (V15)**: Confirmed for Guest. The `activeModule` logic is universal, so this vulnerability affects Free and Pro users as well.
-   **Pro User Sees Upgrade Sheet (P1)**: Specific to the Pro tier, indicating a regression in Pro status recognition.
-   **Offline Write Failures (V4, V6)**: Confirmed for Pro. The underlying Supabase write logic is universal, so these vulnerabilities affect Free users as well. Guest users do not save tracks or routes to Supabase.
-   **Learn Header Stats (V13, F4)**: The `state-loss-evidence` for `guest V13` and `free V13` shows identical header stats before and after tab switches, indicating that the header stats themselves are stable across tiers. This is consistent with `free F4` passing.

## Findings Discarded

-   No findings were discarded in this run.

## Cannot Assess

-   The exact reason for the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic (Finding 2).
-   The specific Pro affordance tapped in the `pro P1` test (Finding 7).
-   The exact content of the toast for `pro V4` or the console error for `pro V6` (Finding 8).
-   The `guest V13` and `free V13` tests, while passing and showing stable header stats, do not provide direct evidence for the *component state loss* (e.g., reading position within a chapter) that the V13 vulnerability primarily refers to in the UX Knowledge Context. The previous report indicated V13 was fixed by ensuring tabs are always mounted, so the current test likely validates a different aspect of "state loss proof".

## Systemic Patterns

-   **Broken Persistence Mechanisms**: There is a fundamental and widespread failure in how the application persists state. Both Zustand `persist` middleware (`ee-map-prefs` for basemap/layer visibility) and the manual `IIFE + write` patterns for localStorage (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are failing to correctly save and restore critical user preferences and session data. This indicates a deep-seated issue with state management and storage.
-   **Lack of Offline-First Design**: The application demonstrates a critical lack of offline-first capabilities. It completely fails to load for authenticated users when offline and lacks any local-first write strategy or sync queue for user-generated data (waypoints, tracks, routes). This architectural gap makes the app unreliable and unusable in its primary target environment (rural Ireland with poor connectivity).
-   **GPS Acquisition Issues**: The app's GPS acquisition logic appears to be failing to correctly process location data, even with a mocked GPS signal. This prevents core functionality like saving waypoints, indicating a problem in the `useTracks` hook or its integration with `mapStore.userLocation`.

## Calibration Notes

-   Prioritized findings that directly contradict `STATE_MAP.md`'s claims of persistence (V1, V7, V8, V9, V11, V15) as these represent regressions against documented intended behavior or previous fixes.
-   Gave HIGH confidence to issues where test annotations explicitly confirmed a vulnerability (e.g., `V1 confirmed`, `V11 confirmed`, `V15 confirmed`).
-   Interpreted `Test timeout` for assertions (e.g., "not toBeDisabled", "UpgradeSheet not visible") as strong evidence of the *opposite* outcome, especially when supported by screenshots or the nature of the vulnerability (e.g., a button remaining disabled, an UpgradeSheet appearing).
-   Distinguished between tests that *passed* by confirming an *existing, known vulnerability* (V4, V6) versus tests that *failed* due to an *unexpected bug or regression* (V7, P1, P3). Both are valid findings, but the latter often indicates a more urgent fix.
-   Acknowledged the nuance of the V13 test, noting it confirms header stats stability but not necessarily the deeper component state loss described in the UX context, based on previous fix information.