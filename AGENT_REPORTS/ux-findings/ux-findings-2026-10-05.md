# UX Agent Report — 2026-10-05

## Run Context
- Commits analysed: `4cda0544245c9f28d66b046c279743355cce66d3` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free/Guest, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. Critical: Free Users Can Create Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to create waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.
- Fix direction: Correct the conditional rendering logic for the waypoint creation flow to ensure `UpgradeSheet` is shown for free users when attempting to save a waypoint.

### 4. High: User Preferences (Theme, Active Module, Guest Waypoints) Fail to Persist (V7, V15, V11 Regressions)
- Summary: Multiple user preferences and session data (theme, active module, guest waypoints) fail to persist across reloads, reverting to defaults or disappearing entirely.
- Tier(s) affected: Guest, Free (inferred all for theme/active module)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
- Cannot confirm: The exact code path where the `localStorage.setItem` or `localStorage.getItem` is failing for these manual persistence patterns.
- Root cause: The manual `localStorage` persistence pattern (IIFE read on init, `localStorage.setItem` on state change) for `userStore.theme` (`ee_theme`), `moduleStore.activeModule` (`ee_active_module`), and `mapStore.sessionWaypoints` (`ee_guest_waypoints`) is not functioning correctly. This is a regression from previously "CONFIRMED" fixes for V7, V11, and V15, despite `STATE_MAP.md` claiming they persist.
- User impact: Users experience a loss of personalization and session context, leading to frustration and repeated setup.
- Business impact: Erodes user trust, increases friction, and reduces perceived app quality.
- Fix direction: Debug the manual `localStorage` read/write implementations for `ee_theme`, `ee_active_module`, and `ee_guest_waypoints` to ensure data is correctly stored and retrieved.

### 5. High: Map Preferences (Basemap, Layer Visibility) Reset on Reload (V9, V8)
- Summary: User-selected basemap and layer visibility preferences are lost upon page reload, reverting to default settings.
- Tier(s) affected: Guest, Free (inferred all)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`. This indicates the expected map state was not found after reload. `STATE_MAP.md` states `mapStore.basemap` and `mapStore.layerVisibility` are persisted via Zustand `persist` middleware using the `ee-map-prefs` key.
- Cannot confirm: The exact content of `ee-map-prefs` after reload, only that the tests failed to assert the expected state.
- Root cause: Likely an issue with the Zustand `persist` middleware configuration for `mapStore` or a problem with the `ee-map-prefs` key, preventing `basemap` and `layerVisibility` from being correctly restored.
- User impact: Users' preferred map style and custom layer configurations are not remembered, requiring manual re-selection and re-enabling.
- Business impact: Minor, but degrades user experience and efficiency for map-centric tasks.
- Fix direction: Investigate the Zustand `persist` configuration for `mapStore` and the `ee-map-prefs` key to ensure map preferences are correctly saved and loaded.

### 6. Medium: GPS Track Data Lost on Reload (V1 Regression)
- Summary: GPS track data accumulated during an active tracking session is lost if the application reloads or crashes before the user explicitly saves it.
- Tier(s) affected: Pro (inferred all users who track)
- Confidence: HIGH
- Evidence: `pro V1` passed, annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact code path where `localStorage.setItem` or `localStorage.getItem` for `ee_session_trail` is failing.
- Root cause: `mapStore.sessionTrail` accumulates GPS data in volatile memory and is not being persisted to `ee_session_trail` as claimed by `STATE_MAP.md` (manual IIFE + write pattern, task-006). The test confirms `ee_session_trail` is empty/missing. This is a regression or incomplete fix.
- User impact: Users lose entire GPS tracks if the app reloads or crashes during an active tracking session before explicit saving. This leads to severe frustration and distrust in the app's reliability.
- Business impact: Significant data loss for users, undermining a core feature and leading to high churn.
- Fix direction: Debug the manual `localStorage` read/write implementation for `ee_session_trail` to ensure GPS track data is continuously persisted during active tracking.

### 7. Medium: Offline Data Writes Fail Silently or With Data Loss (V4, V6, V14)
- Summary: Critical user-generated data (tracks, routes, finds, waypoints) cannot be saved offline, leading to data loss or silent failures without proper user feedback.
- Tier(s) affected: Pro (inferred all authenticated users)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed (track save fails offline).
    - `pro V6` passed (route save offline produces no user-facing toast).
    - `pro V3` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)` (no pre-check for offline waypoint save).
    - `STATE_MAP.md` confirms `tracks` INSERT, `routes` INSERT, `finds_log` INSERT, `waypoints` INSERT all fail offline.
- Cannot confirm: The specific error messages for all offline write failures, as some are silent.
- Root cause: The application lacks an offline data synchronization queue. All data writes attempt direct Supabase calls, failing when offline. `STATE_MAP.md` explicitly notes "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred) is still NOT persisted".
- User impact: Users lose valuable data collected in the field when offline, leading to extreme frustration and wasted effort.
- Business impact: Fundamental flaw for an outdoor app, severely limiting utility in target environments and hindering adoption.
- Fix direction: Implement an offline-first architecture with a persistent sync queue (e.g., IndexedDB) for all user-generated data.

### 8. Low: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Ambiguity)
- Summary: A Pro user may be incorrectly shown the UpgradeSheet when interacting with a Pro-gated feature.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This test is designed to ensure Pro users *do not* see the UpgradeSheet. A timeout here could mean the UpgradeSheet *did* appear, or the test got stuck for another reason.
- Cannot confirm: The exact state of the UpgradeSheet (visible/hidden) at the time of timeout.
- Root cause: Ambiguous. Could be a test flakiness, or a subtle bug in the Pro gate logic that incorrectly shows the UpgradeSheet to Pro users.
- User impact: Minor confusion if a Pro user is prompted to upgrade.
- Business impact: Minor, but degrades premium user experience.
- Fix direction: Investigate test flakiness or review Pro gate logic for UpgradeSheet display.

## Tier Comparison

- **Offline App Loading (V2, V10)**: Identical behavior across tiers (inferred). The app fails to load at all when offline, preventing any tier-specific functionality from being tested. This indicates a fundamental app shell caching issue.
- **Theme Preference Persistence (V7)**: Identical failure for Guest and Free tiers. Both revert to 'dark' theme on reload, and the `ee_theme` localStorage key is `null`. This points to a common issue in the `userStore.theme` manual persistence mechanism.
- **Basemap Preference Persistence (V9)**: Failed for Guest (timeout). Inferred to affect all tiers as `mapStore.basemap` persistence is a global setting.
- **Layer Visibility Preference Persistence (V8)**: Failed for Free (timeout). Inferred to affect all tiers as `mapStore.layerVisibility` persistence is a global setting.
- **Active Module Preference Persistence (V15)**: Failed for Guest. Inferred to affect all tiers as `moduleStore.activeModule` persistence is a global setting.
- **Guest Waypoint Persistence (V11)**: Specific to Guest tier, confirmed to fail (waypoints are lost on reload).
- **Waypoint Save Disabled (P3, V3)**: Confirmed for Pro. Inferred to affect Free/Guest if they could save waypoints, as it's a GPS acquisition issue.
- **Free User Waypoint Gate (F3)**: Specific to Free tier, confirmed to bypass the upgrade gate and show the WaypointSheet instead of the UpgradeSheet.
- **Offline Data Writes (V1, V4, V6, V14)**: Confirmed for Pro. These are core data saving mechanisms and would affect all authenticated users (Free/Pro) attempting to save data offline. Guest users cannot save data to Supabase anyway.
- **Learn Tab State (V13)**: Passed for Guest and Free. The `state-loss-evidence` shows no state loss, indicating the fix for V13 is working across these tiers.

## Findings Discarded

- `pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap) was ranked lowest due to its ambiguous timeout error and relatively lower user impact compared to data loss or app usability issues. It's possible this is a test flakiness rather than a core UX issue.

## Cannot Assess

- The exact state of `ee-map-prefs` for V8 and V9 due to test timeouts.
- Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.

## Systemic Patterns

-   **Offline-First Failure**: The most critical systemic pattern is the complete failure of the application to load or function offline, coupled with the lack of an offline data synchronization queue. This makes the app fundamentally unsuitable for its target user base in rural areas.
-   **Persistence Regression**: A significant systemic issue is the regression in multiple preference persistence mechanisms (theme, active module, guest waypoints, GPS track). Despite `STATE_MAP.md` claiming manual `localStorage` persistence for these, tests show the `localStorage` keys are `null` or `absent` after reload. This indicates a widespread failure in the implementation or interaction of the manual `localStorage` read/write patterns.
-   **GPS Acquisition Failure**: A consistent failure to acquire GPS coordinates is blocking core functionality like waypoint saving across multiple tests and tiers.

## Calibration Notes

-   Prioritized critical blockers (app loading, core functionality) over preference resets, even if preference resets are regressions.
-   Learned from previous "PHANTOM" verdicts to be cautious with timeouts and ambiguous errors, seeking explicit annotations or screenshots for confirmation. However, repeated timeouts for persistence issues (V8, V9) in conjunction with confirmed persistence failures (V7, V11, V15) allow for a "MEDIUM" confidence inference.
-   Direct contradictions between `STATE_MAP.md` and test annotations (e.g., V11, V15, V1) are treated as test evidence overriding the map, indicating regressions or incomplete fixes in the actual implementation.
-   The `state-loss-evidence` for V13 passing with identical before/after values correctly indicates a fix, despite the annotation's name.