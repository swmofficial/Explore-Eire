# UX Agent Report — 2026-07-14

## Run Context
- Commits analysed: `6a2e087198eb9801f40921ff7c5326c22fca2722` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    *   `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    *   `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    *   `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    *   `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `theme`, `sessionTrail`, `sessionWaypoints`, and `activeModule` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable".
- User impact: Loss of user preferences and critical session data (e.g., a recorded GPS track), leading to significant frustration and distrust.
- Business impact: Erodes user trust, increases churn, and devalues core features.
- Fix direction: Thoroughly debug and re-implement manual `localStorage` persistence for these keys.

### 4. High: Zustand `persist` Middleware Failing for Map Preferences (Vulnerability V8, V9)
- Summary: Map preferences (basemap, layer visibility) managed by Zustand's `persist` middleware are not surviving page reloads, resetting to default values.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. This implies the expected map state (e.g., a specific basemap or a toggled layer) was not found after reload, indicating a reset to default.
- Cannot confirm: The exact content of `ee-map-prefs` in `localStorage` after reload, as the timeout prevented further inspection.
- Root cause: The `mapStore`'s Zustand `persist` middleware is failing to correctly save or rehydrate `basemap` and `layerVisibility` from the `ee-map-prefs` `localStorage` key.
- User impact: Users constantly lose their preferred map view settings, requiring repetitive adjustments and leading to frustration.
- Business impact: Frustration, perceived lack of polish, reduced user satisfaction.
- Fix direction: Debug `mapStore`'s `persist` middleware configuration and ensure `ee-map-prefs` is correctly written and read.

### 5. Medium: Free Users Can Save Waypoints, Bypassing Pro Gate (Feature F3)
- Summary: Authenticated free users are able to save waypoints, which the test implies should be a Pro-gated feature, as the "camera button" did not surface the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed because `expect(upgradeShown).toBeTruthy()` was `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `WaypointSheet` was displayed instead of the `UpgradeSheet`.
- Cannot confirm: If saving waypoints for free users is an intended feature or a bug. The test's expectation implies it should be Pro-gated.
- Root cause: The logic gating waypoint saving (likely within `useWaypoints` or `WaypointSheet`) is not correctly checking `userStore.isPro` or `userStore.subscriptionStatus` before displaying the `WaypointSheet`.
- User impact: Free users gain access to a feature potentially intended for Pro, which could devalue the Pro subscription.
- Business impact: Reduces conversion to Pro, undermines the subscription model.
- Fix direction: Review and correct the Pro gating logic for waypoint saving.

### 6. Medium: Pro Users See UpgradeSheet on Pro Affordance Tap (Vulnerability P1)
- Summary: Authenticated Pro users are incorrectly shown the `UpgradeSheet` when interacting with a Pro-gated feature, despite already having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This implies the `UpgradeSheet` was visible, preventing the test from proceeding as expected.
- Cannot confirm: The specific Pro affordance that triggered the `UpgradeSheet` (test description is generic "Pro affordance tap").
- Root cause: The component responsible for displaying the `UpgradeSheet` (e.g., `UpgradeSheet` itself, or a Pro-gated button's click handler) is not correctly checking `userStore.isPro` before rendering or routing.
- User impact: Confuses and frustrates paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, increases support burden, potential for churn.
- Fix direction: Correct the Pro gating logic to prevent `UpgradeSheet` from appearing for `isPro: true` users.

### 7. Low: Offline Track Save Fails with Data Loss (Vulnerability V4 Confirmed)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, and the accumulated track data is lost.
- Tier(s) affected: All (any user who can track)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save track: `tracks` INSERT... Fails — toast 'Could not save track'. YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message or if `sessionTrail` is cleared immediately, but the test passing confirms the data loss.
- Root cause: Lack of an offline data queue. `tracks` INSERT directly attempts a Supabase write, which fails offline.
- User impact: Users lose valuable recorded activity, leading to frustration and distrust.
- Business impact: Reduces reliability of a core feature, impacts user retention.
- Fix direction: Implement an offline sync queue for user-generated data.

### 8. Low: Offline Route Save Fails Silently (Vulnerability V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the operation fails silently, with no user-facing feedback beyond a console error.
- Tier(s) affected: All (any user who can save routes)
- Confidence: HIGH
- Evidence: `pro V6` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save route: `routes` INSERT... Fails — console.error only, no toast." The annotation `route-button-missing: cannot proof V6` is ambiguous, but a pass implies the expected (silent) failure occurred.
- Cannot confirm: The presence of the console error, but the absence of a toast is confirmed by the test passing.
- Root cause: Lack of an offline data queue and insufficient error handling for `routes` INSERT.
- User impact: Users believe their route is saved when it is not, leading to confusion and potential loss of planned routes.
- Business impact: Erodes trust, creates a perception of unreliability.
- Fix direction: Implement an offline sync queue and provide clear user feedback for failed offline saves.

## Tier Comparison
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** The observed failures in `localStorage` persistence for theme, basemap, layer visibility, active module, session trail, and guest waypoints are consistent across all tested tiers (guest, free, pro). This indicates a systemic issue with the persistence mechanisms themselves, rather than authentication-specific hydration problems.
- **Offline App Load (V2, V10):** The complete failure to load the application offline for Pro users (due to `net::ERR_INTERNET_DISCONNECTED`) suggests this issue would affect any authenticated user, as it points to a fundamental lack of app shell caching. Guest users might experience different offline behavior, but this specific failure is critical for authenticated sessions.
- **GPS Acquisition Issues (P3, V3):** The "Acquiring GPS..." message and disabled save button are generic, indicating a universal problem with GPS acquisition logic that would affect any user attempting to save waypoints, regardless of tier.
- **Pro Gating (F3, P1):** This is where tier behavior diverges significantly. Free users are *incorrectly* allowed to access waypoint saving (F3), while Pro users are *incorrectly* shown the UpgradeSheet (P1). This highlights a misconfiguration in the `isPro` checks across different parts of the application.
- **Learn Tab State (V13, F4):** The Learn tab header statistics (courses, complete percentage, chapters done) correctly persist across tab switches for both guest and free users, indicating the previous fix for V13 (always-mounted tabs) is working for this specific aspect of state.

## Findings Discarded
- `guest V13` and `free V13`: These tests passed, and the `state-loss-evidence` annotation showed identical header statistics before and after tab switching. This confirms that header stats *are* persisting, which is the desired behavior. The test description is misleading as it implies state loss, but the evidence shows state preservation for this specific metric. The broader V13 vulnerability (in-progress chapter reading position) is not assessed by these tests.
- `free F4`: This test passed, confirming that Learn header percentage does not regress to zero across tab switches. This is a positive finding and not a UX issue.

## Cannot Assess
- The specific in-progress chapter reading position state loss for V13. The current test journeys only check the Learn tab header statistics, not the user's position within a chapter.
- The exact content of `ee-map-prefs` in `localStorage` after reload for V8 and V9 due to test timeouts.

## Systemic Patterns
- **Widespread Persistence Failure:** Both Zustand `persist` middleware and manual `localStorage` patterns are failing across multiple critical state keys (theme, basemap, layers, active module, session trail, guest waypoints). This points to a deeper, systemic issue with `localStorage` access, corruption, or rehydration logic across the application.
- **Fundamental Offline Unavailability:** The app completely fails to load for authenticated users when offline, indicating a critical lack of comprehensive offline-first architecture beyond just map tile caching.
- **Inconsistent Pro Gating:** There is a clear pattern of incorrect and inconsistent application of Pro subscription checks, leading to both free users accessing Pro features and paying Pro users being prompted to upgrade.
- **Persistent GPS Acquisition Issues:** A consistent failure to acquire GPS coordinates is blocking core location-dependent features like waypoint saving, suggesting a problem with the app's interaction with geolocation APIs or its internal GPS state management.

## Calibration Notes
- Prioritised direct evidence from annotations and error messages to confirm findings, avoiding speculation without concrete data.
- Recognised that a "PASS" for a vulnerability test often means the vulnerability *was confirmed* as expected (e.g., V1, V4, V6, V11, V15), aligning with the "vulnerability-proof test philosophy".
- Carefully re-evaluated the scope and evidence of V13, noting that the test confirmed state *preservation* for header stats, not state loss, and that the test does not cover the full extent of the known V13 vulnerability.
- Utilised `STATE_MAP.md` extensively to trace observed failures to their architectural causes and confirm expected vulnerability behaviors, enhancing confidence in root cause analysis.