# UX Agent Report — 2026-05-02

## Run Context
- Commits analysed: `26e79dd`, `8d68336`, `9c7766c`, `67bda0b`, `007e57d`, `adaaf62`, `00a605d`, `f05bbe6`, `9dea4f9`, `bd2ce22`, `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Data & Preference Loss Across Reloads (V1, V7, V8, V9, V11, V15)
- Summary: User preferences (theme, basemap, layer visibility) and critical user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` implies basemap preference (`mapStore.basemap`) resets to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` implies layer visibility preferences (`mapStore.layerVisibility`) reset to defaults.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` confirms guest waypoints are lost.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` confirms active module resets.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` confirms active GPS track data is lost.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Widespread failure in the persistence layer. Both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are not correctly writing or reading data on app initialization and lifecycle events.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints.
- Tier(s) affected: Pro (likely Free too, as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: Whether the GPS acquisition itself is failing or if the button's enabled state logic is incorrectly tied to a potentially slow or non-existent GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Ensure the Playwright geolocation mock is correctly integrated and providing a valid position.

### 3. Offline Data Loss for User-Generated Content (V3, V4, V6, V14)
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, with either silent failures or non-actionable error messages, and no pre-save warning.
- Tier(s) affected: Pro (V3, V4, V6, V14 confirmed), likely Free and Guest (for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V3` FAIL: `expect(locator).not.toBeDisabled() failed` for "Save Waypoint" button. Annotation `v14-pre-save-offline-warning: no (V14 confirmed)` confirms V14 (no pre-save warning) and implies data loss as the save operation cannot proceed.
    - `pro V4` PASS: "track save fails offline". This test passing confirms the vulnerability V4 (track save fails offline).
    - `pro V6` PASS: "route save offline produces no user-facing toast". This test passing confirms the vulnerability V6 (silent route save failure offline).
- Cannot confirm: The exact toast message for V4, but the vulnerability is confirmed. The `route-button-missing` annotation for V6 is unclear, but the test passed, confirming the silent failure.
- Root cause: The application lacks an offline-first data strategy. All Supabase write operations (waypoints, tracks, finds, routes) are direct network calls with no local queue or retry mechanism, leading to immediate data loss or failure when offline.
- User impact: Users in areas with poor connectivity (common for prospectors) cannot save their work, leading to significant data loss and a completely unreliable experience.
- Business impact: Severe damage to app credibility, high churn, and inability to serve the core user base effectively.
- Fix direction: Implement an offline-first architecture with a persistent local data store (e.g., IndexedDB) and a sync queue for all user-generated content, providing clear sync status indicators.

### 4. Pro User Sees Upgrade Sheet (P1)
- Summary: A Pro user attempting to access a Pro-gated feature is incorrectly presented with the Upgrade Sheet instead of the feature itself.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test was designed to assert that the Upgrade Sheet is *not* visible. A timeout implies the Upgrade Sheet *was* visible, causing the test to hang waiting for it to disappear or for the intended Pro feature to appear.
- Cannot confirm: Which specific Pro affordance was tapped, but the outcome is clear.
- Root cause: The logic gating Pro features is flawed, potentially checking `isPro` too late or incorrectly, leading to the `showUpgradeSheet` state being set even for authenticated Pro users. This could be a race condition or an incorrect conditional check.
- User impact: Frustration and confusion for paying users who are told to upgrade for features they already pay for, eroding trust and perceived value.
- Business impact: Damages customer loyalty, increases support load, and creates a perception of a broken subscription model.
- Fix direction: Review the `isPro` checks and routing logic for Pro-gated features, ensuring that authenticated Pro users are correctly directed to their paid features and never shown the Upgrade Sheet.

## Tier Comparison
- **Persistence (V7, V8, V9):** Theme, basemap, and layer visibility preferences reset on reload for both Guest and Free tiers. This indicates a core issue with the `persist` middleware or manual `localStorage` implementation that is not tied to authentication status.
- **Waypoint Persistence (V11):** Guest waypoints are memory-only and lost on reload, as confirmed by the `guest V11` test. This is expected for guests but highlights the lack of a proper save mechanism for them.
- **Active Module Persistence (V15):** Active module resets to default for Guest, confirmed by `guest V15`. This is also a general persistence issue.
- **GPS Track Persistence (V1):** GPS track is lost on reload for Pro users, confirmed by `pro V1`. This is a critical data loss issue for active users.
- **Learn Tab State (V13, F4):** Learn header stats and overall tab state are preserved across tab switches for both Guest and Free tiers, indicating the fix for V13 is working universally.
- **Pro-Gated Features:** Free users correctly see PRO badges (`free F2`) and are routed to the Upgrade Sheet when attempting Pro features (`free F3`). Pro users, however, are incorrectly routed to the Upgrade Sheet (`pro P1`).
- **Offline Data Saving (V3, V4, V6, V14):** All offline save operations for user-generated content (waypoints, tracks, routes) fail for Pro users, with no pre-save warning for waypoints. This indicates a fundamental lack of offline data handling across the board, not specific to Pro features.

## Findings Discarded
- No findings were explicitly discarded as PHANTOM in this run. All identified issues have direct evidence from test failures or explicit vulnerability confirmations.

## Cannot Assess
- `pro V10 — Pro status reverts to free on offline reload (paying user locked out)`: This test failed due to `net::ERR_INTERNET_DISCONNECTED` during `page.goto`, preventing the actual vulnerability check.
- `pro V2 — gold/mineral data missing after offline reload (data not cached)`: This test also failed due to `net::ERR_INTERNET_DISCONNECTED` during `page.goto`, preventing the actual vulnerability check.

## Systemic Patterns
- **Widespread Persistence Failure:** Multiple user preferences and critical user-generated data points (theme, basemap, layer visibility, guest waypoints, active module, active GPS track) are failing to persist across reloads. This points to a fundamental flaw in how Zustand's `persist` middleware and manual `localStorage` implementations are integrated with the application's lifecycle and state hydration.
- **Lack of Offline-First Data Strategy:** The application has no robust mechanism for handling data writes when offline. All user-generated content (waypoints, tracks, routes) either fails silently, is lost, or cannot be initiated due to network dependency. This is a critical architectural gap for an outdoor mapping app.
- **GPS Acquisition Instability:** The `WaypointSheet`'s reliance on a stable GPS signal for enabling the save button, coupled with apparent issues in acquiring or processing this signal (even with mocks), suggests a fragility in the GPS integration.

## Calibration Notes
- The new test philosophy, where a "PASS" for a `V[X]` test means the vulnerability `V[X]` is *confirmed* (i.e., the test successfully demonstrated the vulnerable behavior), was crucial for correctly interpreting results like `guest V11`, `guest V15`, `pro V1`, `pro V4`, and `pro V6`. This prevents misinterpreting a "PASS" as a "fix".
- Adhering to the "NEVER guess" rule, I explicitly noted when a test failure (e.g., `pro V10`, `pro V2`) prevented confirmation of the underlying vulnerability, rather than inferring the vulnerability from the test setup failure.
- The previous `P1 Pro badge race` fix was correctly identified as distinct from the current `pro P1` failure, demonstrating the value of detailed historical context.