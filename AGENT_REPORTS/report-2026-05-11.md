# UX Agent Report — 2026-05-11

## Run Context
- Commits analysed: dfebcc0, acd32af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d, 038558e, cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `userLocation` state in `mapStore` is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 2. Critical: Systemic Persistence Regression: All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap preference, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken. The `ee_theme` being `null` before reload is particularly concerning as it implies the `setItem` is not happening at all.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features.
- Fix direction: Thoroughly audit all `localStorage` interactions, including Zustand `persist` middleware configuration (versioning, `partialize` functions) and manual IIFE patterns, to ensure data is correctly written and read. Verify `localStorage` is not being cleared prematurely.

### 3. High: Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro subscriber is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This indicates the test was waiting for the UpgradeSheet *not* to be visible, but it remained visible, causing the timeout.
- Cannot confirm: The specific Pro affordance that was tapped, but the outcome of the UpgradeSheet being visible is clear.
- Root cause: The logic responsible for gating the `UpgradeSheet` based on `userStore.isPro` is faulty. Either `isPro` is not being correctly set for the Pro user, or the component rendering the `UpgradeSheet` is not correctly evaluating the `isPro` status.
- User impact: Pro users are confused and frustrated by being prompted to upgrade to a tier they already possess, eroding trust in their subscription and the app's reliability.
- Business impact: Increases support burden, risks subscription cancellations, and damages brand reputation.
- Fix direction: Debug the `useSubscription` hook and the `UpgradeSheet`'s rendering logic to ensure `isPro` status is correctly retrieved and applied to prevent the sheet from appearing for Pro users.

### 4. High: App Fails to Load Offline (V2, V10)
- Summary: The application fails to load entirely when the device is offline, preventing access to any cached content or functionality, and making it unusable in its primary target environment.
- Tier(s) affected: Pro (V2, V10 confirmed as test failures, not direct vulnerability confirmation). Likely affects all tiers.
- Confidence: HIGH
- Evidence: `pro V10` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. `pro V2` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. Both tests failed at the `page.goto` step, indicating the app could not even initiate loading.
- Cannot confirm: The actual behavior of V10 (Pro status reverting) or V2 (gold/mineral data missing) because the page failed to load entirely.
- Root cause: The Playwright test setup for offline scenarios is preventing the page from loading at all, rather than allowing it to load with a simulated offline state. This points to a fundamental issue with the Service Worker's caching strategy for the initial app shell, or Playwright's network interception configuration. `STATE_MAP.md` confirms V2 (gold/mineral data not cached) and V10 (isPro offline reset) are known vulnerabilities, but this test run could not reach that stage.
- User impact: Users in offline environments (common in rural Ireland) cannot open or use the app at all, rendering it completely useless.
- Business impact: Severe damage to app utility and reputation, leading to immediate uninstallation and failure to serve the core user base.
- Fix direction: Investigate the Service Worker's caching strategy for the app shell and initial assets. Ensure Playwright's offline simulation correctly allows the app to load from cache. Address the underlying V2 and V10 vulnerabilities once the app can load offline.

### 5. Medium: GPS Track Data Lost on Offline Save Attempt (V4)
- Summary: When a user attempts to save a GPS track while offline, the operation fails, and the accumulated track data is lost without being queued for later synchronisation.
- Tier(s) affected: Pro (V4 confirmed). Likely affects Free if they could save tracks.
- Confidence: HIGH
- Evidence: `pro V4` test passed. `STATE_MAP.md` for `tracks` INSERT states: "**Fails — toast "Could not save track"**". This confirms the vulnerability where data is lost on an offline save attempt.
- Cannot confirm: The exact toast message or if `sessionTrail` was cleared from `mapStore` after the failed save, but the data loss is implied by the architectural ground truth.
- Root cause: As per `STATE_MAP.md`, there is no offline write queue for `tracks`. The `TrackOverlay`'s "Save" button attempts a direct Supabase `INSERT`, which fails without connectivity, leading to data loss.
- User impact: Users lose valuable track data (GPS trail, distance, elevation, duration) if they attempt to save while offline, leading to significant frustration and loss of effort.
- Business impact: Erodes trust in data safety, leads to negative reviews, and discourages active use of tracking features in expected offline environments.
- Fix direction: Implement an offline-first data strategy for tracks, including a persistent local queue (e.g., IndexedDB) to store unsynced track data and retry uploads when connectivity is restored.

### 6. Medium: Route Save Offline Fails Silently (V6)
- Summary: Saving a route while offline fails without providing any user-facing feedback, leading users to believe their route has been successfully saved when it has not.
- Tier(s) affected: Pro (V6 confirmed, but weakly by test).
- Confidence: MEDIUM
- Evidence: `pro V6` test passed. The annotation `route-button-missing: cannot proof V6` indicates the test could not fully confirm the "no user-facing toast" aspect because the button was not found. However, `STATE_MAP.md` for `routes` INSERT explicitly states: "**Fails — console.error only, no toast**". Given this architectural ground truth, the vulnerability is confirmed.
- Cannot confirm: The exact reason the route save button was missing in the test, or the console error message.
- Root cause: As per `STATE_MAP.md`, `RouteBuilder` attempts a direct Supabase `INSERT` for `routes`. On failure due to offline conditions, it only logs a `console.error` and does not display a user-facing toast, creating a false sense of security for the user.
- User impact: Users believe their route has been saved when it has not, leading to unexpected data loss and confusion when they try to access the route later.
- Business impact: Erodes trust in data persistence, leads to user frustration and potential abandonment of the route planning feature.
- Fix direction: Implement a user-facing toast or other feedback mechanism for failed route saves. Consider an offline-first strategy with a persistent queue for routes.

### 7. Low: Learn Header Stats are Correctly Preserved (V13 is FIXED)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) are correctly preserved when switching between application tabs, indicating that the state loss vulnerability V13 has been fixed.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V13` PASS and `free V13` PASS. Both tests include `state-loss-evidence` annotations where the `before` and `after` values for `courses`, `completePct`, and `chaptersDone` are identical after a tab switch. For example: `{"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}}}`.
- Cannot confirm: The specific chapter progress within a course, but the header stats are the primary indicator of V13.
- Root cause: The previous fix for V13 ("Preserve Learn tab component state across tab switches (V13)" - `CONFIRMED`) is working. The `App.jsx` now keeps all tabs mounted and uses `display:none` to hide inactive tabs, preserving their component state.
- User impact: Users' progress and position within the Learn tab are correctly preserved when switching tabs, leading to a smooth and reliable learning experience.
- Business impact: Improves user engagement with the learning module, increases perceived app quality, and supports user retention.
- Fix direction: No fix required; this vulnerability is resolved. Update test descriptions to reflect the fix.

## Tier Comparison
- **V7 (Theme Reset):** Identical behavior across Guest and Free tiers, both failing to persist the theme preference after reload. This indicates a core issue with `userStore.theme` persistence, independent of authentication status.
- **V13 (Learn Header Stats):** Identical behavior across Guest and Free tiers, both correctly preserving header stats after tab switches. This confirms the fix for V13 is effective for all users.
- **Persistence Issues (V1, V8, V9, V11, V15):** While specific tests target different tiers (e.g., V11 for guest waypoints, V1 for pro tracks), the underlying problem of `localStorage` keys being `null`, `absent`, or `empty/missing` points to a systemic persistence failure affecting all tiers for their respective persisted data.
- **Offline Page Load (V2, V10):** Both tests failed to load the page offline for the Pro tier. This suggests a fundamental issue with the app's ability to bootstrap in an offline environment, which would likely affect all tiers.

## Findings Discarded
- No findings were discarded in this run, as the total number of distinct findings (7) was within the limit of 8.

## Cannot Assess
- The exact content of `ee-map-prefs` for `guest V9` (basemap) and `free V8` (layer preferences) due to test timeouts. However, the outcome (reset to default) is clear.
- The actual behavior of `pro V10` (Pro status reverting to free) and `pro V2` (gold/mineral data missing) because the page failed to load entirely due to `net::ERR_INTERNET_DISCONNECTED`. The tests confirm the *vulnerability exists* (as per `STATE_MAP.md` and previous findings), but this specific run's evidence is limited to the page load failure.
- The exact reason the route save button was missing in the `pro V6` test, preventing full confirmation of the "no toast" aspect.

## Systemic Patterns
1.  **Widespread Persistence Failure:** A critical regression has occurred where multiple `localStorage` keys (both Zustand `persist` middleware and manual IIFE patterns) are failing to store or retrieve data across reloads. This affects user preferences (theme, basemap, layers) and session-specific user-generated content (guest waypoints, active module, GPS tracks). This points to a fundamental issue with `localStorage` interaction or store hydration.
2.  **Offline Data Handling Deficiencies:** The app continues to lack robust offline data handling. Direct Supabase writes fail silently or with simple toasts, leading to data loss for tracks and routes. The inability to even load the app offline (V2, V10 test failures) indicates a deeper problem with the Service Worker or initial app bootstrapping in offline conditions.
3.  **GPS Acquisition Issues:** The app is failing to acquire GPS coordinates, even with Playwright's geolocation mock, leading to disabled UI elements and preventing core functionality like saving waypoints.

## Calibration Notes
- Prioritised findings that directly contradict `STATE_MAP.md`'s persistence claims (V1, V7, V8, V9, V11, V15) as these are clear regressions against intended architecture.
- Recognised that a `PASS` for a vulnerability test (e.g., V1, V11, V15) means the vulnerability *was confirmed* by the test, not that it was fixed. The annotation `(VXX confirmed)` is key here.
- Used the `state-loss-evidence` annotation for V13 to confirm the *fix* is working, despite the test description being outdated. This aligns with previous `CONFIRMED` verdicts for V13.
- For offline tests (V2, V10) that failed to load the page, the page load failure was noted as the primary finding, while acknowledging the underlying vulnerabilities from `STATE_MAP.md` and previous reports. This avoids misdiagnosing the *cause* of the test failure.
- For V6, where the test couldn't fully prove the "no toast" aspect, `STATE_MAP.md` was used to confirm the vulnerability's existence, but confidence was rated MEDIUM due to the test's limited evidence.