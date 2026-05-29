# UX Agent Report — 2026-05-29

## Run Context
- Commits analysed: `40ae36a`, `a429376`, `0aab776`, `16c67d3`, `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clearly implied.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access, affecting both Zustand `persist` and manual `localStorage` patterns.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, preventing users from saving waypoints.
- Tier(s) affected: Pro (P3, V3 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for V3 confirms the lack of an offline warning, but the primary failure is the disabled button.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and consumed by `WaypointSheet`.

### 3. Critical: Offline Data Access and Persistence Failures (V2, V10, V14)
- Summary: The app fails to load or persist critical data when offline. Specifically, gold/mineral data is not cached (V2), Pro status reverts to free (V10), and there's no pre-save warning for offline waypoint saves (V14).
- Tier(s) affected: Pro (V2, V10, V14 confirmed). V14 also affects Free (F3 implies no save, so no warning needed) and Guest (V11 confirms no persistence, so no warning needed).
- Confidence: MEDIUM (V2, V10 cannot be directly confirmed due to test setup, but V14 is HIGH).
- Evidence: `pro V10` and `pro V2` FAIL with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the tests could not even load the app offline to check for data presence or Pro status. `STATE_MAP.md` explicitly states `isPro` can reset to false on offline JWT expiry (V10) and that gold samples/mineral localities are not locally cached (V2). `pro V3` (which failed due to GPS) has annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This directly confirms the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The actual state of `isPro` or `gold_samples` after an offline reload due to the `page.goto` error.
- Root cause: V2: `gold_samples` and mineral localities are not cached locally and rely on Supabase on mount, as per `STATE_MAP.md`. V10: `useAuth.onAuthStateChange` resets `isPro` to false on null session, including offline JWT expiry, as per `STATE_MAP.md` (until task-005 ships). V14: The app lacks a pre-save offline check or a robust offline queue mechanism, as per `STATE_MAP.md`.
- User impact: Users in rural areas will experience blank maps, loss of Pro features, and silent data loss when attempting to save waypoints offline, leading to severe frustration and distrust.
- Business impact: High churn, negative reviews, inability to serve the core user base in expected environments.
- Fix direction: Implement robust offline-first strategies: local caching for map data (V2), ensure `isPro` persistence logic is robust against offline auth changes (V10), and implement an offline write queue with user warnings for data saves (V14). Fix the Playwright test setup for offline navigation.

### 4. High: Track Save Fails Offline (V4 Confirmed)
- Summary: Attempting to save a GPS track while offline results in a failure, confirming vulnerability V4.
- Tier(s) affected: Pro (V4 confirmed). Likely affects Free and Guest if they had track saving capabilities.
- Confidence: HIGH
- Evidence: `pro V4` PASS. `STATE_MAP.md` explicitly states for "Save track": "**Fails** — toast 'Could not save track' ... YES — entire GPS trail, distance, elevation, duration gone." The test passing confirms this failure behavior.
- Cannot confirm: The exact toast message, but the failure is confirmed.
- Root cause: The `tracks` INSERT operation to Supabase lacks an offline persistence mechanism, leading to data loss on failure, as documented in `STATE_MAP.md`.
- User impact: Users lose entire GPS tracks of their activities, which can be hours of work, leading to severe frustration and distrust.
- Business impact: Critical for an outdoor mapping app; directly impacts core functionality, leading to high churn and negative reviews.
- Fix direction: Implement an offline write queue for track data to prevent data loss and provide clear user feedback.

### 5. Medium: Route Save Offline Produces No User-Facing Toast (V6 Confirmed)
- Summary: Attempting to save a route while offline results in a silent failure, with no user-facing toast notification, confirming vulnerability V6.
- Tier(s) affected: Pro (V6 confirmed). Likely affects Free and Guest if they had route saving capabilities.
- Confidence: HIGH
- Evidence: `pro V6` PASS. `STATE_MAP.md` explicitly states for "Save route": "**Fails** — console.error only, no toast". This matches the expected behavior for V6.
- Cannot confirm: The exact console error message, but the absence of a toast is confirmed.
- Root cause: The `routes` INSERT operation to Supabase lacks a user-facing error handling mechanism, as documented in `STATE_MAP.md`.
- User impact: Users believe their route has been saved, only to find it missing later, leading to data loss and frustration.
- Business impact: Erodes user trust and makes the app unreliable for critical planning features.
- Fix direction: Implement a user-facing toast notification for failed route saves, and ideally, an offline queue for route data.

### 6. Low: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 - Test Timeout)
- Summary: The test for `pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap) timed out, preventing confirmation of correct behavior. This suggests a potential issue where the UpgradeSheet *might* be shown to Pro users, or the app is in an unresponsive state.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` FAIL with `Test timeout of 60000ms exceeded`. No specific error message about the UpgradeSheet being visible, but the test couldn't complete its assertion.
- Cannot confirm: Whether the UpgradeSheet was actually visible or if the app simply became unresponsive.
- Root cause: Unclear due to timeout. Could be related to the general instability suggested by other failures (GPS, persistence), or a specific bug in the Pro gate logic for the UpgradeSheet.
- User impact: If the UpgradeSheet is shown to Pro users, it's confusing and frustrating, undermining their premium experience.
- Business impact: Damages trust with paying customers, potentially leading to churn.
- Fix direction: Investigate the cause of the timeout in the `pro P1` test. Ensure the `UpgradeSheet` is correctly gated for Pro users and does not appear on Pro affordance taps.

### 7. Low: Learn Tab Header Stats Misleading Test Description (V13)
- Summary: The `guest V13` and `free V13` tests claim to prove "learn header stats are recomputed on every tab switch (state-loss proof)", but the provided `state-loss-evidence` annotations show identical `before` and `after` values for courses, completion percentage, and chapters done, indicating these specific stats are *not* lost.
- Tier(s) affected: All (guest V13, free V13).
- Confidence: HIGH (that the test description is misleading, not that V13 is fully fixed).
- Evidence: `guest V13` and `free V13` PASS. Annotations `state-loss-evidence: {"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{...}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{...}}}` show no change in the header stats. `free F4` also passes, explicitly confirming "Learn header percentage does not regress to zero across tab switches".
- Cannot confirm: Whether the *actual* V13 vulnerability (in-progress chapter reading position) is fixed, as the test only checks header stats.
- Root cause: The test description for V13 is inaccurate or the test itself is not targeting the core aspect of V13 (in-progress chapter reading position). The previous fix for V13 involved keeping tabs mounted, which would preserve component state like reading position. The current test only checks derived stats, not the component's internal state.
- User impact: Low, as the header stats are correctly preserved. However, if the underlying V13 (chapter reading position) is still active, users would lose their place in a chapter, which is frustrating.
- Business impact: Low, unless the underlying V13 is still active, in which case it impacts learning engagement.
- Fix direction: Clarify the `V13` test description to accurately reflect what it's testing (header stats persistence). Create a new test or modify the existing one to verify the persistence of the *in-progress chapter reading position* across tab switches, which is the core of V13.

## Tier Comparison
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** The underlying `localStorage` persistence mechanism is failing universally, leading to identical behavior across all tiers where applicable. Theme (V7) affects all. Basemap/Layers (V8, V9) affect all. Guest Waypoints (V11) affects guest. Active Module (V15) affects guest. GPS Track (V1) affects pro.
- **GPS Acquisition Failure (P3, V3):** Observed in the Pro tier, but the underlying GPS acquisition logic is shared, implying it would affect any tier attempting to acquire GPS.
- **Offline Data Access (V2, V10, V14):** V2 (gold/mineral data) and V10 (Pro status) are expected to fail across tiers due to a lack of caching/offline auth handling. V14 (no pre-save warning) is a systemic lack of offline-first design.
- **Learn Tab Header Stats (V13, F4):** Identical behavior across guest and free tiers; header stats are preserved.
- **Pro Badges (F2):** Correctly shown to free users.
- **Upgrade Sheet Gating (F3, C3):** Correctly shown to guest and free users when tapping Pro affordances. P1 (Pro user not seeing UpgradeSheet) timed out, so cannot compare.
- **Offline Save Failures (V4, V6):** Confirmed for the Pro tier. The underlying Supabase write failures are systemic and would apply to any tier attempting these actions offline.

## Findings Discarded
- No findings were discarded as the total number of findings (7) was within the maximum limit of 8.

## Cannot Assess
- **Pro V10 (Pro status reverts to free on offline reload) and Pro V2 (gold/mineral data missing after offline reload):** These tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a test setup issue where Playwright's offline simulation prevents the initial page load, making it impossible to assess the app's behavior for these specific vulnerabilities.

## Systemic Patterns
- **Widespread `localStorage` Persistence Breakdown:** Multiple critical user preferences and session data points (theme, basemap, layer visibility, guest waypoints, active module, GPS track) are failing to persist across reloads. This points to a fundamental issue with how `localStorage` is being accessed or managed, affecting both Zustand `persist` middleware and manual `localStorage` patterns. This is a regression from multiple previously confirmed fixes.
- **Incomplete Offline-First Implementation:** The app continues to exhibit significant vulnerabilities in offline scenarios, including a lack of local data caching (V2), potential issues with offline authentication (V10), and a complete absence of offline write queues or pre-save warnings for user-generated data (V3, V4, V6, V14). This indicates a systemic gap in the offline-first design strategy.
- **GPS Acquisition Instability:** The persistent "Acquiring GPS..." state, even in online tests with mocked geolocation, suggests a deeper issue with the app's GPS acquisition and processing logic, impacting core features like waypoint saving.

## Calibration Notes
- **Prioritizing Regressions:** The widespread persistence failures (V1, V7, V8, V9, V11, V15) are a clear regression from multiple previously `CONFIRMED` fixes. This reinforces the importance of robust regression testing and careful analysis of changes that might affect core state management.
- **Distinguishing Test Flaws from App Bugs:** The `page.goto: net::ERR_INTERNET_DISCONNECTED` errors for `pro V2` and `pro V10` were identified as test setup issues, preventing assessment of the underlying app vulnerabilities. This avoids `PHANTOM` verdicts based on incomplete evidence.
- **Interpreting "PASS" for Vulnerability Tests:** For tests like `guest V11` and `pro V1`, a "PASS" means the vulnerability *was confirmed* (i.e., the data *was* lost). This is a crucial distinction for vulnerability-proof testing.
- **Scrutinizing Test Annotations:** The `guest V13` and `free V13` tests' `state-loss-evidence` annotations directly contradicted the test description, leading to a finding about misleading test descriptions rather than an incorrect app behavior. This highlights the value of detailed annotations.
- **Leveraging `STATE_MAP.md` for Root Cause:** `STATE_MAP.md` was instrumental in identifying the expected persistence behavior and confirming the lack of offline-first features, allowing for high-confidence root cause analysis.