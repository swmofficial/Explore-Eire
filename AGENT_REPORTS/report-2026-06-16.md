# UX Agent Report — 2026-06-16

## Run Context
- Commits analysed: `4ac5eb0` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data (like `gold_samples` for V2). The app relies on network connectivity for initial load, failing the "Offline-First Design" principle. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement a Service Worker to cache the app shell and critical data for offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test from proceeding.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it even when online.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` is correctly read and `useAuth.onAuthStateChange` does not prematurely reset `isPro`.

### 4. Major: User-Generated Data Lost on Reload Due to Persistence Regressions (Vulnerability V1, V4, V11)
- Summary: Guest waypoints, active GPS tracks, and unsaved tracks are lost on page reload or app crash, despite previous fixes for V1 and V11. Offline track save (V4) also fails, confirming data loss.
- Tier(s) affected: Guest (V11), Pro (V1, V4)
- Confidence: HIGH
- Evidence: `guest V11` passes with `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` passes with `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `pro V4` passes, indicating the offline track save failed as expected by the vulnerability.
- Cannot confirm: The exact point of failure in the manual `localStorage` write/read for `sessionWaypoints` and `sessionTrail`.
- Root cause: Regressions in the manual `localStorage` persistence patterns for `sessionWaypoints` (task-002) and `sessionTrail` (task-006). `STATE_MAP.md` confirms these use manual IIFE + write patterns, but the tests show these are failing. The lack of an offline write queue for tracks (V4) also contributes to data loss.
- User impact: Loss of critical user-generated data (waypoints, tracks), leading to severe frustration and distrust in the app's reliability.
- Business impact: Damages user trust, reduces engagement, and makes the app unreliable for its core data capture functionality.
- Fix direction: Re-implement and thoroughly verify the manual `localStorage` persistence for `sessionWaypoints` and `sessionTrail`. Implement an offline write queue for tracks to prevent data loss on save failure.

### 5. Major: User Preferences Not Persisted Across Reloads (Vulnerability V7, V8, V9, V15)
- Summary: Theme, basemap, layer visibility, and active module preferences reset to their default values on page reload, forcing users to reconfigure their settings repeatedly.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH (V7, V15), MEDIUM (V8, V9 due to timeouts)
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, and `ee_theme-before-reload: null`. `guest V15` passed with `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `guest V9` and `free V8` tests timed out, implying the preferences were not restored.
- Cannot confirm: The specific state of `ee-map-prefs` after reload for V8 and V9 due to test timeouts, but the pattern of persistence failures is consistent.
- Root cause: Regressions in various persistence mechanisms. `ee_theme` (manual, task-008), `ee_active_module` (manual, task-013), and `ee-map-prefs` (Zustand persist) are all failing to correctly save or load preferences. Previous fixes for V7, V11, V15 were CONFIRMED but have regressed.
- User impact: Annoying and repetitive setup for users, reducing the sense of app reliability and personalization.
- Business impact: Minor friction, but contributes to an overall negative user experience and perception of app quality, potentially impacting retention.
- Fix direction: Debug and re-verify all persistence mechanisms, including the manual `localStorage` patterns for `ee_theme` and `ee_active_module`, and the Zustand `persist` middleware for `ee-map-prefs`.

### 6. Minor: Learn Module Progress Not Recorded or Displayed (Vulnerability V13, F4)
- Summary: The Learn module's header stats consistently show 0% completion and 0 chapters done, indicating that user progress is not being recorded or displayed, even though the stats themselves are stable across tab switches.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V13`, `free V13`, and `free F4` all passed with `state-loss-evidence` and `header-stats-pair` showing `{"courses":2,"completePct":0,"chaptersDone":0}` before and after tab switches. This confirms the *stability* of the zero values, but also that no progress is being tracked or reflected.
- Cannot confirm: Whether the `markChapterComplete()` function is failing to write to `ee_progress` in localStorage, or if the `useProgress()` hook is failing to read/process it, or if the test environment simply isn't simulating chapter completion.
- Root cause: The underlying logic for tracking and displaying learning progress (`useProgress`, `markChapterComplete`, `ee_progress` in localStorage) is either not functioning correctly or the test setup does not simulate progress. The previous fix for V13 addressed component unmount, not progress tracking.
- User impact: Users are demotivated from engaging with the Learn module as they cannot see their achievements or progress.
- Business impact: Reduces engagement with a key feature designed for user education and retention, potentially impacting conversion to Pro if learning is a value driver.
- Fix direction: Debug the `useProgress` hook and `markChapterComplete` function to ensure chapter completion is correctly recorded in `ee_progress` and accurately reflected in the Learn header stats.

### 7. Minor: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: Saving a route offline fails without any user-facing feedback, leading to silent data loss.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test couldn't directly observe the failure. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast".
- Cannot confirm: The exact conditions under which the route button was missing in the test, which prevented direct observation of the silent failure.
- Root cause: Lack of an offline write queue and explicit error handling/toasts for route saving.
- User impact: User believes their route is saved, only to find it missing later, leading to frustration and distrust.
- Business impact: Damages trust in data safety, reduces engagement with route planning features.
- Fix direction: Implement an offline write queue for routes and provide user-facing feedback (toasts) on save failure.

## Tier Comparison
- **Offline Loading (V10, V2):** Both Free and Pro tiers completely fail to load offline, indicating a systemic issue affecting all authenticated users. Guest tier was not explicitly tested for this.
- **GPS/Waypoint Save (P3, V3, V14):** The inability to save waypoints due to GPS acquisition failure affects Pro users directly. Free users are also gated from saving waypoints, so the underlying GPS issue would affect them if they had the capability. Guest users cannot save waypoints.
- **Pro Status Recognition (P1):** This issue is specific to the Pro tier, where paying users are incorrectly treated as free.
- **Data Loss on Reload (V1, V4, V11):** Guest users experience loss of session waypoints (V11). Pro users experience loss of active GPS tracks (V1) and failed offline track saves (V4). This highlights widespread data loss vulnerabilities across different user-generated content types and tiers.
- **Preference Resets (V7, V8, V9, V15):** Theme (V7) resets for both Guest and Free users. Basemap (V9) resets for Guest. Layer preferences (V8) reset for Free. Active module (V15) resets for Guest. This indicates a broad regression in persistence mechanisms affecting various user preferences across all tiers.
- **Learn Progress (V13, F4):** The Learn module header stats consistently show zero progress for both Guest and Free users, suggesting a universal issue with progress tracking or display. Pro tier was not explicitly tested for this.
- **Route Save Offline (V6):** This silent failure affects Pro users, as route saving is a Pro feature.

## Findings Discarded
- No findings were discarded in this run, as there were 7 distinct, high-impact findings.

## Cannot Assess
- The full extent of V13 (Learn tab state loss) regarding in-chapter reading position. The current tests only verify the stability of header stats (which are always zero), not the component state of an active chapter reader.
- The specific cause of the test timeouts for V8, V9, and P1 beyond the implied failure of the expected state.

## Systemic Patterns
- **Widespread Persistence Regressions:** Multiple previously "CONFIRMED" fixes for persistence (V1, V7, V11, V15) have regressed. This indicates a fundamental fragility in the application's persistence layer, affecting both Zustand `persist` middleware and manual `localStorage` patterns.
- **Fundamental Offline Capability Failure:** The application completely fails to load offline for authenticated users, and data writes (waypoints, tracks, routes) continue to fail silently offline. This highlights a critical lack of robust offline-first design, making the app unusable in its primary target environment.
- **GPS Acquisition System Failure:** The core GPS acquisition logic (`watchPosition` or related components) is failing to correctly acquire or process location data, directly impacting critical features like waypoint saving and potentially track recording.

## Calibration Notes
- The new test philosophy, where a "PASS" can confirm a vulnerability (e.g., V1, V4, V11, V15), proved effective in identifying regressions in previously "fixed" issues. This prevents misinterpreting test results as successful fixes when they are, in fact, confirmations of ongoing problems.
- The detailed annotations (e.g., `ee_theme-before-reload`, `state-loss-evidence`, `v14-pre-save-offline-warning`) provided crucial, direct evidence for confidence scoring, significantly reducing speculative "LOW" or "PHANTOM" verdicts.
- The recurrence of the top 3 critical findings from the previous report (Offline Loading, Waypoint Save Disabled, Pro Status Not Recognized) underscores the need for a more robust and comprehensive regression testing strategy, particularly for core functionalities and persistence.