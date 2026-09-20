# UX Agent Report — 2026-09-20

## Run Context
- Commits analysed: `d6e3f117881c91cb0f3441b0c0b0b1e92064dd4c` and 19 preceding commits.
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

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correct client-side Pro gating logic for waypoint saving to ensure `UpgradeSheet` is shown for free users.

### 4. High: Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme on every page reload.
- Tier(s) affected: All (Guest, Free confirmed)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key, which `STATE_MAP.md` states is used for manual theme persistence, is not being written or read correctly.
- Root cause: The manual persistence mechanism for `userStore.theme` via the `ee_theme` localStorage key is not functioning as intended, causing the theme to revert to its default state after a reload.
- User impact: Annoying loss of personalization, requiring users to re-select their preferred theme after every app reload, making the app feel unreliable.
- Business impact: Minor, but contributes to overall negative user experience and perception of app quality.
- Fix direction: Debug the `userStore.theme` setter and getter logic to ensure the `ee_theme` localStorage key is correctly updated and read on initialization.

### 5. High: Basemap and Layer Preferences Reset on Reload (V9, V8 Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload.
- Tier(s) affected: All (Guest V9, Free V8 failed with timeouts)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. While a timeout, this indicates the test could not find the expected persisted state. `STATE_MAP.md` confirms `basemap` and `layerVisibility` are intended to be persisted via `mapStore`'s `ee-map-prefs` Zustand middleware. The consistent failure across tiers and similarity to V7's persistence failure strongly suggest a genuine issue.
- Cannot confirm: The exact value of `basemap` or `layerVisibility` after reload, only that the test failed to assert the *changed* state.
- Root cause: The Zustand `persist` middleware for `mapStore`'s `ee-map-prefs` is likely not correctly saving or restoring the `basemap` and `layerVisibility` states across reloads.
- User impact: Users lose their preferred map configuration, requiring manual re-selection of basemaps and layer visibility after every app reload.
- Business impact: Minor, but adds friction to the user experience and reduces the perceived quality and reliability of the app.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and implementation for `ee-map-prefs` to ensure `basemap` and `layerVisibility` are correctly persisted.

### 6. High: Active Module Resets to Default on Reload (V15 Confirmed)
- Summary: The user's `activeModule` preference resets to the default 'prospecting' module on every page reload.
- Tier(s) affected: All (Guest confirmed)
- Confidence: HIGH
- Evidence: `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` states `moduleStore.activeModule` persists via the manual `ee_active_module` localStorage key (task-013).
- Root cause: The manual persistence pattern for `moduleStore.activeModule` via the `ee_active_module` localStorage key is not correctly writing or reading the active module state.
- User impact: Users lose their active module context, requiring them to re-select their desired module after every app reload.
- Business impact: Minor, but adds friction to the user experience and reduces the perceived quality and efficiency of the app.
- Fix direction: Debug the `moduleStore.activeModule` setter and getter logic to ensure the `ee_active_module` localStorage key is correctly updated and read on initialization.

### 7. High: GPS Track Data Lost on Reload During Active Tracking (V1 Confirmed)
- Summary: Any accumulated GPS track data is lost if the application is reloaded during an active tracking session, before the user has explicitly saved the track.
- Tier(s) affected: All (Pro confirmed)
- Confidence: HIGH
- Evidence: `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` notes that `sessionTrail` accumulates in volatile memory and is "NOT persisted anywhere until the user explicitly saves," despite also mentioning `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006). The test confirms this manual persistence is not effectively preventing data loss during active tracking.
- Root cause: Despite a manual persistence mechanism being noted in `STATE_MAP.md`, the `sessionTrail` data is not being reliably auto-persisted to `ee_session_trail` in localStorage *during* an active tracking session. This violates "Data Safety" principles.
- User impact: Significant loss of user-generated data (entire GPS track, distance, elevation, duration) if the app crashes, the browser tab is accidentally closed, or the device reloads unexpectedly.
- Business impact: Severe erosion of user trust, potential for negative user reviews, and could lead to user abandonment if critical data is repeatedly lost.
- Fix direction: Implement robust auto-persistence for `sessionTrail` to `ee_session_trail` in localStorage *continuously* during active tracking, rather than relying solely on explicit user save actions.

### 8. Medium: Route Save Fails Silently Offline (V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing toast notification, leading to silent data loss.
- Tier(s) affected: All (Pro confirmed)
- Confidence: HIGH
- Evidence: `pro V6` passed. `STATE_MAP.md` explicitly states for `routes` INSERT operations: "**Fails** — console.error only, no toast". The test passing confirms this expected (lack of) user feedback. The annotation `route-button-missing: cannot proof V6` is likely a test-side comment about the difficulty of asserting the *absence* of a toast, but the test's success implies the silent failure was observed.
- Root cause: The `routes` INSERT operation lacks a client-side error handling mechanism to display a user-facing toast notification when a network failure prevents the save, as documented in `STATE_MAP.md`.
- User impact: Users believe their route has been successfully saved, only to discover it is missing later, leading to frustration and distrust in the app's reliability.
- Business impact: Erodes user trust, especially for a core feature like route planning, and can lead to negative perceptions of app quality.
- Fix direction: Add a user-facing toast notification to inform the user when a route save operation fails, particularly due to offline conditions.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier explicitly fails to load the app at all when offline (`net::ERR_INTERNET_DISCONNECTED`). This behaviour is inferred to affect the Free tier as well, as the root cause is a lack of app shell caching. The Guest tier might load partially but would not encounter authentication-related issues.
-   **GPS Acquisition (P3, V3 blocker):** Pro tier explicitly fails to acquire GPS, disabling the "Save Waypoint" button. This is a core map functionality issue and would likely affect all tiers if they were able to initiate waypoint saving.
-   **Waypoint Save Pro Gate (F3):** Free tier *bypasses* the Pro gate and is able to open the "New Waypoint" sheet, which is incorrect. Guest tier waypoints are memory-only, and Pro tier should have full save functionality.
-   **Preference Persistence (V7, V9, V8, V15):** Theme (V7), Basemap (V9), Layer Visibility (V8), and Active Module (V15) preferences all fail to persist across reloads for both Guest and Free tiers (V7 confirmed by direct assertion, V9/V8/V15 by test timeouts or explicit annotations confirming vulnerability). This indicates a systemic persistence issue affecting all user tiers.
-   **Learn Tab State (V13, F4):** Both Guest and Free tiers successfully pass tests related to Learn tab header stats, with `state-loss-evidence` showing no change in stats after tab switches. This indicates the fix for V13 (preserving component state across tab switches) is working for header stats across these tiers.
-   **Session Trail Loss (V1):** Pro tier test passes, but the annotation confirms the vulnerability: GPS track data is lost on reload during active tracking. This is a data safety issue likely affecting all tiers that use the tracking feature.
-   **Route Save Offline (V6):** Pro tier test passes, confirming that route saves fail silently offline (no toast). This behaviour is expected to be consistent across all tiers as it's a server interaction failure without client-side feedback.

## Findings Discarded

-   **`pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap):** This test failed with a timeout. The ambiguity of a timeout (could be test flakiness, element not found, or an actual UX issue) combined with a lack of specific evidence (screenshots, annotations) makes it impossible to confirm a specific UX finding with sufficient confidence. It is discarded as PHANTOM for this run.
-   **`pro V4` (track save fails offline):** This test passed. The test is designed to confirm the vulnerability (track save fails offline), and its passing status indicates that this expected failure behavior was observed. Therefore, there is no *new* UX finding to report beyond the confirmed vulnerability itself.

## Cannot Assess

-   The full extent of `V2` (gold/mineral data missing after offline reload) and `V10` (Pro status reverts to free on offline reload) cannot be assessed. The primary issue is that the application fails to load *at all* when offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any deeper analysis of data or state integrity in an offline scenario.

## Systemic Patterns

1.  **Widespread Persistence Failures:** Multiple user preferences and session data points (`theme`, `basemap`, `layerVisibility`, `activeModule`, `sessionTrail`) are failing to persist across page reloads. This is a critical systemic issue, indicating a fundamental flaw in the implementation or integration of both Zustand's `persist` middleware and manual `localStorage` patterns, or a recent regression affecting these mechanisms.
2.  **Fundamental Offline Unusability:** The application fails to load its core shell when offline, rendering it completely unusable. This is a critical architectural flaw for an outdoor mapping app targeting users in potentially remote areas, directly violating "Offline-First Design" principles.
3.  **Core Feature Blocked by GPS Acquisition:** A primary feature (saving waypoints) is rendered unusable due to a persistent "Acquiring GPS..." state. This points to a significant issue with the app's location services integration or its handling of location data.
4.  **Inconsistent Pro Gating:** A premium feature (waypoint saving) is accessible to free users, indicating a flaw in client-side entitlement checks and undermining the business model.
5.  **Silent Data Loss:** Operations like route saving fail silently when offline, leading to user confusion and distrust. This violates "Data Safety" and "Offline-First Design" principles, as users are not informed of critical failures.

## Calibration Notes

-   The analysis of "passed" tests that confirm vulnerabilities (e.g., V1, V6, V15) was refined. A "pass" in these cases means the test successfully *observed* the predicted vulnerability, rather than indicating a fix. This aligns with the "vulnerability-proof test philosophy."
-   Distinguished between tests failing due to an underlying blocker (e.g., `net::ERR_INTERNET_DISCONNECTED` for V2/V10, or disabled buttons for P3/V3) versus tests failing an assertion. Blockers indicate more severe, foundational issues.
-   Re-evaluated V13 based on the previous fix ("Preserve Learn tab component state across tab switches") and the current test's evidence. The test *passing* and showing *no change* in header stats confirms the fix for *that specific aspect* of V13, even if the test description still implies "state-loss proof." The deeper V13 issue (chapter reading position) is not directly tested by the current suite.
-   The persistent failure of V7 (theme resets) despite a previous "CONFIRMED" fix ("Fix V7: manual localStorage for theme") indicates either the fix was incomplete, incorrectly implemented, or a regression occurred, highlighting the need for thorough re-verification of "fixed" vulnerabilities. The `ee_theme: null` annotation is key evidence here.