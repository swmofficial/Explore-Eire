# UX Agent Report — 2026-09-25

## Run Context
- Commits analysed: `d59010383856915a28a97acd0bbe5a98418f43e7` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
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

### 3. High: Free Users Bypass Pro Gate for Waypoint Saving (F3 Regression)
- Summary: Free tier users are able to access and attempt to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the client-side gating logic for the camera button to display the `UpgradeSheet` for free users.

### 4. High: Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, regardless of authentication status.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both show `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: The exact line of code causing the `ee_theme` key to be `null` before and after reload.
- Root cause: The manual `localStorage` persistence for `userStore.theme` (via `ee_theme`, task-008) is not functioning correctly, or the test setup for `ee_theme` is flawed. `STATE_MAP.md` claims `ee_theme` is persisted.
- User impact: Minor annoyance, as the app fails to remember a basic personalization setting, leading to a less consistent user experience.
- Business impact: Small erosion of user trust and personalization, potentially contributing to a perception of an unreliable app.
- Fix direction: Debug the `userStore.theme` persistence logic to ensure `ee_theme` is correctly written to and read from `localStorage`.

### 5. High: Session Waypoints Lost on Reload (V11 Regression)
- Summary: Waypoints created during a guest session are lost upon page reload, despite `STATE_MAP.md` indicating intended persistence.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly confirms the vulnerability.
- Cannot confirm: The exact line of code causing the `ee_guest_waypoints` key to be absent after reload.
- Root cause: The manual `localStorage` persistence for `mapStore.sessionWaypoints` (via `ee_guest_waypoints`, task-002) is not functioning correctly. `STATE_MAP.md` claims `ee_guest_waypoints` is persisted.
- User impact: Loss of unsaved work, frustrating for guests exploring the app and potentially creating content.
- Business impact: Reduces engagement for potential users, hindering conversion from guest to authenticated user.
- Fix direction: Debug the `mapStore.sessionWaypoints` persistence logic to ensure `ee_guest_waypoints` is correctly written to and read from `localStorage`.

### 6. High: GPS Track Lost on Reload (V1 Regression)
- Summary: An active GPS track, accumulated during a session, is lost upon page reload, despite `STATE_MAP.md` indicating intended persistence.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability.
- Cannot confirm: The exact line of code causing the `ee_session_trail` key to be empty or missing after reload.
- Root cause: The manual `localStorage` persistence for `mapStore.sessionTrail` (via `ee_session_trail`, task-006) is not functioning correctly. `STATE_MAP.md` claims `ee_session_trail` is persisted.
- User impact: Loss of potentially hours of recorded activity, leading to extreme frustration and distrust in the app's core tracking functionality.
- Business impact: Severe damage to user trust and app reliability, especially for a key feature like tracking.
- Fix direction: Debug the `mapStore.sessionTrail` persistence logic to ensure `ee_session_trail` is correctly written to and read from `localStorage`.

### 7. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8 Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their defaults upon page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. This indicates the app state was not as expected after reload, preventing the test from completing its assertions. Given the other persistence regressions (V7, V11, V15, V1), it's highly probable these are also failing.
- Cannot confirm: The specific state of `basemap` or `layerVisibility` after reload, as the tests timed out before asserting.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is likely not functioning correctly, or there's an issue with its hydration on reload. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs`.
- User impact: Annoyance, users must reconfigure their map view (basemap, visible layers) after every reload.
- Business impact: Minor friction, but contributes to a perception of an unreliable app, especially for power users who customize their map view.
- Fix direction: Debug the `mapStore` Zustand `persist` configuration and ensure `basemap` and `layerVisibility` are correctly saved and restored.

### 8. Medium: Active Module Resets on Reload (V15 Regression)
- Summary: The `activeModule` preference resets to its default ('prospecting') upon page reload, despite `STATE_MAP.md` indicating intended persistence.
- Tier(s) affected: All (Guest)
- Confidence: HIGH
- Evidence: `guest V15` test passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly confirms the vulnerability.
- Cannot confirm: The exact line of code causing the `ee_active_module` key to be absent after reload.
- Root cause: The manual `localStorage` persistence for `moduleStore.activeModule` (via `ee_active_module`, task-013) is not functioning correctly. `STATE_MAP.md` claims `ee_active_module` is persisted.
- User impact: Minor annoyance, user has to re-select their preferred module after every reload.
- Business impact: Small friction in user workflow, potentially impacting engagement with specific modules.
- Fix direction: Debug the `moduleStore.activeModule` persistence logic to ensure `ee_active_module` is correctly written to and read from `localStorage`.

## Tier Comparison

-   **Offline Loading (V2, V10):** Pro users experience complete app failure (`net::ERR_INTERNET_DISCONNECTED`). This is a critical difference from Guest/Free, who might experience partial loading or different errors if tested for this.
-   **GPS Acquisition (P3, V3):** Pro users experience a disabled "Save Waypoint" button due to "Acquiring GPS...". This behavior is likely consistent across all tiers if they were to attempt waypoint saving.
-   **Waypoint Saving Gate (F3):** Free users can bypass the Pro gate and open the `WaypointSheet`, while Pro users (ideally) should not see an `UpgradeSheet`. Guest users are explicitly memory-only for waypoints (V11).
-   **Theme Persistence (V7):** Guest and Free users both experience theme reset. This suggests a universal issue with the `ee_theme` persistence mechanism, not tied to authentication status.
-   **Basemap/Layer Persistence (V9, V8):** Guest and Free users both experience timeouts, strongly implying persistence failure. This suggests a universal issue with `ee-map-prefs` persistence.
-   **Session Waypoint Persistence (V11):** Guest users lose waypoints. This is specific to guest sessions.
-   **Active Module Persistence (V15):** Guest users experience module reset. This is likely universal.
-   **GPS Track Persistence (V1):** Pro users lose tracks. This is likely universal for any user tracking.
-   **Learn Tab State (V13, F4):** Guest and Free users both show *no* state loss for header stats, indicating the fix is working for this aspect across tiers.

## Findings Discarded

-   **`pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap):** This test timed out. Given the critical GPS acquisition failure (Finding 2) which blocks the primary Pro affordance (waypoint saving), and the F3 finding (free users *can* save waypoints), it's unclear if P1 is failing because the Pro affordance itself is broken, or if the `UpgradeSheet` *is* appearing for Pro users (which would be a bug), or if the test is simply stuck. The GPS issue is a higher priority blocker.
-   **`pro V6` (route save offline produces no user-facing toast):** The test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test itself is not robust enough to confirm the *absence* of a toast. While `STATE_MAP.md` confirms the silent failure ("console.error only, no toast"), the test's inability to provide direct evidence for the *lack* of a toast makes it a weak finding. It is suppressed as a primary finding for this run, but the vulnerability remains noted in `STATE_MAP.md`.

## Cannot Assess

-   The exact reason for the Playwright geolocation mock failure, specifically why the app's GPS acquisition logic isn't correctly processing the mocked location.
-   The precise cause of the `localStorage` persistence regressions (V1, V7, V11, V15) beyond the observation that the keys are absent or empty. Further code inspection would be needed to pinpoint whether it's an `setItem` failure, an `getItem` failure, or a race condition.

## Systemic Patterns

-   **Widespread Persistence Regressions:** Multiple manual `localStorage` persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and the Zustand `persist` middleware (`ee-map-prefs`) appear to be broken or incomplete. This leads to widespread loss of user preferences and unsaved work (waypoints, tracks) on page reload, indicating a systemic issue with how state persistence is implemented or tested across the application.
-   **Fundamental Offline Unusability:** The application completely fails to load for authenticated users when offline, indicating a critical lack of comprehensive offline-first architecture beyond basic map tile caching. This renders the app unusable in its primary target environment.
-   **GPS Dependency and Failure:** Critical user-generated content features (waypoint saving, tracking) are blocked by a persistent GPS acquisition failure. This suggests a problem with the geolocation API integration, its interaction with Playwright mocks, or the internal state management of `userLocation`.

## Calibration Notes

-   The "vulnerability-proof test philosophy" was crucial in interpreting "PASS" results for V1, V11, V15, where the pass condition was explicitly to *confirm* the vulnerability (e.g., `ee_session_trail empty or missing (V1 confirmed)`). This allowed for accurate identification of regressions despite a "PASS" status.
-   Prioritized findings based on direct evidence from error messages and explicit annotations, especially for critical blockers like offline loading and GPS acquisition.
-   Treated timeouts (V8, V9, P1) with caution, inferring confidence based on surrounding evidence and `STATE_MAP.md`, rather than assuming a specific failure mode without direct proof.
-   Recognized that `STATE_MAP.md` serves as the architectural ground truth, which can inform confidence even when test evidence is indirect or incomplete (e.g., for V6, though it was discarded for weak proof).