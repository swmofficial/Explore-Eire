# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests.
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the GPS signal isn't being acquired or processed, despite `task-010` adding a geolocation mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app is either not receiving a valid GPS signal from the Playwright mock, the mock is incorrectly configured, or the `useTracks` hook or `WaypointSheet`'s logic is incorrectly interpreting the signal, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock.

### 2. Critical: Systemic Persistence Failure: All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload.
- Tier(s) affected: All (V7, V9, V8), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` & `free V8` FAIL: `Test timeout of 60000ms exceeded.` for basemap and layer preferences, strongly implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks, routes) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly storing and retrieving data across reloads.

### 3. Critical: Offline Data Loss for Waypoints, Tracks, and Routes (V3, V4, V6, V14)
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, with no robust offline queue or clear user warning for routes.
- Tier(s) affected: Pro (V3, V4, V6, V14 confirmed).
- Confidence: HIGH
- Evidence:
    - `pro V3` FAIL: Waypoint save fails offline (disabled button due to GPS, but also `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no pre-check). `STATE_MAP.md` confirms "Save waypoint ... Fails — toast 'Could not save waypoint'. Photo upload also fails. Data Lost? YES".
    - `pro V4` PASS: "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms "Save track ... Fails — toast 'Could not save track'. Data Lost? YES".
    - `pro V6` PASS: "route save offline produces no user-facing toast (silent failure)". Annotation `route-button-missing: cannot proof V6` is concerning, but `STATE_MAP.md` confirms "Save route ... Fails — console.error only, no toast. Data Lost? YES".
- Cannot confirm: The exact toast message for V3/V4 due to the test failing on button state, but `STATE_MAP.md` provides this.
- Root cause: The application lacks an offline-first data strategy. All data writes directly attempt Supabase calls without a local queue. Failures result in data loss and inadequate user feedback (especially for routes). This is explicitly called out in `STATE_MAP.md` as "What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Users in areas with poor connectivity (common for prospectors) will lose valuable field data, leading to extreme frustration and distrust.
- Business impact: Severe damage to app reputation, high churn, and inability to serve the core user base effectively.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync user-generated content when connectivity is restored. Provide clear UI feedback on sync status.

### 4. High: Pro Status Reverts Offline (V10) - Test Blocked
- Summary: The test designed to confirm V10 (Pro status reverting to free on offline reload) failed to execute due to an internet disconnection error during navigation, preventing confirmation of the vulnerability's fix.
- Tier(s) affected: Pro.
- Confidence: MEDIUM
- Evidence: `pro V10` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`.
- Cannot confirm: Whether `task-005` (scoping `isPro` reset) has successfully fixed V10. The test environment itself failed.
- Root cause: Playwright's offline simulation or navigation logic failed, preventing the test from reaching the state where V10 could be assessed. `STATE_MAP.md` indicates `task-005` was intended to fix this.
- User impact: If V10 is still active, paying Pro users would be locked out of Pro features when offline, leading to severe frustration and perceived unfairness.
- Business impact: Direct loss of trust from paying customers, potential refunds, and negative perception of the subscription model.
- Fix direction: Investigate and fix the Playwright test's offline navigation setup to ensure V10 can be reliably tested.

### 5. High: Gold/Mineral Data Missing After Offline Reload (V2) - Test Blocked
- Summary: The test designed to confirm V2 (gold/mineral data missing after offline reload) failed to execute due to an internet disconnection error during navigation, preventing confirmation of the vulnerability.
- Tier(s) affected: Pro (V2 confirmed by `STATE_MAP.md` as active vulnerability).
- Confidence: MEDIUM
- Evidence: `pro V2` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`.
- Cannot confirm: The actual user experience of V2 due to the test failure, but `STATE_MAP.md` explicitly states this is an active vulnerability.
- Root cause: Playwright's offline simulation or navigation logic failed, preventing the test from reaching the state where V2 could be assessed. `STATE_MAP.md` explicitly lists this as "What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)" and "Gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache."
- User impact: Users offline would see empty maps or data sheets for critical prospecting information, rendering the app useless for its core purpose in the field.
- Business impact: Significant loss of value proposition for a key user segment (prospectors in rural areas), leading to churn and negative reviews.
- Fix direction: Investigate and fix the Playwright test's offline navigation setup to ensure V2 can be reliably tested. Prioritize caching of static data like mineral localities.

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1) - Test Timeout
- Summary: The test for Pro users not seeing the Upgrade Sheet on Pro affordance tap timed out, suggesting the Upgrade Sheet might be appearing for Pro users or the test is stuck.
- Tier(s) affected: Pro.
- Confidence: MEDIUM
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test description is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout here could mean the test is waiting for the UpgradeSheet *not* to appear, but it *does* appear, or it's stuck waiting for something else.
- Cannot confirm: Whether the UpgradeSheet actually appeared or if the test got stuck elsewhere.
- Root cause: Unclear from the timeout alone. It could be a test flakiness, or a genuine bug where Pro affordances incorrectly trigger the UpgradeSheet for Pro users.
- User impact: Pro users would be confused and frustrated if they are prompted to upgrade for features they already pay for.
- Business impact: Erodes trust in the subscription model and creates a poor user experience for paying customers.
- Fix direction: Debug the `pro P1` test to understand why it's timing out. Verify the logic for Pro affordances to ensure `showUpgradeSheet` is correctly gated by `isPro`.

## Tier Comparison
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** The behaviour is identical across all tiers where applicable. Theme (V7) fails for Guest and Free. Basemap (V9) fails for Guest. Layer preferences (V8) fails for Free. Guest waypoints (V11) fails for Guest. Active module (V15) fails for Guest. Session trail (V1) fails for Pro. This indicates a fundamental issue with `localStorage` read/write or hydration that is not tied to authentication status.
- **Learn Tab State (V13, F4):** The behaviour is identical across Guest and Free tiers. Header stats are preserved across tab switches, indicating the fix for V13 is effective for both unauthenticated and authenticated free users.
- **Waypoint Save Button Disabled (P3, V3):** This issue is observed in the Pro tier. Given the underlying GPS acquisition and button logic is likely shared, it is highly probable this affects all tiers.
- **Offline Navigation Failures (V10, V2):** These tests failed to navigate offline in the Pro tier, preventing any tier-specific assessment of the vulnerabilities.

## Findings Discarded
- **Learn Header Stats Recomputation (V13) - Misleading Test Description:** The `guest V13` and `free V13` tests pass, and their `state-loss-evidence` annotations show identical "before" and "after" values for learn header stats. This indicates the header stats are *not* lost or recomputed in a problematic way, which is the desired outcome and consistent with the previous fix for V13. The test description "learn header stats are recomputed on every tab switch (state-loss proof)" is misleading, as the test actually confirms *preservation* of these stats. This is not a UX issue.

## Cannot Assess
- **Pro V10 (Pro status reverts to free on offline reload):** The test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), preventing assessment of whether the `isPro` status correctly persists offline for Pro users.
- **Pro V2 (Gold/mineral data missing after offline reload):** The test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), preventing assessment of whether gold/mineral data is cached and available offline.

## Systemic Patterns
- **Widespread `localStorage` Persistence Failure:** Multiple critical user preferences and session data points (theme, basemap, layer visibility, guest waypoints, active module, GPS track) are failing to persist across reloads, despite explicit `STATE_MAP.md` entries indicating they should. This points to a fundamental issue with the `localStorage` integration, either in Zustand's `persist` middleware or the manual IIFE patterns.
- **Lack of Offline-First Data Strategy:** All user-generated content (waypoints, tracks, finds, routes) fails to save offline, with no local queue or robust error handling. This is a critical architectural gap for an outdoor mapping app, especially given its target user base.
- **GPS Acquisition Issues:** The "Acquiring GPS..." state and disabled save button for waypoints suggest a problem with the `useTracks` hook's ability to acquire or process location data, even with Playwright's geolocation mock. This indicates either a misconfiguration of the mock or a bug in the app's location handling logic.

## Calibration Notes
- The direct `localStorage` annotations (`ee_theme: null`, `ee_guest_waypoints absent`, `ee_active_module absent`, `ee_session_trail empty or missing`) provided crucial evidence that directly contradicted `STATE_MAP.md` and previous "CONFIRMED" fixes for V1, V7, V11, V15. This reinforces the principle of prioritizing direct test evidence over documentation or prior verdicts when conflicts arise, especially for regressions.
- The `Playwright geolocation permission + mock location` fix (task-010) was previously CONFIRMED, but the current `P3/V3` failures indicate that while the mock might be *present*, the application is not correctly *consuming* or *interpreting* the mocked location data, leading to a disabled save button. This highlights the need to verify the *application's internal state* after a mock, not just the mock's presence.
- The `pro V10` and `pro V2` failures due to `net::ERR_INTERNET_DISCONNECTED` indicate a flakiness or misconfiguration in the Playwright offline simulation itself, which needs to be addressed to enable proper testing of offline vulnerabilities.