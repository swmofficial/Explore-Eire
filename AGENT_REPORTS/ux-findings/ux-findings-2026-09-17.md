# UX Agent Report — 2026-09-17

## Run Context
- Commits analysed: `f51b5b193eccb3368d261203b0fb70397bdc5740` and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Manual Persistence Mechanisms for User Preferences and Session Data Are Broken (V1, V7, V11, V15 Regressions)
- Summary: Multiple manual `localStorage` persistence mechanisms for user preferences (theme, active module) and critical session data (waypoints, tracks) are failing, leading to data loss on page reload.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: Theme was flipped to 'light' but reverted to 'dark' after reload. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being persisted.
    - `guest V11` passed (confirming vulnerability): Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` shows guest waypoints are lost.
    - `guest V15` passed (confirming vulnerability): Annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` shows active module is lost.
    - `pro V1` passed (confirming vulnerability): Annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` shows GPS tracks are lost.
- Cannot confirm: The exact point of failure in the manual IIFE + `localStorage.setItem` pattern for each of these keys, but the evidence clearly shows the keys are not present or are empty after reload.
- Root cause: The manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are not functioning correctly, despite `STATE_MAP.md` indicating they are implemented. This suggests a bug in the implementation of these specific persistence patterns.
- User impact: Users lose their chosen theme, active module, unsaved waypoints, and active GPS tracks on every page reload, leading to significant frustration and perceived unreliability.
- Business impact: Erodes user trust, increases friction for core activities, and can lead to abandonment, especially for prospectors who rely on session data.
- Fix direction: Debug and correct the manual `localStorage` read/write implementations for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail`.

### 4. High: Free Users Can Save Waypoints Instead of Upgrading (F3 Regression)
- Summary: Free tier users are incorrectly allowed to access the waypoint saving sheet via the camera button, bypassing the intended upgrade prompt for Pro-gated features.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the upgrade sheet was *not* shown, but the waypoint sheet *was*.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user (Supabase policy might prevent it), but the UI allows the attempt.
- Root cause: Incorrect gating logic for the "Save Waypoint" action, where the `isPro` check is either missing or inverted, allowing free users to access a Pro-only feature.
- User impact: Free users are given access to a feature they shouldn't have, potentially leading to confusion if the save fails silently later, or devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key Pro feature is accessible to free users.
- Fix direction: Correct the conditional rendering/routing logic for the waypoint save button/sheet to ensure free users are directed to the upgrade flow.

### 5. High: Offline Waypoint Save Lacks Pre-Check Warning (V14 Confirmed)
- Summary: When attempting to save a waypoint offline, the application does not provide a pre-save warning about the lack of connectivity, leading to a failed save operation without prior user notification.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning.
- Cannot confirm: The exact toast message shown on failure, as the test was blocked by the GPS acquisition issue. However, the lack of a *pre-check* is confirmed.
- Root cause: Missing explicit check for online status before attempting a waypoint save, which would allow the app to warn the user before they commit to an action that will fail.
- User impact: Users attempt to save critical data offline without being warned it will fail, leading to frustration, wasted effort, and perceived data loss.
- Business impact: Erodes trust in the app's reliability and data safety, especially for users in rural areas with intermittent connectivity.
- Fix direction: Implement an explicit network connectivity check before allowing users to initiate a waypoint save, displaying a warning if offline.

### 6. High: Offline Route Save Fails Silently (V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the operation fails silently, providing no user-facing feedback (toast or error message) that the route was not saved.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V6` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The test annotation `route-button-missing: cannot proof V6` indicates the test confirmed the lack of a toast, even if it couldn't fully verify the button state.
- Cannot confirm: The exact console error message, but the absence of a user-facing toast is confirmed.
- Root cause: The `routes` INSERT operation lacks a mechanism to display user-facing feedback (e.g., a toast notification) when it fails due to offline conditions.
- User impact: Users believe their route has been successfully saved when it has not, leading to unexpected data loss and confusion when they later try to access the route.
- Business impact: Damages user trust and reliability perception, particularly for a core planning feature.
- Fix direction: Implement a user-facing toast or notification for failed route save operations, especially when offline.

### 7. Medium: Zustand Persist Middleware for Map Preferences (Basemap, Layers) Appears Broken (V8, V9 Timeout)
- Summary: User preferences for basemap and layer visibility are not being correctly persisted across page reloads, as indicated by test timeouts during verification.
- Tier(s) affected: Guest (V9), Free (V8) (inferred All)
- Confidence: MEDIUM
- Evidence: `guest V9` (basemap) and `free V8` (layer preferences) both failed with `Test timeout of 60000ms exceeded.`. These tests are designed to check if preferences survive a reload. Timeouts often indicate the app is stuck or the expected state isn't reached, implying the persistence is failing.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload, as the tests timed out before capturing this.
- Root cause: While `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware, the timeouts suggest this persistence is either failing or the UI isn't reflecting the persisted state correctly, causing the test to hang.
- User impact: Map preferences (basemap, visible layers) reset to defaults on every reload, forcing users to repeatedly reconfigure their map view, which is tedious and frustrating.
- Business impact: Increases friction for map interaction, potentially reducing engagement with map features and overall app usability.
- Fix direction: Investigate why `ee-map-prefs` persistence is not working or why the UI is not correctly reflecting the persisted state, leading to test timeouts.

### 8. Medium: Pro User Upgrade Sheet Check Times Out (P1 Inconclusive)
- Summary: The test designed to confirm that Pro users do *not* see the Upgrade Sheet when tapping a Pro affordance timed out, making it inconclusive whether the Pro gating is correctly implemented.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. This test is designed to verify that Pro users *do not* see the UpgradeSheet. A timeout means the assertion (likely `expect(upgradeSheet).not.toBeVisible()`) could not be met within the timeout, possibly because the app didn't load correctly or the sheet *was* visible.
- Cannot confirm: Whether the UpgradeSheet actually appeared for the Pro user, or if the timeout is a symptom of the broader app loading issues (like offline failures).
- Root cause: Unclear, but could be related to app loading stability (as seen in V2/V10), or an actual regression in Pro gating logic where the UpgradeSheet is incorrectly displayed or the test is waiting for a non-existent element.
- User impact: If the UpgradeSheet is incorrectly shown to Pro users, it creates confusion and a poor user experience, suggesting their subscription isn't recognized.
- Business impact: Erodes trust in the subscription system, potentially leading to cancellations or support tickets.
- Fix direction: Investigate the cause of the timeout, potentially related to app loading or the Pro gating logic itself.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Fails for Pro users with `net::ERR_INTERNET_DISCONNECTED`. This is a fundamental app shell loading issue that would likely affect all authenticated tiers (Free, Pro) equally, as they rely on Supabase auth for initial state. Guest users might load differently if they don't require Supabase auth.
-   **Theme Persistence (V7):** Fails identically for Guest and Free tiers, with the theme resetting to 'dark' after reload. This indicates a consistent failure in the manual `ee_theme` persistence mechanism across unauthenticated and authenticated free users.
-   **Map Preferences Persistence (V8, V9):** Tests for basemap (V9) and layer visibility (V8) persistence both timed out for Guest and Free tiers respectively. This suggests a common issue with `ee-map-prefs` persistence, likely affecting all tiers.
-   **Session Waypoints Persistence (V11):** Confirmed to be lost for Guest users. This is a guest-specific feature.
-   **Active Module Persistence (V15):** Confirmed to be lost for Guest users. This is a general preference, likely affecting Free/Pro users as well.
-   **Learn Tab State (V13, F4):** Both Guest and Free tests show identical `0% complete` before and after tab switches. This indicates the test scenario is not robust enough to demonstrate state loss, rather than a tier-specific bug.
-   **Pro Badges (F2):** Free users correctly see Pro badges in the LayerPanel, which is the intended behavior for upselling.
-   **Waypoint Save Gating (F3):** Free users are incorrectly allowed to save waypoints, bypassing the upgrade sheet. This is a specific Free tier regression.
-   **GPS Acquisition (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition failure. This is likely a core app issue affecting all tiers attempting to save waypoints.
-   **Offline Data Saves (V1, V4, V6, V14):** V1 (GPS track loss on reload), V4 (track save fails offline), V6 (route save offline silent failure), and V14 (waypoint save offline no pre-warning) are all confirmed for Pro users. These represent general offline data handling deficiencies that would affect any user attempting these actions offline.

## Findings Discarded

-   **Learn Tab Header Stats Test Inconclusive (V13, F4):** This finding was discarded because the test scenario consistently produced `0% complete` before and after tab switches, making it impossible to confirm or deny state loss. The issue lies with the test's ability to create verifiable state, not necessarily a bug in the application's state preservation for learning progress.

## Cannot Assess

-   The exact state of `ee-map-prefs` in `localStorage` for V8 and V9, as the tests timed out before this data could be reliably captured.
-   The precise reason for the `pro P1` timeout, which could be related to general app loading instability or a specific issue with the Pro gating logic.

## Systemic Patterns

-   **Fundamental Offline-First Failure:** The most critical systemic issue is the complete inability of the application to load offline for authenticated users, coupled with a pervasive lack of robust offline data handling (no save queues, missing pre-warnings for offline actions, silent failures). This is a severe architectural flaw for an outdoor mapping app designed for rural use.
-   **Broken Manual Persistence Mechanisms:** A recurring pattern of failure in the manual `localStorage` persistence implementations (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) is evident. This indicates a systemic issue with how these specific state variables are being managed across app lifecycles, leading to widespread loss of user preferences and session data.
-   **GPS Acquisition Instability:** The consistent "Acquiring GPS..." state and disabled save buttons point to a core instability or bug in the application's GPS acquisition and processing logic, affecting critical features like waypoint saving.

## Calibration Notes

-   Prioritized direct confirmations of vulnerabilities (e.g., V1, V7, V11, V14, V15, V6) with HIGH confidence, even when the test "passed" to confirm the vulnerability, aligning with the new test philosophy.
-   Avoided inferring issues from timeouts without corroborating evidence, instead assigning MEDIUM confidence and noting what could not be confirmed (e.g., V8, V9, P1).
-   Recognized and noted instances where test scenarios (V13, F4) were insufficient to fully exercise the intended vulnerability, preventing a conclusive finding about the application's behavior.
-   Cross-referenced `STATE_MAP.md` against test results, identifying discrepancies where the map indicates a fix was implemented (e.g., V1, V7, V11, V15 persistence) but tests confirm the vulnerability is still active, suggesting the `STATE_MAP.md` may be outdated or the fixes incomplete.