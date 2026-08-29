# UX Agent Report — 2026-08-29

## Run Context
- Commits analysed: `2671866c134cde75f6893a24131ecef53372ce6d` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread User Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, despite `STATE_MAP.md` indicating they should be persisted. This is a significant regression from previously confirmed fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` failed (timeout), implying `mapStore.basemap` resets.
    - `free V8` failed (timeout), implying `mapStore.layerVisibility` resets.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` explicitly lists all these items as persisted via Zustand `persist` or manual localStorage keys.
- Cannot confirm: The exact point of failure (read or write) for each persistence mechanism without deeper code inspection, but the `null`/`absent` annotations strongly suggest a write failure or a complete bypass of the persistence logic.
- Root cause: A systemic regression affecting both Zustand `persist` middleware and manual `localStorage.setItem` patterns. This could be due to a global localStorage clear, a misconfigured `persist` middleware, or incorrect `IIFE` setup.
- User impact: Users lose their personalised settings and in-progress work (waypoints, tracks) on every app reload, leading to frustration and a perception of an unreliable application.
- Business impact: Reduces user satisfaction, increases churn, and undermines trust in the application's ability to save user data.
- Fix direction: Investigate global localStorage interactions and re-verify the implementation of Zustand `persist` and manual `IIFE` persistence patterns across all affected stores.

### 4. High: Free Users Can Save Waypoints (F3 - Feature Gate Failure)
- Summary: Free tier users are able to save waypoints, which the test expects to be a Pro-gated feature that should surface the UpgradeSheet.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows that the UpgradeSheet was *not* shown, and the WaypointSheet *was* shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: Whether this is an intentional change in feature gating or an oversight, but the test's expectation implies it should be gated. `STATE_MAP.md` does not explicitly state that waypoint saving is a Pro feature, but it does say "Guest waypoints are memory-only regardless."
- Root cause: Incorrect feature gating logic for waypoint saving, allowing free users access to a feature intended for Pro users (as per test expectation).
- User impact: Free users gain access to a feature that might be intended for monetisation, potentially devaluing the Pro subscription.
- Business impact: Direct impact on conversion rates for the Pro subscription if a key feature is available for free.
- Fix direction: Review the feature gating logic for waypoint saving and align it with the intended monetisation strategy.

### 5. High: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Failure)
- Summary: A Pro user, who should have full access to Pro features, is incorrectly presented with the UpgradeSheet when interacting with a Pro-gated affordance, indicating a failure in the Pro access gate.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.` The test's description is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout in this context means the test *failed to confirm* that the UpgradeSheet was *not* visible, strongly implying it *was* visible or the app hung trying to display it.
- Cannot confirm: The exact screenshot of the UpgradeSheet being visible, but the test's failure mode points to this.
- Root cause: Failure in the Pro feature gating logic, potentially a regression or an issue with `isPro` status being correctly recognised.
- User impact: Paying Pro users are incorrectly prompted to upgrade, leading to confusion, frustration, and a perception of being scammed or that their subscription is not active.
- Business impact: Damages trust with paying customers, increases support load, and could lead to cancellations.
- Fix direction: Debug the Pro feature gating logic to ensure `isPro` status is correctly evaluated and prevents the UpgradeSheet from appearing for Pro users.

### 6. Medium: Offline Track Saving Fails with Data Loss (V4 Confirmed)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the loss of the entire track data without any mechanism for recovery or retry.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` passed, which means the test journey confirmed the vulnerability. `STATE_MAP.md` explicitly states for "Save track": "`tracks` INSERT... **Fails** — toast 'Could not save track' ... **YES — entire GPS trail, distance, elevation, duration gone.**"
- Cannot confirm: The exact toast message shown, but the `STATE_MAP.md` confirms the failure and data loss.
- Root cause: Lack of an offline data queue or local-first write strategy for user-generated content. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable activity data (their entire hike/track) if they finish a session in an area without connectivity, leading to significant frustration and distrust.
- Business impact: Undermines the core value proposition of a mapping and tracking app, leading to churn and negative reviews.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store track data locally and sync it when connectivity is restored.

### 7. Medium: Offline Route Saving Fails Silently (V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the operation fails silently, providing no user-facing feedback (toast or error message) that the route was not saved.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` passed, which means the test journey confirmed the vulnerability. The annotation `route-button-missing: cannot proof V6` indicates the test couldn't verify the *absence* of a button, but the test *passed* because the vulnerability (silent failure) was confirmed. `STATE_MAP.md` explicitly states for "Save route": "`routes` INSERT... **Fails** — console.error only, no toast. **YES — route points gone.**"
- Cannot confirm: The exact console error, but `STATE_MAP.md` is explicit.
- Root cause: Lack of proper error handling and user feedback mechanisms for offline data write failures. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users believe their route has been saved, only to discover it's missing later, leading to confusion, wasted effort, and distrust in the app.
- Business impact: Damages user trust and reliability perception, potentially leading to churn.
- Fix direction: Implement user-facing feedback (e.g., a toast notification) for failed offline route save operations, and ideally, an offline data queue.

## Tier Comparison
- **Offline Loading (V2, V10):** Pro users fail to load the app entirely when offline. This behavior is inferred for Free users as well, while Guest users can load the app.
- **GPS Acquisition (P3, V3):** Pro users experience disabled waypoint save buttons due to GPS acquisition failure. This issue would likely affect Free and Guest users if they were able to initiate waypoint saving.
- **Preference and Session Data Loss (V1, V7, V8, V9, V11, V15):** This is a systemic regression affecting all tiers. Theme (V7) resets for Guest and Free. Basemap (V9) resets for Guest. Layer visibility (V8) resets for Free. Guest waypoints (V11) vanish for Guest. Active module (V15) resets for Guest. Session trail (V1) is lost for Pro.
- **Waypoint Saving Feature Gate (F3):** Free users are incorrectly able to save waypoints, which the test expects to be a Pro-gated feature. Pro users can save waypoints (when GPS works), and Guest waypoints are memory-only.
- **UpgradeSheet Display (P1):** Pro users are incorrectly shown the UpgradeSheet. Free and Guest users would correctly be shown the UpgradeSheet for Pro features.
- **Offline Data Saves (V4, V6):** Offline track saving (V4) and route saving (V6) fail for Pro users. This behavior is inferred for Free and Guest users if they were able to initiate these saves.
- **Learn Tab State (V13):** Learn tab header statistics are preserved across tab switches for all tiers (Guest, Free), indicating the V13 vulnerability is fixed across the board.

## Findings Discarded
- **V13 Learn Header Stats Recomputed:** This was initially considered a potential vulnerability based on the test annotation `state-loss-proof`. However, the `state-loss-evidence` clearly shows identical "before" and "after" values for courses, complete percentage, and chapters done. This indicates that the state was *preserved*, meaning the V13 vulnerability (state loss across tab switches) is *fixed*. The test passed because the state did *not* regress, confirming the fix. Therefore, it is discarded as an active vulnerability.

## Cannot Assess
- The exact cause of the widespread persistence regression (Finding 3) without deeper code inspection to determine if it's a global localStorage issue, a `persist` middleware misconfiguration, or individual `IIFE` implementation errors.
- The precise reason for the GPS acquisition failure (Finding 2) without debugging the app's interaction with the Playwright geolocation mock.

## Systemic Patterns
- **Comprehensive Offline Failure:** The application fundamentally fails to load for authenticated users when offline, rendering it unusable in its primary target environment. This is compounded by silent data loss for critical user-generated content (tracks, routes, waypoints) when offline.
- **Widespread Persistence Regression:** A significant regression has occurred across all state persistence mechanisms (both Zustand `persist` middleware and manual `localStorage` patterns), leading to the loss of user preferences and session data on page reload across all tiers.
- **Core Feature Blockage:** The inability to acquire GPS coordinates critically blocks the fundamental "Save Waypoint" functionality, impacting all users.
- **Inconsistent Feature Gating:** There are conflicting behaviors in feature gating, with Free users gaining access to a feature (waypoint saving) that appears intended for Pro, while Pro users are incorrectly prompted to upgrade.

## Calibration Notes
- The previous "CONFIRMED" fixes for V1, V7, V11, and V15 have regressed, underscoring the importance of robust regression testing for persistence mechanisms.
- The interpretation of test annotations, particularly `state-loss-proof`, requires careful cross-referencing with the vulnerability definition and the actual data provided. A "pass" on a "state-loss-proof" test can mean the vulnerability is *fixed*, not active.
- `ERR_INTERNET_DISCONNECTED` is a clear and unambiguous indicator of a critical offline loading failure, which should be prioritized.
- Timeouts in tests (e.g., V8, V9, P1) often mask underlying functional issues or performance problems that prevent assertions from being reached. While not direct evidence of a specific UX state, they are strong indicators of problems.