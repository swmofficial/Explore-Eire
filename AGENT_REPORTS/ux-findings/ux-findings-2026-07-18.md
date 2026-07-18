# UX Agent Report — 2026-07-18

## Run Context
- Commits analysed: `6392139a9cd3ba223eac46d418b07873178606d3` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Systemic Failure of Manual `localStorage` Persistence (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    - `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes (task-008, task-002, task-013, task-006).
- User impact: Loss of critical session data (e.g., a recorded track) and user preferences, leading to frustration and a perception of an unreliable application.
- Business impact: Reduces user trust, impacts retention, and makes the app less appealing for long-term use.
- Fix direction: Re-evaluate and debug the manual `localStorage` read/write implementations for all affected state keys.

### 4. Medium: Free Users Can Save Waypoints (F3 Regression)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to save waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed because it expected `upgradeShown` to be `true` but received `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the `WaypointSheet` was shown instead of the `UpgradeSheet`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet visible.
- Cannot confirm: The exact code path where the `isPro` check is being bypassed for this specific action.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action for free users, failing to gate the `WaypointSheet` behind a Pro subscription.
- User impact: Free users may attempt to save waypoints, only for the save operation to fail (due to lack of Pro features or the GPS issue), leading to confusion and frustration.
- Business impact: Undermines the value proposition of the Pro tier by allowing access to a gated feature, potentially reducing conversions.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when a free user taps the camera button.

### 5. Medium: Zustand `persist` Middleware Failures for Map Preferences (Vulnerability V8, V9)
- Summary: Map preferences, specifically the basemap and layer visibility, are not persisting across page reloads, reverting to default settings.
- Tier(s) affected: Guest (V9), Free (V8)
- Confidence: MEDIUM
- Evidence: `guest V9` (basemap resets) and `free V8` (layer preferences reset) both failed with `Test timeout`. While not direct `localStorage` content evidence, these timeouts occur after a reload where map state should be rehydrated. `STATE_MAP.md` indicates `mapStore.basemap` and `mapStore.layerVisibility` are persisted via Zustand `persist` middleware (`ee-map-prefs`).
- Cannot confirm: The exact content of `ee-map-prefs` in `localStorage` before and after reload, or if the timeout is due to a rendering issue rather than a persistence failure.
- Root cause: Likely a failure in the Zustand `persist` middleware for `mapStore` (`ee-map-prefs`), or a broader issue preventing the app from correctly loading or rendering the map after reload, which in turn prevents state verification.
- User impact: Users lose their preferred map view settings on every reload, requiring manual re-configuration and causing minor but persistent annoyance.
- Business impact: Degrades user experience, making the app feel less polished and reliable, potentially impacting long-term engagement.
- Fix direction: Investigate the Zustand `persist` middleware configuration for `mapStore` and ensure `ee-map-prefs` is correctly writing and reading `basemap` and `layerVisibility`.

### 6. Low: Pro User UpgradeSheet Check Timeout (P1)
- Summary: The test designed to verify that Pro users do not see the UpgradeSheet on Pro affordance tap timed out, preventing confirmation of this expected behavior.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`.
- Cannot confirm: Whether the UpgradeSheet was actually shown or not, or if the timeout is due to a general app loading issue (similar to V2/V10) or a specific Playwright selector/timing problem.
- Root cause: Unclear, but could be related to general app instability, a Playwright test flakiness, or a subtle UI rendering issue.
- User impact: No direct user impact confirmed, as this is a test failure, not a confirmed app bug.
- Business impact: Hinders automated verification of Pro tier benefits, potentially allowing regressions to go unnoticed.
- Fix direction: Debug the Playwright test for `pro P1` to ensure robust element selection and waiting strategies.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier explicitly fails to load with `net::ERR_INTERNET_DISCONNECTED`. This is a fundamental app shell loading issue, strongly inferred to affect Free users as well due to shared authentication and core app structure. Guest users are not tested for this specific failure mode, but would likely load the app shell without Supabase authentication issues.
*   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition failure. This is a core GPS functionality issue that would likely affect all tiers attempting to use GPS-dependent features.
*   **Manual `localStorage` Persistence (V1, V7, V11, V15):** This is a widespread issue affecting multiple manual `localStorage` keys across tiers:
    *   `V7` (theme) fails for both Guest and Free.
    *   `V11` (guest waypoints) fails for Guest.
    *   `V15` (active module) fails for Guest.
    *   `V1` (session trail) fails for Pro.
    This indicates a systemic problem with the manual `localStorage` read/write patterns, not specific to any single tier's data.
*   **Zustand `persist` Middleware (V8, V9):** `V9` (basemap) fails (timeout) for Guest, and `V8` (layer visibility) fails (timeout) for Free. This suggests a problem with the `ee-map-prefs` key or the map rendering after reload, affecting both Guest and Free users.
*   **Free Users Can Save Waypoints (F3):** This is a specific regression affecting only the Free tier, as Guest users cannot save waypoints at all, and Pro users are expected to save them.
*   **Learn Tab State (V13, F4):** Both Guest and Free tiers show identical header stats before and after tab switches, indicating that the *derived* header statistics are stable and not regressing. This does not provide evidence for component state *loss* for V13.

## Findings Discarded

*   **`pro V6` — route save offline produces no user-facing toast (silent failure):** This finding is discarded as PHANTOM. The test passed, but the annotation `route-button-missing: cannot proof V6` explicitly states that the test could not provide evidence for the vulnerability.
*   **`guest V13` and `free V13` — learn header stats are recomputed on every tab switch (state-loss proof):** This finding is discarded as PHANTOM for state *loss*. The `state-loss-evidence` annotation shows identical `before` and `after` values for the header stats. While the test description implies recomputation, the lack of *change* in values means no actual data loss is observed for these specific stats. The previous fix for V13 addressed component unmounting, which might be working correctly.

## Cannot Assess

*   The exact content of `ee-map-prefs` in `localStorage` for `guest V9` and `free V8` due to test timeouts. This prevents direct confirmation of whether the Zustand `persist` middleware is failing to write/read or if the app is simply failing to render the map after reload.
*   The root cause of the `pro P1` timeout, which prevents confirmation of whether Pro users correctly bypass the UpgradeSheet.

## Systemic Patterns

1.  **Critical Offline Capability Gap:** The most severe systemic issue is the complete failure of the application to load for authenticated users when offline. This points to a fundamental lack of Service Worker caching for the core application shell and essential initial data, making the app unusable in its primary target environment.
2.  **Widespread Persistence Regression:** There is a broad regression affecting both manual `localStorage` implementations (V1, V7, V11, V15) and Zustand `persist` middleware (V8, V9). This suggests a systemic issue with `localStorage` access, `Zustand` setup, or a general app loading problem preventing state rehydration across reloads.
3.  **Core GPS Functionality Breakdown:** The consistent failure to acquire GPS coordinates (P3, V3) indicates a problem with the `useTracks` hook or its interaction with the environment's geolocation API, rendering critical features like waypoint saving unusable.

## Calibration Notes

*   The re-confirmation of the critical offline loading issue (V2/V10) reinforces the importance of robust Service Worker implementation, a pattern previously identified and confirmed.
*   The recurrence of manual `localStorage` persistence failures (V1, V7, V11, V15) despite previous "CONFIRMED" fixes indicates that either the fixes were incomplete, have regressed, or a deeper, underlying issue with `localStorage` access exists. This highlights the need for more resilient persistence mechanisms or thorough regression testing.
*   The distinction between a test passing and a vulnerability being confirmed was crucial for V13 and V6, where the tests completed but did not provide direct evidence of the predicted vulnerability. This aligns with the "NEVER guess" rule.
*   Test timeouts (V8, V9, P1) are treated as strong indicators of problems, but with lower confidence than direct assertion failures, as the exact cause (persistence vs. rendering vs. test flakiness) is not fully discernible from the output alone.