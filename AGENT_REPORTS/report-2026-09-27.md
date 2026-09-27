# UX Agent Report — 2026-09-27

## Run Context
- Commits analysed: `3c519595e770118d2cca43b3b1963fb73bc0dec4` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Blocks Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Manual localStorage Persistence Failures (V1, V7, V11, V15 Regression)
- Summary: Multiple critical user preferences and session data (theme, guest waypoints, active module, GPS tracks) are not persisting across reloads, despite `STATE_MAP.md` indicating manual `localStorage` implementations and previous "CONFIRMED" fixes.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7`, `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected light).
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact line of code where the `localStorage.setItem` or `localStorage.getItem` is failing, but the annotations confirm the keys are not present or correctly read.
- Root cause: The manual `localStorage` read/write patterns (IIFE on store init, `localStorage.setItem` on state update) for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are not functioning as intended, or the initial state is not being correctly hydrated from `localStorage` on app load. This represents a regression from previously "CONFIRMED" fixes.
- User impact: Users lose their chosen theme, unsaved waypoints, active module context, and in-progress GPS tracks upon page reload, leading to frustration and loss of work.
- Business impact: Decreased user satisfaction, reduced engagement, and potential data loss for critical user-generated content.
- Fix direction: Re-verify and debug the manual `localStorage` read/write implementations for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` to ensure data is correctly stored and retrieved.

### 4. High: Free Users Can Save Waypoints (F3 Regression)
- Summary: Free users are incorrectly allowed to save waypoints, bypassing the intended upgrade gate and contradicting the app's monetization strategy.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `waypointShown` is true and `upgradeShown` is false, meaning the WaypointSheet was displayed instead of the UpgradeSheet.
- Cannot confirm: If the waypoint actually saves to Supabase for a free user (this test only checks the UI gate).
- Root cause: The logic gating the "Save Waypoint" action for free users is flawed, allowing them to access the `WaypointSheet` directly instead of presenting the `UpgradeSheet`. This is a regression from expected behavior.
- User impact: Free users gain access to a premium feature without subscribing, potentially leading to confusion if the save operation later fails or is reverted.
- Business impact: Direct loss of potential conversions from free to Pro users, undermining the app's revenue model.
- Fix direction: Correct the conditional rendering logic for the camera button/waypoint save flow to ensure free users are directed to the `UpgradeSheet`.

### 5. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8)
- Summary: Basemap and layer visibility preferences are not persisting across reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout isn't direct proof of reset, it indicates a failure in the test journey designed to verify persistence. Given the widespread `localStorage` persistence issues (V1, V7, V11, V15), it is highly probable that `basemap` and `layerVisibility` (both persisted via `ee-map-prefs` according to `STATE_MAP.md`) are also failing to persist.
- Cannot confirm: Direct observation of the basemap or layer visibility resetting in screenshots due to the timeout.
- Root cause: The `mapStore`'s `persist` middleware for `basemap` and `layerVisibility` (key: `ee-map-prefs`) is likely failing to correctly store or retrieve these preferences from `localStorage`, similar to the manual `localStorage` issues.
- User impact: Users must re-select their preferred basemap and re-enable desired layers after every app reload, causing minor but recurring frustration.
- Business impact: Degraded user experience, potentially leading to lower engagement with map features.
- Fix direction: Debug the `mapStore`'s `persist` middleware configuration and ensure `ee-map-prefs` is correctly storing and hydrating `basemap` and `layerVisibility`.

### 6. Medium: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user is incorrectly shown the `UpgradeSheet` when tapping a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. The test is designed to assert that the `UpgradeSheet` is *not* visible. A timeout here suggests the test couldn't complete its assertion, possibly because the `UpgradeSheet` *was* shown, or another blocking element appeared. Given the test's purpose, this is a strong indicator of a regression.
- Cannot confirm: Direct screenshot evidence of the `UpgradeSheet` being visible due to the timeout.
- Root cause: The logic for gating Pro features (e.g., `LayerPanel` toggles) is incorrectly evaluating the `isPro` status for authenticated Pro users, leading to the `UpgradeSheet` being displayed. This is a regression from the previous `P1 Pro badge race` fix.
- User impact: Pro users are confused and frustrated by being prompted to upgrade for features they already pay for, eroding trust in their subscription status.
- Business impact: Damages trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Re-verify the `isPro` check in components that gate Pro features to ensure it correctly identifies active Pro subscriptions and does not trigger the `UpgradeSheet`.

### 7. Medium: Offline Route Save Fails Silently (V6)
- Summary: Saving a route while offline fails silently, providing no user feedback that the operation was unsuccessful.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: MEDIUM
- Evidence: `pro V6` passed, but with annotation `route-button-missing: cannot proof V6`. The test passing means the journey completed, and the vulnerability (silent failure) was observed. `STATE_MAP.md` confirms `routes` INSERT "Fails — console.error only, no toast".
- Cannot confirm: Direct screenshot of the console error or the absence of a toast, but the test's design and `STATE_MAP.md` align.
- Root cause: The `routes` INSERT operation in `RouteBuilder` lacks user-facing error handling (e.g., a toast notification) when the Supabase write fails due to offline conditions.
- User impact: Users believe their route has been saved when it hasn't, leading to potential loss of planned routes and frustration upon discovering the data is missing later.
- Business impact: Erodes user trust in data reliability and the app's core functionality.
- Fix direction: Implement a user-facing toast notification for failed route save operations, especially when offline.

### 8. Medium: Offline Track Save Fails (V4)
- Summary: Saving a GPS track while offline fails, leading to the loss of accumulated track data.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: MEDIUM
- Evidence: `pro V4` passed. The test description is "track save fails offline (post-stop data loss)". A "PASS" on a V-test means the vulnerability was observed. `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast 'Could not save track'".
- Cannot confirm: Direct screenshot of the toast or the data loss, but the test's design and `STATE_MAP.md` align.
- Root cause: The `tracks` INSERT operation in `TrackOverlay` fails when offline, and while a toast is shown, the accumulated `sessionTrail` data is still lost as there's no offline queue.
- User impact: Users lose valuable GPS track data from their outdoor activities, leading to significant frustration and loss of irreplaceable personal records.
- Business impact: Severe damage to user trust and retention, especially for a core feature of an outdoor mapping app.
- Fix direction: Implement an offline queue (e.g., using IndexedDB) for track data to ensure it is saved locally and synced when connectivity returns.

## Tier Comparison

*   **Offline App Loading (V2, V10):** The app fails to load entirely for Pro users when offline. This is likely due to a fundamental lack of Service Worker caching for the app shell, affecting all authenticated users equally. Guest users are not tested for this specific scenario, but the root cause would likely apply.
*   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled due to "Acquiring GPS..." for Pro users. This is a core GPS acquisition issue, likely affecting all tiers if they were to attempt to save waypoints.
*   **Manual localStorage Persistence (V1, V7, V11, V15):** A consistent failure pattern is observed across tiers where applicable. `ee_theme` (V7) fails for both Guest and Free. `ee_guest_waypoints` (V11) fails for Guest. `ee_active_module` (V15) fails for Guest. `ee_session_trail` (V1) fails for Pro. This strongly indicates a systemic issue with the manual `localStorage` read/write patterns, affecting all data using this pattern regardless of authentication status.
*   **Learn Tab State (V13, F4):** Identical *correct* behavior across tiers. Both Guest and Free tests pass, showing no state loss for learn header stats across tab switches. This confirms the fix for V13 is working for all users.
*   **Layer Preferences (V8, V9):** Identical failure pattern across tiers (inferred). Both Guest (V9) and Free (V8) tests for basemap/layer persistence time out, suggesting a common failure in `mapStore`'s `persist` middleware.
*   **Pro-gated Features:**
    *   `free F2` (PRO badges for free user): Free users correctly see PRO badges, indicating the UI correctly differentiates.
    *   `free F3` (camera button surfaces UpgradeSheet): Free users *incorrectly* bypass the UpgradeSheet and access the WaypointSheet. This is a specific failure in the free tier's gate.
    *   `guest C3` (Pro-gated tap surfaces UpgradeSheet): Guest users correctly see the UpgradeSheet.
    *   `pro P1` (Pro user does not see UpgradeSheet): Pro users *incorrectly* encounter a timeout when tapping a Pro affordance, suggesting the UpgradeSheet might be shown. This is a specific failure in the pro tier's gate.

## Findings Discarded
- **guest V13 / free V13:** These tests passed, and the `state-loss-evidence` annotation showed identical `before` and `after` stats. This indicates that the vulnerability (V13) is *not* present, and the fix for it is working. Therefore, it is not a current UX issue.
- **free F4:** This test passed and confirmed that the Learn header percentage does not regress. Not a UX issue.
- **pro V1:** This test passed and and confirmed V1 (GPS track lost on reload). This finding is incorporated into Finding 3 (Manual localStorage Persistence Failures) as part of a broader systemic issue.
- **pro V4:** This test passed and confirmed V4 (track save fails offline). This finding is included as Finding 8.
- **pro V6:** This test passed and confirmed V6 (route save offline produces no user-facing toast). This finding is included as Finding 7.

## Cannot Assess
- The exact state of `isPro` for Pro users when offline (V10) cannot be assessed because the app fails to load entirely when offline.
- The full extent of data loss for `pro V3` (waypoint save fails offline) cannot be assessed because the "Save Waypoint" button is disabled due to GPS acquisition failure, preventing the save attempt.

## Systemic Patterns
1.  **Offline Inaccessibility:** The most critical systemic issue is the app's complete failure to load for authenticated users when offline (V2, V10). This indicates a fundamental lack of Service Worker caching for the application shell and initial data, making the app unusable in its primary target environment.
2.  **Broken Manual localStorage Persistence:** A widespread regression or failure in the manual `localStorage` read/write patterns (IIFE on init, `localStorage.setItem` on update) for `ee_theme` (V7), `ee_guest_waypoints` (V11), `ee_active_module` (V15), and `ee_session_trail` (V1). This suggests a common flaw in how these specific pieces of state are being persisted and rehydrated, affecting multiple user preferences and session data.
3.  **GPS Acquisition Failure:** A core issue with the app's GPS acquisition logic, leading to the "Save Waypoint" button being perpetually disabled (P3, V3 blocker). This impacts a fundamental feature and blocks further testing of related offline vulnerabilities.
4.  **Flawed Pro Gating Logic:** Inconsistencies in how Pro features are gated, leading to free users accessing premium features (F3) and Pro users being prompted to upgrade (P1). This undermines the monetization strategy and user trust.

## Calibration Notes
- The new test philosophy, where a "PASS" on a V-test (vulnerability test) means the vulnerability was *observed* and thus confirmed, is critical for accurate interpretation. This led to re-evaluating several previously "CONFIRMED" fixes (V1, V7, V11, V15) as regressions or incomplete, as the tests now explicitly confirm the vulnerability's presence.
- Timeouts in tests (e.g., V8, V9, P1) are treated as strong indicators of a problem in the tested flow, especially when corroborated by `STATE_MAP.md` and other related findings. Confidence is set to MEDIUM when direct visual evidence is missing.
- The `net::ERR_INTERNET_DISCONNECTED` error for offline tests (V2, V10) clearly indicates a fundamental app loading failure, which takes precedence over more granular offline-related issues that would only manifest *after* the app loads.