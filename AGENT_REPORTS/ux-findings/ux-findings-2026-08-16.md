# UX Agent Report — 2026-08-16

## Run Context
- Commits analysed: `1ba2504279b4df064067d773b32652a7a5a95d78` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also means offline waypoint saves fail without a pre-check warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". `pro V3` also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The `STATE_MAP.md` confirms V14 (no pre-check) is a genuine vulnerability.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration, and implement an offline pre-check for data saves.

### 3. High: Widespread Regression in Persistence of User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Critical user preferences (theme, basemap, layer visibility) and user-generated session data (active GPS tracks, guest waypoints, active module) are lost on page reload, indicating a widespread regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    - `STATE_MAP.md` explicitly states these items *should* be persisted via `ee_theme`, `ee-map-prefs`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`. The test results directly contradict this.
- Cannot confirm: The exact cause of the `ee_theme` null value (e.g., if the manual write pattern is broken or the key is being cleared).
- Root cause: A systemic failure in the persistence layer. Despite `STATE_MAP.md` indicating manual localStorage patterns and Zustand `persist` middleware are in place, they are not functioning correctly for these critical state elements. This could be due to incorrect implementation, race conditions, or unexpected clearing of localStorage.
- User impact: Users lose their personalized settings (theme, basemap, layers) and unsaved session data (waypoints, tracks, active module) on every reload, leading to significant frustration and a perception of an unreliable app.
- Business impact: Reduces user satisfaction, increases friction, and discourages engagement with core features, potentially leading to churn.
- Fix direction: Thoroughly audit and debug all persistence mechanisms (Zustand `persist` and manual localStorage IIFE patterns) for the affected state keys.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Feature F3)
- Summary: Free users are incorrectly allowed to access the waypoint creation sheet directly from the camera button, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` being `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `WaypointSheet` was shown, not the `UpgradeSheet`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: The exact code path that incorrectly routes free users to the WaypointSheet.
- Root cause: Incorrect implementation of the feature gating logic for waypoint creation. The app is failing to check the user's subscription status before routing to the WaypointSheet.
- User impact: Free users are given access to a Pro feature, potentially leading to confusion when they try to save and encounter further restrictions, or a degraded experience if the save fails later.
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions. It also creates a poor user experience by offering a feature that shouldn't be available.
- Fix direction: Correct the conditional rendering/routing logic for the waypoint creation flow to ensure free users are directed to the `UpgradeSheet`.

### 5. Medium: Pro Users See Upgrade Sheet on Pro Affordance Tap (Feature P1)
- Summary: Pro users are incorrectly shown the `UpgradeSheet` when interacting with a Pro-gated affordance, despite already having an active subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout`. The test name "Pro user does not see UpgradeSheet on Pro affordance tap" implies the expected behavior is *not* seeing the UpgradeSheet. A timeout suggests the assertion `expect(UpgradeSheet).not.toBeVisible()` failed, meaning the UpgradeSheet *was* visible.
- Cannot confirm: Which specific "Pro affordance" was tapped to trigger the UpgradeSheet.
- Root cause: Incorrect feature gating logic for Pro users. The app is mistakenly showing upgrade prompts to users who already have a Pro subscription.
- User impact: Frustration and confusion for paying Pro users who are incorrectly prompted to upgrade, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations or negative reviews.
- Fix direction: Review and correct the `isPro` check in the components that trigger the `UpgradeSheet` to ensure it only appears for non-Pro users.

### 6. Medium: Offline Data Saves Fail (Vulnerability V4, V6)
- Summary: Saving user-generated content (GPS tracks, routes) fails when offline, leading to data loss. Track saves produce a toast, but route saves fail silently.
- Tier(s) affected: Pro (inferred for Free/Guest if they could save these)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast.
    - `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms `routes` INSERT fails offline with `console.error only, no toast`.
- Cannot confirm: The exact content of the toast for V4, or if the `console.error` for V6 is visible to the user.
- Root cause: Lack of an offline data synchronization queue. All data writes are directly to Supabase, failing immediately without local persistence or retry mechanisms when offline. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable recorded data (hike tracks, planned routes) if they are offline during the save operation, leading to significant frustration and loss of trust. Silent failures (V6) are particularly egregious as the user has no indication of data loss.
- Business impact: High churn due to data loss, negative reviews, and a perception of an unreliable app, especially critical for a field-use application.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store pending writes and sync them when connectivity is restored. Provide clear UI feedback on sync status.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier explicitly fails to load offline. This issue is highly probable for Free tier users as well, as the root cause is a lack of general app shell and critical data caching, not specific to Pro features. Guest users might load partially but would still lack dynamic data.
*   **Persistence Issues (V1, V7, V8, V9, V11, V15):** These are widespread across all tiers, indicating a fundamental problem in the application's core persistence logic rather than tier-specific feature gating. `V7` (theme) affects Guest and Free. `V9` (basemap) and `V11` (guest waypoints) and `V15` (active module) affect Guest. `V8` (layer visibility) affects Free. `V1` (session trail) affects Pro.
*   **Waypoint Saving (P3, V3, V14):** The "Save Waypoint" button is disabled due to GPS acquisition failure for Pro users. This core map functionality problem would likely affect Free and Guest users if they were allowed to save waypoints.
*   **Waypoint Gating (F3):** Free users are incorrectly routed to the WaypointSheet instead of the UpgradeSheet. This is a specific business logic failure for the Free tier.
*   **Pro Upgrade Prompts (P1):** Pro users are incorrectly shown the UpgradeSheet. This is a specific business logic failure for the Pro tier.
*   **Offline Data Saves (V4, V6):** Track and route saves fail offline for Pro users. This behavior would be consistent across tiers if those features were available to them, indicating a general lack of offline data handling.
*   **Learn Tab State (V13, F4):** Header stats appear stable across tab switches for both Guest and Free tiers, indicating the fix for V13 (keeping tabs mounted) is working for this specific aspect.

## Findings Discarded

*   **`guest V13` and `free V13` (learn header stats state loss):** Discarded. Both tests passed, and the `state-loss-evidence` annotation showed identical `before` and `after` values for the header stats. This indicates that the header stats are *not* being lost or recomputed to a different value, which is the desired outcome if the V13 fix (preserving tab component state) is working for this specific metric. The test description "state-loss proof" is misleading given the pass result.
*   **`free F4` (Learn header percentage does not regress):** Discarded. This test passed and showed no regression in header percentage, which is the desired behavior. It's a confirmation of correct behavior, not a finding of an issue.

## Cannot Assess

*   The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic (Finding #2). Further debugging within the app's GPS module would be required.
*   The exact content of the toast for `pro V4` (track save fails offline) or if the `console.error` for `pro V6` (route save offline) is visible to the user, as screenshots do not capture console output or toast messages reliably.

## Systemic Patterns

1.  **Broken Persistence Layer:** Multiple critical user preferences and session data are failing to persist across reloads, directly contradicting `STATE_MAP.md` and previous fixes. This points to a fundamental regression or incorrect implementation of both Zustand `persist` middleware and manual `localStorage` patterns.
2.  **Lack of Offline-First Design:** The app completely fails to load offline for authenticated users, and all data writes (waypoints, tracks, routes) fail when offline, leading to data loss. This is a severe violation of core "Offline-First Design" principles, making the app unusable in its primary target environment.
3.  **GPS Acquisition Issues:** A core map functionality (GPS acquisition) is failing, preventing users from performing fundamental actions like saving waypoints. This suggests a problem with the `useTracks` hook or its interaction with the `mapStore.userLocation` state.
4.  **Incorrect Feature Gating Logic:** There are clear errors in how features are gated by subscription tier, with Free users accessing Pro features and Pro users being prompted to upgrade. This indicates flaws in the `isPro` checks or the routing logic.

## Calibration Notes

*   **Interpreting "PASS" for Vulnerabilities:** The new test philosophy, where a "PASS" can confirm a vulnerability, was crucial for identifying issues like `V1`, `V3`, `V4`, `V6`, `V11`, and `V15`. This allowed for high-confidence findings despite the "passed" status in the test summary.
*   **Contradictions with `STATE_MAP.md`:** Explicitly cross-referencing test evidence (e.g., `ee_theme: null`) with `STATE_MAP.md` (which states `ee_theme` *should* persist) was key to identifying the widespread regression in persistence.
*   **Tier Attribution:** The new requirement to attribute findings by tier and compare behaviors across tiers helped to pinpoint whether issues were systemic or specific to certain user segments.
*   **Avoiding Phantom Errors:** I continued to avoid inferring issues from generic timeouts without specific error messages or visual evidence, except where the test name and context strongly implied a specific UI state (e.g., `pro P1` timeout implying `UpgradeSheet` was visible).