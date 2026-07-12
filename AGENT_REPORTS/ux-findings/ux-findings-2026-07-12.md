# UX Agent Report — 2026-07-12

## Run Context
- Commits analysed: `d1460ea285ee9034a13855c24b18add5e07d3b8a` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
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

### 3. Critical: Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload across all tiers.
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
- Fix direction: Thoroughly debug and re-implement the manual `localStorage` persistence patterns for all affected state keys.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (Vulnerability F3)
- Summary: Free tier users are able to access and save waypoints, a feature intended for Pro users, bypassing the expected upgrade prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed because the test expected `upgradeShown` to be `true` but received `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the waypoint sheet was shown instead of the upgrade sheet.
- Cannot confirm: The exact code path in the gating logic that allows this bypass.
- Root cause: Incorrect conditional rendering or routing logic for the "Save Waypoint" feature, failing to check `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users gain access to a premium feature, potentially reducing their motivation to upgrade.
- Business impact: Direct loss of potential revenue from upgrades, undermining the subscription model.
- Fix direction: Correct the gating logic for waypoint saving to ensure `UpgradeSheet` is displayed for free users.

### 5. High: Offline Data Save Operations Fail Silently or With Data Loss (Vulnerability V4, V6, V14)
- Summary: The application fails to save user-generated data (tracks, routes) when offline, resulting in data loss, and provides insufficient user feedback (silent failures, no pre-save warnings).
- Tier(s) affected: Pro (V4, V6), All (V14)
- Confidence: HIGH
- Evidence:
    *   `pro V4` passed (confirming vulnerability): The test confirmed that track save fails offline.
    *   `pro V6` passed (confirming vulnerability): The test confirmed that route save offline produces no user-facing toast (silent failure), consistent with `STATE_MAP.md` which states `routes` INSERT fails with `console.error only, no toast`.
    *   `pro V3` (which also failed due to GPS issues) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning.
- Cannot confirm: The full scope of data loss across all save operations (e.g., finds, photos) beyond tracks and routes.
- Root cause: Lack of an offline data queue and robust error handling for Supabase write failures. The app does not implement local-first writes or a sync queue, as detailed in "Offline-First Design" principles.
- User impact: Users lose valuable data they've created, leading to significant frustration, distrust, and potential abandonment of the app.
- Business impact: Severe damage to user trust and retention, especially for users in target rural areas with intermittent connectivity.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) and provide clear, actionable feedback to users about offline save status and pending syncs.

### 6. Medium: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for basemap selection and layer visibility are not consistently persisted across page reloads.
- Tier(s) affected: Guest (V9), Free (V8)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both timed out. While not a direct assertion of reset, a timeout in a persistence test often indicates the expected state was not reached or the UI element was not found in the expected state after reload. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via Zustand `ee-map-prefs`, suggesting an issue with this persistence.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload due to the timeout.
- Root cause: Likely an issue with the Zustand `persist` middleware for `mapStore` or a race condition preventing the test from correctly asserting the state after reload.
- User impact: Minor inconvenience as users have to re-select their preferred basemap and re-enable layers after every reload.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially affecting user satisfaction.
- Fix direction: Investigate the `mapStore`'s Zustand `persist` configuration and ensure `basemap` and `layerVisibility` are correctly hydrated on app load.

### 7. Low: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: A Pro user might be incorrectly prompted to upgrade when interacting with a Pro-gated feature.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` test timed out. The test is designed to *pass* if the upgrade sheet is *not* shown. A timeout means the test could not complete its checks, not that the upgrade sheet was definitively shown.
- Cannot confirm: Whether the upgrade sheet was actually displayed or if the timeout was due to test flakiness or another underlying issue.
- Root cause: Unclear due to timeout. Could be a test flakiness, a subtle timing issue in the gating logic, or a regression in the `isPro` status hydration.
- User impact: If true, a paying Pro user would be confused and frustrated by being asked to upgrade for a feature they already have.
- Business impact: Damages trust with paying customers, potentially leading to cancellations.
- Fix direction: Investigate the cause of the test timeout and verify the `isPro` gating logic for Pro features.

## Tier Comparison

*   **Offline App Load (V10, V2):** Fails for Pro users, preventing the app from loading at all. This behavior is likely shared with Free users due to common authentication and data loading mechanisms. Guest users are not explicitly tested for this scenario but would likely load the app shell without user-specific data.
*   **Waypoint Save Button Disabled (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition failure. This is a core map functionality and would likely affect all tiers if they were able to save waypoints.
*   **Manual `localStorage` Persistence Failures (V1, V7, V11, V15):**
    *   `V7 (theme)`: Fails for both Guest and Free users, reverting to default. This issue likely affects Pro users as well, as `theme` is managed by the shared `userStore`.
    *   `V1 (sessionTrail)`: Confirmed lost for Pro users. This vulnerability likely affects Guest and Free users as well, as `sessionTrail` is managed by the shared `mapStore`.
    *   `V11 (guestWaypoints)`: Confirmed lost for Guest users. This is specific to the Guest tier.
    *   `V15 (activeModule)`: Confirmed lost for Guest users. This vulnerability likely affects Free and Pro users as well, as `activeModule` is managed by the shared `moduleStore`.
    *   **Systemic:** All manual `localStorage` persistence mechanisms are failing across all applicable tiers.
*   **Free User Waypoint Gating (F3):** This is a specific business logic error for the Free tier, allowing them to save waypoints instead of showing an upgrade prompt.
*   **Offline Data Save Failures (V4, V6, V14):** Confirmed for Pro users (track and route saves fail, no pre-save warning). V4 and V6 are Pro features. V14 (no pre-save warning) is a general offline behavior that would affect any user attempting to save data offline.
*   **Basemap and Layer Preferences Reset (V9, V8):** Tests for Guest (V9) and Free (V8) timed out, indicating potential reset. This issue likely affects Pro users as well, as these preferences are managed by the shared `mapStore`.
*   **Pro Upgrade Gating (P1):** Test for Pro users timed out, making it unclear if an upgrade sheet was incorrectly shown.

## Findings Discarded

*   `guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)`: This test passed, and the `state-loss-evidence` annotation showed identical "before" and "after" header statistics. This indicates that the Learn tab header stats, which are derived from persisted `ee_progress`, are *not* regressing. This is a positive outcome, confirming the persistence of these specific stats, not a vulnerability.
*   `free V13 — learn tab state loss across tab switch (handover reference journey)`: Similar to `guest V13`, this test passed with identical header stats, confirming no regression for these specific metrics.
*   `free F4 — Learn header percentage does not regress to zero across tab switches`: This test passed with identical header stats, explicitly confirming the desired behavior.

## Cannot Assess

*   The exact state of `ee-map-prefs` in `localStorage` for `guest V9` and `free V8` due to test timeouts.
*   Whether the `UpgradeSheet` was actually displayed for `pro P1` due to test timeout.

## Systemic Patterns

1.  **Broken Manual `localStorage` Persistence:** A widespread failure across multiple critical state items (`theme`, `sessionTrail`, `sessionWaypoints`, `activeModule`) that are explicitly configured in `STATE_MAP.md` to use manual `localStorage` patterns. This indicates a fundamental flaw in the implementation or interaction of these manual persistence mechanisms, directly contradicting the architectural ground truth.
2.  **Incomplete Offline-First Implementation:** The application exhibits a systemic failure to handle offline scenarios gracefully. This includes complete failure to load for authenticated users, lack of an offline data queue for user-generated content, and insufficient user feedback for offline save failures. This directly violates core "Offline-First Design" principles and is a critical flaw for the target user base.
3.  **GPS Acquisition Failures:** A consistent issue preventing the app from acquiring and processing GPS coordinates, leading to disabled save buttons for core features like waypoints. This points to a problem in the underlying GPS tracking/acquisition logic or its interaction with mock data in the test environment.

## Calibration Notes

*   The "Vulnerability-Proof Test Philosophy" is effective, as tests explicitly passing to confirm a vulnerability (e.g., V1, V11, V15) provide clear and actionable evidence.
*   I remain cautious with test timeouts. While they often hint at underlying issues (e.g., app not loading, element not found), they do not provide direct evidence of the *intended* UX failure. For findings based on timeouts (V8, V9, P1), confidence is appropriately lowered to MEDIUM or LOW.
*   The significant discrepancy between the `STATE_MAP.md` (which states manual `localStorage` patterns are "proven reliable") and the observed test failures for V1, V7, V11, V15 is a critical insight. This highlights that the architectural ground truth may be outdated or the implementation deviates from the documented design.
*   Past PHANTOM verdicts (e.g., UI obstruction, style inconsistencies) reinforce the need to rely on direct assertion failures or clear visual evidence from screenshots, rather than inferring UX issues solely from Playwright internal errors or timeouts. The current findings are backed by explicit assertion failures or direct vulnerability confirmations.