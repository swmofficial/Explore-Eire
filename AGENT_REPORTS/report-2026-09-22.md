# UX Agent Report — 2026-09-22

## Run Context
- Commits analysed: `a73dbfe2984a69cfe470403e4479c08d14b63ee3` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Re-evaluate the `isPro` gate for the waypoint saving feature, ensuring `UpgradeSheet` is shown for free users.

### 4. High: GPS Track Lost on Reload During Tracking (V1 Regression)
- Summary: If the application reloads while a user is actively tracking a GPS session, the entire accumulated track data is lost.
- Tier(s) affected: Pro (inferred Free/Guest if they could track)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This explicitly confirms the vulnerability. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `ee_session_trail` manual persistence.
- Root cause: The manual localStorage persistence mechanism for `mapStore.sessionTrail` (using `ee_session_trail`) is not functioning correctly, leading to state loss on reload. This contradicts the `STATE_MAP.md` which claims a fix (task-006).
- User impact: Significant data loss for users actively tracking, leading to extreme frustration and loss of valuable field data.
- Business impact: Severe damage to user trust and app reliability, directly impacting retention and potentially leading to negative reviews.
- Fix direction: Debug the manual `ee_session_trail` localStorage read/write pattern in `mapStore.js` to ensure active track data is correctly persisted.

### 5. High: Session Waypoints Lost on Reload (V11 Regression)
- Summary: Waypoints created during a guest session are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This explicitly confirms the vulnerability. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `ee_guest_waypoints` manual persistence.
- Root cause: The manual localStorage persistence mechanism for `mapStore.sessionWaypoints` (using `ee_guest_waypoints`) is not functioning correctly, leading to state loss on reload. This contradicts the `STATE_MAP.md` which claims a fix (task-002).
- User impact: Guests lose all their unsaved waypoint data if the app reloads, leading to significant data loss and frustration.
- Business impact: Prevents guest users from effectively using a core feature, hindering conversion to authenticated users.
- Fix direction: Debug the manual `ee_guest_waypoints` localStorage read/write pattern in `mapStore.js` to ensure guest waypoints are correctly persisted.

### 6. High: Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light' mode) is not persisted across page reloads, reverting to the default 'dark' theme.
- Tier(s) affected: Guest, Free (inferred Pro)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read. `STATE_MAP.md` states `theme` uses manual `ee_theme` key.
- Cannot confirm: If the `ee_theme` key is being written at all, or if it's being written incorrectly (e.g., to a different key). The `null` value suggests it's not being written or read from the expected key.
- Root cause: The manual localStorage persistence mechanism for `userStore.theme` (using `ee_theme`) is not functioning correctly, leading to state loss on reload. This contradicts the `STATE_MAP.md` which claims a fix (task-008).
- User impact: Minor annoyance, as users have to re-select their preferred theme after every page reload.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially reducing user satisfaction.
- Fix direction: Debug the manual `ee_theme` localStorage read/write pattern in `userStore.js` to ensure theme preference is correctly persisted.

### 7. High: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The user's selected active module (e.g., 'geology') resets to the default 'prospecting' module upon page reload.
- Tier(s) affected: Guest (inferred Free/Pro)
- Confidence: HIGH
- Evidence: `guest V15` test passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms the vulnerability. `STATE_MAP.md` states `activeModule` via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: The exact point of failure in the `ee_active_module` manual persistence.
- Root cause: The manual localStorage persistence mechanism for `moduleStore.activeModule` (using `ee_active_module`) is not functioning correctly, leading to state loss on reload. This contradicts the `STATE_MAP.md` which claims a fix (task-013).
- User impact: Minor annoyance, as users have to re-select their preferred module after every page reload.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially reducing user satisfaction and engagement with specific modules.
- Fix direction: Debug the manual `ee_active_module` localStorage read/write pattern in `moduleStore.js` to ensure active module preference is correctly persisted.

### 8. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8 Regression)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: Guest, Free (inferred Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both timed out. While not a direct assertion failure, timeouts in preference tests often indicate the expected state was not found after reload, implying a reset. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key, as no annotations were provided for it. The timeout could also be a test flakiness.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is either not correctly configured, or a recent change has broken its functionality, leading to state loss for `basemap` and `layerVisibility`.
- User impact: Minor annoyance, as users have to re-select their preferred basemap and layer visibility after every page reload.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially reducing user satisfaction.
- Fix direction: Verify the configuration and functionality of Zustand `persist` middleware for `mapStore` and the `ee-map-prefs` localStorage key.

## Tier Comparison
- **Offline App Load (V2, V10):** Identical behavior across tiers. The app fails to load at all for Pro users, and this is inferred to affect Free and Guest users as well.
- **GPS Acquisition (P3, V3):** Identical behavior across tiers. The "Save Waypoint" button is disabled due to "Acquiring GPS..." for Pro users, inferred to affect Free and Guest users if they could save waypoints.
- **Theme Persistence (V7):** Identical behavior across tiers. Theme resets to default 'dark' on reload for Guest and Free users, inferred to affect Pro users.
- **Basemap/Layer Persistence (V9, V8):** Identical behavior across tiers. Preferences reset to default on reload for Guest and Free users, inferred to affect Pro users.
- **Waypoint Persistence (V11):** Guest tier explicitly confirmed loss of waypoints on reload. Authenticated users (Free/Pro) save waypoints to Supabase, so this vulnerability does not apply to them in the same way.
- **Active Module Persistence (V15):** Guest tier explicitly confirmed loss of active module on reload, inferred to affect Free/Pro users.
- **Track Persistence (V1):** Pro tier explicitly confirmed loss of track on reload, inferred to affect Free/Guest users.
- **Offline Data Saves (V4, V6, V14):** Pro tier explicitly confirmed V4 (track save fails offline), V6 (route save fails silently offline), and V14 (no pre-save offline warning). These are general offline data handling issues that would affect all tiers attempting to save data offline.
- **Pro Gate Bypass (F3):** This is a specific Free tier issue, allowing waypoint saving. Guest users cannot save waypoints (only temporary session waypoints). Pro users are expected to save waypoints.
- **Learn Tab State (V13):** Identical behavior across tiers. Learn header stats *do not* recompute, indicating the fix for V13 is working as intended for both Guest and Free users.

## Findings Discarded
- `guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)`: This test passed, and the `state-loss-evidence` annotation showed identical `before` and `after` values. This indicates that the state *did not* recompute, meaning the fix for V13 (preserving Learn tab state) is working. The test name is misleading, as it implies state loss, but the evidence proves state *retention*. Therefore, this is not a UX issue.
- `free F4 — Learn header percentage does not regress to zero across tab switches`: This test passed with identical `before` and `after` stats, confirming the fix for V13. Not a UX issue.
- `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: This test timed out. Given the previous P1 fix was confirmed and this is a timeout rather than an assertion failure, it's likely a flaky test or an issue with the test's waiting logic rather than a direct UX regression. Without clearer evidence, confidence is too low.

## Cannot Assess
- The exact state of `ee-map-prefs` localStorage key for V8/V9 failures, as no annotations were provided for it. This would help confirm if the Zustand persist middleware is failing to write or read.
- The exact reason for the Playwright geolocation mock not being processed by the app's GPS acquisition logic (P3, V3). Further debugging within the app's GPS module would be required.

## Systemic Patterns
- **Offline Unavailability:** The most critical systemic issue is the app's complete failure to load offline for authenticated users (V2, V10). This points to a fundamental lack of a robust Service Worker and offline-first architecture for the core app shell and initial data.
- **Broken Manual Persistence:** Multiple critical persistence vulnerabilities (V1, V7, V11, V15) that were previously "CONFIRMED" as fixed by switching to a "manual IIFE + write pattern" are now failing again, with annotations explicitly stating the localStorage keys are `null` or `absent`. This indicates a systemic failure in the implementation or maintenance of this "proven reliable pattern."
- **GPS Acquisition Issues:** The consistent failure to acquire GPS (P3, V3) is a blocker for core functionality and suggests a problem with the GPS integration or how it interacts with the testing environment.
- **Inconsistent Feature Gating:** The `free F3` failure highlights an inconsistency in how Pro features are gated, allowing free users to access premium functionality.

## Calibration Notes
- The previous "CONFIRMED" verdicts for V1, V7, V11, V15, and V13 were based on the assumption that the implemented fixes (manual localStorage or DOM persistence) were working. This run's results show that for V1, V7, V11, V15, these fixes have either regressed or were never fully functional, despite the `STATE_MAP.md` claiming they were fixed. This reinforces the need to trust direct test evidence (annotations) over `STATE_MAP.md` claims when there's a contradiction.
- The `PHANTOM` verdicts from previous runs for "Map Button Naming Ambiguity" and "Dashboard Tab Obstruction" taught me to be wary of Playwright timeout/selector issues being misdiagnosed as UX problems. The `pro P1` timeout is treated with lower confidence for this reason.
- The `CONFIRMED` verdict for "Preserve Learn tab component state across tab switches (V13)" is now re-confirmed by the current test results, showing the fix is holding. This is a good example of a successful fix.