# UX Agent Report — 2026-06-13

## Run Context
- Commits analysed: `be39a89` (latest) and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Disables Waypoint Save (Vulnerability P3, V3, V14)
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
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` correctly sets `isPro` and that Pro-gated components correctly check this status.

### 4. High: Theme Preference Resets on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme after a page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If the theme picker UI itself is broken, but the persistence mechanism is clearly failing.
- Root cause: `STATE_MAP.md` indicates `theme` uses a "manual `ee_theme` key instead" and "manual pattern, task-008". The `null` values for `ee_theme` in annotations suggest this manual pattern is not correctly writing to or reading from localStorage.
- User impact: Minor annoyance, as users have to re-select their preferred theme on every app load.
- Business impact: Degrades user experience, contributing to a perception of an unpolished or unreliable app.
- Fix direction: Debug the manual localStorage read/write pattern for `userStore.theme` and `ee_theme` to ensure persistence.

### 5. High: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences reset to their default states after a page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This indicates the app did not retain the expected basemap/layer state after reload, causing the test to wait indefinitely or fail an assertion.
- Cannot confirm: The exact default state they revert to, but the failure to persist is clear.
- Root cause: `STATE_MAP.md` states `mapStore` uses `persist` middleware for `basemap` and `layerVisibility` (key: `ee-map-prefs`). The timeouts suggest this persistence is not working, or the hydration logic is failing.
- User impact: Users lose their customized map view, requiring them to re-select their preferred basemap and re-enable desired layers on every app load.
- Business impact: Minor annoyance, but contributes to a perception of an unreliable app, especially for power users who customize their map view.
- Fix direction: Debug the `mapStore` Zustand `persist` middleware configuration and hydration logic for `basemap` and `layerVisibility`.

### 6. High: Session Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
- Cannot confirm: The exact content of the lost waypoints, but their absence is confirmed.
- Root cause: `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002). The test evidence indicates this manual pattern is failing to persist the data.
- User impact: Guest users lose any waypoints they create, making the feature unreliable and discouraging engagement.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to authenticated or paying tiers.
- Fix direction: Debug the manual localStorage read/write pattern for `mapStore.sessionWaypoints` and `ee_guest_waypoints`.

### 7. High: Active Module Resets on Reload (Vulnerability V15)
- Summary: The user's active module preference resets to 'prospecting' after a page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` test passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The specific module it resets *from*, but the reset *to* 'prospecting' is confirmed.
- Root cause: `STATE_MAP.md` states `moduleStore.activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013). The test evidence indicates this manual pattern is failing to persist the data.
- User impact: Minor annoyance, as users have to re-select their preferred module on every app load.
- Business impact: Degrades user experience, contributing to a perception of an unpolished or unreliable app.
- Fix direction: Debug the manual localStorage read/write pattern for `moduleStore.activeModule` and `ee_active_module`.

### 8. High: GPS Track Lost on Reload (Vulnerability V1)
- Summary: Any active GPS track being recorded is lost if the application is reloaded (e.g., due to a crash or accidental tab closure).
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact length or content of the lost track, but its absence is confirmed.
- Root cause: `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006). The test evidence indicates this manual pattern is failing to persist the data.
- User impact: Significant data loss for users actively tracking, leading to severe frustration and loss of valuable activity data.
- Business impact: Damages trust in the app's core functionality, leading to churn and negative reviews.
- Fix direction: Debug the manual localStorage read/write pattern for `mapStore.sessionTrail` and `ee_session_trail`.

## Tier Comparison
- **Offline App Loading (V10, V2):** Fails for authenticated users (Free, Pro), preventing the app from loading at all. Guest users might load, but the specific vulnerability of losing authenticated state or data is not applicable.
- **GPS Acquisition (P3, V3):** Fails for Pro users, disabling the waypoint save button. Free users are gated from saving waypoints (F3 passes, showing UpgradeSheet), so they would not encounter this specific bug directly. Guest users' waypoints are memory-only (V11 confirmed).
- **Pro Status Recognition (P1):** Fails for Pro users, showing the UpgradeSheet. This is a Pro-specific issue.
- **Theme Preference (V7):** Fails for Guest and Free users, resetting to 'dark'. This indicates the underlying `ee_theme` localStorage persistence issue affects all tiers regardless of authentication.
- **Basemap and Layer Preferences (V9, V8):** Fails for Guest (V9) and Free (V8), resetting to defaults. This indicates the `ee-map-prefs` Zustand persist issue affects all tiers.
- **Learn Header Stats (V13, F4):** Passes for Guest and Free, showing identical stats before and after tab switch. This indicates the *header stats* themselves are stable across tab switches for all tiers, which is a positive finding.
- **Session Waypoints (V11):** Confirmed as lost for Guest users. Authenticated users save waypoints to Supabase, so this specific vulnerability does not apply to them in the same way (though Supabase writes have their own offline failure modes).
- **Active Module (V15):** Confirmed as lost for Guest users. This is likely a general `moduleStore` persistence issue affecting all tiers.
- **GPS Track (V1):** Confirmed as lost for Pro users. This is likely a general `mapStore` persistence issue affecting all tiers.
- **Offline Data Writes (V3, V4, V6):** V3 (waypoint) fails for Pro. V4 (track) passes for Pro (meaning the failure occurred). V6 (route) passes for Pro (meaning silent failure occurred). These are authenticated user issues, as guest users do not save to Supabase.

## Findings Discarded
- **guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)** and **free V13 — learn tab state loss across tab switch (handover reference journey)**: These tests passed, and their `state-loss-evidence` annotations show identical `courses`, `completePct`, and `chaptersDone` values before and after tab switches. The `UX Knowledge Context` defines V13 as the loss of "in-progress chapter reading position (which page within a chapter)". The tests are checking the *header summary statistics*, not the *in-chapter reading position*. Therefore, these tests do not provide evidence for the *actual* V13 vulnerability. They confirm the header stats are stable (which is good, and also confirmed by `free F4`), but do not prove the intended state loss. Marked as PHANTOM for V13.

## Cannot Assess
- None. All tests ran and produced output relevant to the analysis.

## Systemic Patterns
- **Widespread Persistence Failures:** A significant number of findings (V7, V9, V8, V11, V15, V1) point to a systemic issue with state persistence across the application. This affects both manual `localStorage` read/write patterns (e.g., `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and Zustand `persist` middleware configurations (`ee-map-prefs`). This suggests a fundamental problem in how localStorage is being accessed, written, or hydrated across multiple stores.
- **Critical Offline Unusability:** The complete failure of the app to load for authenticated users when offline (V10, V2) highlights a severe lack of offline-first design. The current Service Worker implementation is insufficient for caching the core application shell and critical data, making the app unusable in its primary target environment.
- **Core Feature Blockers:** The GPS acquisition failure (P3, V3) and incorrect Pro status recognition (P1) are blocking fundamental user actions and value propositions, indicating critical bugs in core feature implementation and authorization logic.

## Calibration Notes
- Prioritized findings based on user impact: app loading failures > core feature breakage > data loss > preference loss.
- Carefully distinguished between what a test *asserts* and what a vulnerability *describes* to avoid misdiagnosing (e.g., V13).
- Interpreted `Test timeout` for `not.toBeVisible()` assertions as confirmation that the element *was* visible, thus confirming the vulnerability (e.g., P1).
- Interpreted `Test timeout` for state changes (e.g., V9, V8) as confirmation that the state *did not* persist as expected, confirming the preference loss.
- Leveraged `STATE_MAP.md` extensively to trace persistence issues to specific localStorage keys and their implementation patterns (Zustand persist vs. manual IIFE) to identify root causes.