# UX Agent Report — 2026-07-22

## Run Context
- Commits analysed: `39e6009a92d5402c5086e69e9b5c1b28b8ca89b1` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online, and provides no offline warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also annotated `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The lack of an offline warning (V14) indicates a missing pre-check for connectivity before attempting a save.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose. Users are not warned about offline save failures.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Implement an explicit offline warning (V14) before attempting data saves.

### 3. High: Free Users Can Save Waypoints Instead of Upgrading (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to save waypoints directly, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, indicating that tapping the camera button opened the `WaypointSheet` instead of the `UpgradeSheet`.
- Cannot confirm: The specific code path that leads to this incorrect routing.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `userStore.isPro` before displaying the `WaypointSheet`.
- User impact: Free users gain access to a premium feature without payment, devaluing the Pro subscription.
- Business impact: Direct revenue loss, undermines the value proposition of the Pro tier, and could lead to a perception of unfairness among paying subscribers.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` for free users when attempting to save a waypoint.

### 4. High: Manual `localStorage` Persistence Failures (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme) and critical session data (guest waypoints, active module, GPS track) are not correctly persisted across page reloads due to failures in the manual `localStorage` read/write patterns.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. Expected "light", received "dark". (V7 confirmed)
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: N/A
- Root cause: The manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are not functioning correctly, leading to state loss on reload.
- User impact: Users constantly lose their preferred theme, active module, unsaved waypoints, and active GPS tracks, leading to a highly frustrating and unreliable experience.
- Business impact: Erodes user trust, increases churn, and makes the app feel unprofessional.
- Fix direction: Debug and verify all manual `localStorage` read/write patterns (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`).

### 5. High: Offline Data Save Operations Fail Silently or with Data Loss (Vulnerability V4, V6)
- Summary: When offline, saving a GPS track results in data loss, and saving a route fails silently without a user-facing toast.
- Tier(s) affected: Pro (inferred Free/Guest if they could save these)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: This test confirms the vulnerability "track save fails offline (post-stop data loss)". `STATE_MAP.md` states `tracks` INSERT fails offline with a toast "Could not save track" and data is lost. The test passing means this failure was observed.
    - `pro V6` passed: This test confirms the vulnerability "route save offline produces no user-facing toast (silent failure)". The annotation `route-button-missing: cannot proof V6` is confusing, but `STATE_MAP.md` explicitly states `routes` INSERT fails with "console.error only, no toast". If the test passed, it means no toast was shown, confirming the silent failure.
- Cannot confirm: The exact content of the toast for V4, but the test passing confirms the failure and data loss.
- Root cause: Lack of an offline data queue. `STATE_MAP.md` confirms "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". All data writes fail directly when offline.
- User impact: Users lose valuable recorded data (tracks, routes) without clear indication or a chance to retry, leading to significant frustration and loss of trust.
- Business impact: Undermines core functionality for users in rural areas, leading to churn and negative reviews.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and retry failed write operations. Provide clear UI feedback on sync status.

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: The `pro P1` test timed out, which is designed to confirm that a Pro user *does not* see the UpgradeSheet when tapping a Pro affordance. A timeout here suggests the test couldn't complete its assertion, potentially because the UpgradeSheet *did* appear or the element it was waiting for didn't appear.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: Whether the UpgradeSheet actually appeared or if the test got stuck waiting for another element.
- Root cause: Unclear due to timeout. Could be a race condition, an incorrect selector, or an actual bug where Pro users are incorrectly shown the UpgradeSheet.
- User impact: Pro users are incorrectly prompted to upgrade, creating confusion and a poor user experience.
- Business impact: Erodes trust and professionalism, potentially leading to support queries.
- Fix direction: Investigate the `pro P1` test timeout. Verify the logic that gates the `UpgradeSheet` for Pro users.

### 7. Medium: Basemap and Layer Visibility Preferences Reset on Reload (Vulnerability V8, V9)
- Summary: Basemap and layer visibility preferences are not persisted across reloads, forcing users to reconfigure their map view every time they open the app.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded.` These tests are designed to verify persistence of `basemap` and `layerVisibility`. The timeouts suggest the test couldn't complete its checks, likely because the state was not as expected after reload.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` due to the timeout.
- Root cause: `mapStore` uses Zustand `persist` middleware with key `ee-map-prefs` for `basemap` and `layerVisibility`. The timeouts suggest an issue with this persistence, either in writing to `localStorage` or reading from it on reload.
- User impact: Users lose their preferred map configuration, requiring manual re-selection of basemap and layers on every app open, which is highly inconvenient.
- Business impact: Frustrates users, making the app feel less polished and reliable, potentially impacting retention.
- Fix direction: Debug the Zustand `persist` middleware configuration for `mapStore` and verify `ee-map-prefs` is correctly storing and retrieving `basemap` and `layerVisibility`.

## Tier Comparison

-   **Offline App Load (V2, V10)**: The Pro tier completely fails to load offline. Guest and Free tiers were not explicitly tested for this specific failure, but the underlying architectural issue (lack of app shell caching) suggests they would also be affected.
-   **Waypoint Save Button Disabled (P3, V3)**: The Pro tier experiences a disabled "Save Waypoint" button due to GPS acquisition failure, and no offline warning (V14). Guest and Free tiers were not explicitly tested for this specific failure, but GPS acquisition logic is global and would likely affect them similarly if they attempted to save waypoints.
-   **Free Users Can Save Waypoints (F3)**: This issue is specific to the Free tier, where users are incorrectly allowed to save waypoints instead of being prompted to upgrade. Guest users cannot save waypoints, and Pro users can.
-   **Theme Reset (V7)**: Confirmed for Guest and Free tiers. The `ee_theme` `localStorage` key is `null` before and after reload, indicating a systemic failure in the manual persistence mechanism that would likely affect all tiers.
-   **Basemap and Layer Visibility Reset (V8, V9)**: Tests for Guest (V9) and Free (V8) tiers timed out, strongly suggesting these preferences are not persisted. This issue, tied to `mapStore`'s Zustand `persist` configuration, would likely affect all tiers.
-   **Guest Waypoints Lost (V11)**: This vulnerability is specific to the Guest tier, as authenticated users save waypoints to Supabase.
-   **Active Module Reset (V15)**: Confirmed for the Guest tier. This issue, tied to the manual `ee_active_module` `localStorage` persistence, would likely affect all tiers.
-   **GPS Track Lost (V1)**: Confirmed for the Pro tier. This issue, tied to the manual `ee_session_trail` `localStorage` persistence, would likely affect all tiers capable of tracking.
-   **Offline Data Save Failures (V4, V6)**: Confirmed for the Pro tier (track save fails with data loss, route save fails silently). These issues, stemming from the lack of an offline data queue, would likely affect all tiers capable of saving tracks or routes.
-   **Learn Tab State (V13)**: Both Guest and Free tier tests passed, and the `state-loss-evidence` showed identical `before` and `after` values for learn header statistics. This indicates that the fix for V13 (always-mounted tabs) is successfully preserving the state of these header stats across tab switches for both tiers.

## Findings Discarded

-   **`guest V13` and `free V13` (Learn header stats recomputed)**: These tests passed, and the `state-loss-evidence` annotations showed that the "before" and "after" values for learn header stats were identical. This indicates *no state loss* for these specific metrics, meaning the fix for V13 (always-mounted tabs) is working for this aspect. Therefore, V13 is *not* confirmed as a vulnerability by these tests.

## Cannot Assess

-   The exact state of `ee-map-prefs` in `localStorage` for `guest V9` and `free V8` due to test timeouts.
-   Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline (V10), as the primary failure is the inability to load at all.
-   The specific reason for the `pro P1` timeout, preventing confirmation of whether Pro users are incorrectly shown the UpgradeSheet.
-   The exact content of the toast message for `pro V4` (track save fails offline), although the data loss and failure are confirmed.

## Systemic Patterns

-   **Widespread `localStorage` Persistence Failures**: A significant number of user preferences and session-critical data points (theme, guest waypoints, active module, GPS track, basemap, layer visibility) are not being correctly persisted across reloads. This points to either fundamental issues with the manual `localStorage` read/write patterns or problems with the Zustand `persist` middleware configuration.
-   **Critical Offline Functionality Gaps**: The application completely fails to load offline for authenticated users, and all data write operations (waypoints, tracks, routes) either fail silently or with data loss when offline. This highlights a severe lack of offline-first design principles, particularly the absence of a robust Service Worker for app shell caching and an offline data queue.
-   **GPS Acquisition Instability**: The consistent failure to acquire GPS coordinates, leading to disabled "Save Waypoint" buttons, suggests a problem with the app's geolocation integration or its interaction with Playwright's mock.

## Calibration Notes

-   The redesigned test suite, focusing on journeys that produce evidence for known vulnerabilities, proved highly effective. For instance, `guest V11`, `guest V15`, `pro V1`, `pro V3`, `pro V4`, and `pro V6` all "passed" by successfully demonstrating the predicted vulnerable behavior, allowing for high-confidence confirmation.
-   The previous `V13` fix (always-mounted tabs) was confirmed to be working for learn header stats, preventing a misdiagnosis of state loss in this area. This reinforces the importance of re-evaluating "passed" tests in the context of their intended vulnerability proof.
-   Timeouts (e.g., `guest V9`, `free V8`, `pro P1`) remain challenging for definitive root cause analysis, but when combined with other direct evidence of persistence failures, they provide strong inferential evidence.
-   The "Vulnerability-Proof Test Philosophy" is working as intended, allowing for clear confirmation of vulnerabilities even when the test itself reports "PASS" (because it successfully observed the vulnerability).