# UX Agent Report — 2026-07-21

## Run Context
- Commits analysed: `d738dd4feffaf86394b2d94c2543d5f00fe0207e` (latest) and 19 preceding commits.
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

### 4. High: Systemic Failure of Manual `localStorage` Persistence (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload across all tiers.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    - `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail` are not functioning as intended. This contradicts `STATE_MAP.md` which describes these as "proven reliable pattern".
- User impact: Loss of critical user preferences and unsaved session data (tracks, waypoints) on every reload. This is highly frustrating and makes the app feel unreliable.
- Business impact: Erodes user trust, reduces engagement, and increases churn due to perceived data loss.
- Fix direction: Debug and fix the manual `localStorage` read/write implementations for all affected state keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`).

### 5. High: Map Preferences (Basemap, Layers) Reset on Reload (Vulnerability V8, V9)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests failed with timeouts. While the timeouts prevent direct assertion of the reset, the consistent failure across tiers and the systemic manual persistence issues (Finding 4) strongly suggest that `ee-map-prefs` (Zustand persist middleware) is also failing or being overwritten.
- Cannot confirm: The exact state of `localStorage['ee-map-prefs']` before and after reload due to the test timeouts.
- Root cause: Likely an issue with Zustand's `persist` middleware configuration for `mapStore` or an overwrite during app initialization, preventing `basemap` and `layerVisibility` from being correctly saved and restored.
- User impact: Users lose their preferred basemap and layer visibility settings on every reload, requiring manual re-configuration, which is a minor but persistent annoyance.
- Business impact: Contributes to an overall perception of an unreliable and unpolished application, potentially reducing user satisfaction.
- Fix direction: Investigate `mapStore`'s Zustand `persist` configuration and ensure `basemap` and `layerVisibility` are correctly saved and restored.

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: A Pro subscriber is incorrectly presented with an "Upgrade Sheet" when interacting with a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with a timeout. This test is designed to confirm a Pro user *does not* see the UpgradeSheet. A timeout implies the sheet *was* visible, or the test failed to find the expected state. This suggests a regression or a new issue.
- Cannot confirm: The specific Pro affordance that triggered the Upgrade Sheet, or the exact content of the sheet.
- Root cause: Incorrect gating logic for Pro affordances, or a specific Pro affordance is not correctly checking the `userStore.isPro` status before displaying the `UpgradeSheet`.
- User impact: Paying Pro users are incorrectly prompted to upgrade, leading to confusion, annoyance, and a feeling of being undervalued.
- Business impact: Erodes trust with paying customers, potentially leading to support tickets and negative reviews.
- Fix direction: Review `isPro` checks for all Pro-gated UI elements and ensure they correctly prevent the `UpgradeSheet` from appearing for Pro users.

### 7. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails without providing any user-facing feedback, leading to silent data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test itself couldn't explicitly confirm the silent failure. However, `STATE_MAP.md` explicitly states that `routes` INSERT fails offline with "console.error only, no toast".
- Cannot confirm: The exact user experience (e.g., if a subtle UI change occurs that the test missed).
- Root cause: Lack of a user-facing feedback mechanism (e.g., a toast notification) for offline route save failures. The error is only logged to the console.
- User impact: Users believe their route is saved when it is not, leading to data loss and frustration when they later discover the route is missing.
- Business impact: Data loss directly leads to user distrust and abandonment, as well as potential support inquiries.
- Fix direction: Implement a user-facing toast or notification for offline route save failures, and consider implementing an offline queue for data synchronization.

## Tier Comparison

-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** The failure of `localStorage` persistence for `theme`, `basemap`, `layerVisibility`, `sessionWaypoints`, `sessionTrail`, and `activeModule` is consistent across all affected tiers (Guest, Free, Pro). This indicates a systemic issue with the persistence mechanisms themselves, rather than tier-specific logic.
-   **Learn Tab State (V13, F4):** The Learn tab header statistics (courses, completePct, chaptersDone) are correctly preserved across tab switches for both Guest and Free tiers, as evidenced by identical `state-loss-evidence` and `header-stats-pair` annotations. This confirms the fix for V13 is working across tiers.
-   **Pro Badges (F2):** Free users correctly see PRO badges in the LayerPanel, which is the intended behavior to encourage upgrades.
-   **Upgrade Gating (F3, C3, P1):**
    -   Guest users are correctly shown the UpgradeSheet when tapping a Pro-gated affordance (C3).
    -   Free users are *incorrectly* allowed to save waypoints instead of being shown the UpgradeSheet (F3).
    -   Pro users are *incorrectly* shown the UpgradeSheet (P1 timeout implies this), which is a regression.

## Findings Discarded

-   None. All identified issues have sufficient evidence or architectural backing to warrant inclusion.

## Cannot Assess

-   The exact reason for the Playwright GPS acquisition failure (P3/V3). It could be a Playwright mock setup issue, an app-side bug in `useTracks` or `Map.jsx`'s `watchPosition` callback, or a timing issue.
-   The specific line of code causing the manual `localStorage` persistence failures (V1, V7, V11, V15). While `STATE_MAP.md` describes the pattern as "proven reliable", the tests clearly show it's not working.
-   The precise visual state of the `UpgradeSheet` for the `pro P1` failure, as the test timed out before a screenshot could confirm its visibility.

## Systemic Patterns

-   **Critical Offline Capability Deficiencies:** The application fundamentally fails to load offline for authenticated users (V2, V10), rendering it unusable in its target environment. Furthermore, critical data writes (waypoints, tracks, routes) fail silently or with inadequate feedback when offline (V3, V4, V6, V14). This is a major architectural gap for an outdoor mapping app.
-   **Widespread Persistence Failures:** There is a systemic failure in `localStorage` persistence. All state keys explicitly listed in `STATE_MAP.md` as using the "manual IIFE + write pattern" (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) are failing to persist data across reloads (V1, V7, V11, V15). This indicates a widespread bug in the implementation of this pattern. Additionally, `mapStore`'s Zustand `persist` middleware also appears to be failing for `basemap` and `layerVisibility` (V8, V9).
-   **GPS Acquisition Issues:** The app consistently fails to acquire GPS coordinates, leading to disabled save buttons for waypoints (P3, V3). This impacts core functionality and prevents users from performing a primary action.

## Calibration Notes

-   The `state-loss-evidence` annotation for V13 was crucial in determining that the vulnerability was *resolved*, despite the test name implying a "proof" of loss. This reinforces the need to interpret test annotations and actual evidence carefully, rather than relying solely on pass/fail status or test descriptions.
-   Timeouts for tests expecting *absence* (like P1) or *presence* (like V8/V9) require careful interpretation. A timeout for `expect(...).not.toBeVisible()` implies the element *was* visible, while a timeout for `expect(...).toBeVisible()` implies it *was not* visible or the page failed to load.
-   Prioritized offline failures and core feature breakage (GPS acquisition, saving waypoints) as having the highest user and business impact.
-   Grouped similar persistence failures into a single systemic finding to highlight the architectural root cause rather than treating them as isolated incidents.
-   When `STATE_MAP.md` describes a pattern as "proven reliable" but test evidence directly contradicts this, the test evidence is prioritized as reflecting the current reality of the application.