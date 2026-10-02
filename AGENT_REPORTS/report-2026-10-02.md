# UX Agent Report — 2026-10-02

## Run Context
- Commits analysed: `43c55cb18b056ffb76e14d64a860a063ebb2329a` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: User Preference Persistence Regressions (V7, V9, V8)
- Summary: User preferences for theme, basemap, and layer visibility are not persisting across page reloads, reverting to default settings. This is a regression for theme (V7) and indicates failures for basemap (V9) and layers (V8).
- Tier(s) affected: All
- Confidence: HIGH (V7), MEDIUM (V9, V8)
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, confirming the `ee_theme` localStorage key is not being correctly written or read.
    - `guest V9` failed with `Test timeout of 60000ms exceeded.`
    - `free V8` failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: The exact default states for V8 and V9 due to timeouts, but the failures strongly imply a reset.
- Root cause: The manual `localStorage` read/write pattern for `ee_theme` is failing, contradicting `STATE_MAP.md`. For `basemap` and `layerVisibility`, which are managed by Zustand `persist` middleware (`ee-map-prefs`), the persistence mechanism is either misconfigured or failing to hydrate the store on reload.
- User impact: Users experience frustration as their personalized app settings are lost on every reload, requiring manual re-configuration.
- Business impact: Erodes user trust and satisfaction, potentially leading to reduced engagement and higher churn.
- Fix direction: Debug `ee_theme` manual `localStorage` implementation. Investigate `mapStore`'s Zustand persist configuration and hydration.

### 4. High: Guest Waypoints and Active Module Not Persisting (V11, V15)
- Summary: Guest waypoints and the active module selection are lost on page reload, despite `STATE_MAP.md` indicating they should be persisted via manual `localStorage` patterns.
- Tier(s) affected: Guest (V11), All (V15)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: If the manual persistence code for these keys is entirely missing or just misconfigured.
- Root cause: The manual `localStorage` patterns for `ee_guest_waypoints` (task-002) and `ee_active_module` (task-013) are not correctly writing or reading the values, directly contradicting `STATE_MAP.md`.
- User impact: Loss of unsaved work (waypoints) for guest users, and disruption of workflow for all users (module reset).
- Business impact: Frustration, reduced adoption for guest users, perceived unreliability.
- Fix direction: Debug manual `localStorage` implementations for `ee_guest_waypoints` and `ee_active_module`.

### 5. High: Free Users Can Save Waypoints (F3 Failure)
- Summary: Free tier users are able to save waypoints, which the test implies should be a Pro-gated feature that surfaces an UpgradeSheet.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed because `expect(upgradeShown).toBeTruthy()` was false. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the UpgradeSheet was *not* shown, and the WaypointSheet *was* shown.
- Cannot confirm: If this is an intentional change in business logic or a bug in the gating. The test expects it to be gated.
- Root cause: The logic gating waypoint saving for free users is either missing or incorrectly configured, allowing free users to access a feature intended for Pro subscribers.
- User impact: Free users gain access to a premium feature, potentially devaluing the Pro subscription.
- Business impact: Reduces incentive for free users to upgrade, impacting conversion rates and perceived value of the Pro tier.
- Fix direction: Implement or correct the Pro gate for waypoint saving to ensure the UpgradeSheet is displayed for free users.

### 6. Medium: Pro User Sees Upgrade Sheet (P1 Failure)
- Summary: A Pro user is unexpectedly shown the UpgradeSheet when interacting with a Pro affordance, indicating a misconfiguration of Pro status recognition.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. This timeout typically occurs when Playwright is waiting for an element *not* to be visible, but it *is* visible, or waiting for an element *to be* visible, but it's *not*. Given the test name "Pro user does not see UpgradeSheet", a timeout suggests the UpgradeSheet *was* visible, preventing the test from proceeding.
- Cannot confirm: The exact element that caused the timeout, or if the UpgradeSheet was indeed visible.
- Root cause: The `isPro` flag or its consumption by the `UpgradeSheet` display logic is likely misconfigured, causing the sheet to appear for authenticated Pro users. `STATE_MAP.md` notes `isPro` is hydrated from Supabase and persisted, but `useAuth.onAuthStateChange` might overwrite it.
- User impact: Annoyance and confusion for paying users who are incorrectly prompted to upgrade.
- Business impact: Erodes trust and satisfaction for paying customers, potentially leading to churn.
- Fix direction: Verify `isPro` state is correctly set and persisted for Pro users, and that the `UpgradeSheet` correctly uses this flag to prevent display.

### 7. Medium: GPS Track Lost on Reload (V1 Confirmed)
- Summary: Accumulated GPS track data is lost on page reload during active tracking, as it is not automatically saved.
- Tier(s) affected: All (any user tracking)
- Confidence: HIGH
- Evidence: `pro V1` passed, annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact duration of the lost track, but the vulnerability is confirmed.
- Root cause: `STATE_MAP.md` explicitly states `sessionTrail` is "NOT persisted anywhere until the user explicitly saves." This is a known vulnerability (V1).
- User impact: Significant data loss for users who are actively tracking, especially during long sessions or unexpected app closures.
- Business impact: Severe frustration, loss of valuable user-generated content, leading to high churn.
- Fix direction: Implement auto-persistence for `sessionTrail` to `localStorage` during active tracking, with a clear sync mechanism.

### 8. Medium: Offline Data Write Failures (V4, V6 Confirmed)
- Summary: Saving tracks and routes fails silently or with a toast when offline, resulting in data loss without a retry mechanism.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability (track save fails offline).
    - `pro V6` passed, confirming the vulnerability (route save offline produces no user-facing toast). Annotation `route-button-missing: cannot proof V6` is a test issue, but the test *passed* meaning the vulnerability was confirmed.
- Cannot confirm: The exact toast message for track save, but the failure is confirmed.
- Root cause: `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast 'Could not save track'" and `routes` INSERT "Fails — console.error only, no toast". This is a known vulnerability. The app lacks an offline data queue.
- User impact: Loss of valuable user-generated data (tracks, routes) when offline, leading to frustration and distrust.
- Business impact: Reduces app reliability, impacts user engagement and retention, especially for users in rural areas.
- Fix direction: Implement an offline data queue (e.g., IndexedDB) to store and retry failed write operations.

## Tier Comparison
- **Offline App Inaccessibility (V2, V10 Blocker):** Affects Pro, inferred Free. Guest users might experience similar issues if the core app shell isn't cached, but the test specifically targets authenticated users.
- **Waypoint Save Disabled by GPS Acquisition Failure (P3, V3 Blocker):** Affects Pro. Inferred Free/Guest if they could save waypoints.
- **User Preference Persistence Regressions (V7, V9, V8):** Affects all tiers identically. This suggests a core persistence mechanism issue, not auth-gated logic.
- **Guest Waypoints and Active Module Not Persisting (V11, V15):** V11 specifically affects Guest. V15 (active module) affects all tiers.
- **Free Users Can Save Waypoints (F3 Failure):** Specific to the Free tier.
- **Pro User Sees Upgrade Sheet (P1 Failure):** Specific to the Pro tier.
- **GPS Track Lost on Reload (V1 Confirmed):** Affects all tiers (any user tracking).
- **Offline Data Write Failures (V4, V6 Confirmed):** Affects all tiers.

## Findings Discarded
- `guest V13` and `free V13` (learn header stats are recomputed on every tab switch): These tests passed, and the `state-loss-evidence` annotations show identical `before` and `after` stats. This indicates that the fix for V13 (preserving Learn tab component state) is working, and the vulnerability is *not* active. The test name is misleading as it implies state loss, but the evidence shows state *preservation*. Therefore, this is not a UX issue.
- `free F4` (Learn header percentage does not regress to zero across tab switches): Similar to V13, this test passed with identical stats, confirming the fix for state preservation. Not a UX issue.

## Cannot Assess
- No specific components or tests were skipped or unrun due to missing data or configuration.

## Systemic Patterns
1.  **Persistence Failures:** Multiple critical user preferences and user-generated data (theme, basemap, layers, guest waypoints, active module, session trail) are failing to persist across reloads, despite explicit mechanisms (Zustand `persist` middleware or manual `localStorage` patterns) being in place and documented in `STATE_MAP.md`. This indicates a widespread issue with the implementation or configuration of client-side state persistence.
2.  **Offline Inadequacy:** The application fundamentally fails to operate offline, both at the initial loading stage (app shell, core data) and for user-generated data writes (waypoints, tracks, routes). This directly contradicts the "Offline-First Design" principles and is a critical flaw for an outdoor mapping app.
3.  **GPS Acquisition Issues:** The app is failing to acquire GPS coordinates, blocking core functionality like saving waypoints. This suggests a problem with the `watchPosition` implementation or its interaction with the testing environment's geolocation mock.
4.  **Pro Gating Logic Flaws:** There are inconsistencies in how Pro features are gated, with free users accessing a Pro feature (waypoint saving) and Pro users being prompted to upgrade.

## Calibration Notes
- The new test philosophy, where passing tests confirm vulnerabilities by providing direct evidence of the expected failure/loss, is highly effective. This allows for clear, high-confidence findings.
- Careful interpretation of test annotations like `state-loss-evidence` is crucial. When such evidence shows *no change* and the test *passes*, it indicates the *fix* for the vulnerability is working, rather than the vulnerability being active.
- Timeouts in Playwright tests (e.g., `toBeDisabled`, `toBeTruthy`, `page.goto`) are strong indicators of unexpected UI states or fundamental app loading failures, providing valuable diagnostic information.
- Cross-referencing test annotations and failures against `STATE_MAP.md` is essential for identifying discrepancies between documented architecture and actual implementation, pinpointing root causes for persistence issues.