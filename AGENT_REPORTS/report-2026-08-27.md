# UX Agent Report — 2026-08-27

## Run Context
- Commits analysed: `ddf5796313f8a22e539b488b315e156cd87acc60` and 19 preceding commits.
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
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V1, V7, V11, and V15.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` and `free V8` failed (timeout), strongly implying `mapStore.basemap` and `mapStore.layerVisibility` reset. `STATE_MAP.md` lists these under `ee-map-prefs` Zustand persist.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
- Cannot confirm: The exact point of failure in the persistence mechanisms (e.g., write failure, read failure, or incorrect key usage).
- Root cause: A systemic failure in the localStorage persistence mechanisms. This affects both Zustand `persist` middleware keys (`ee-map-prefs`) and the manual IIFE + `localStorage.setItem` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This is a major regression from previously "CONFIRMED" fixes.
- User impact: Users lose their personalized settings and in-progress work (waypoints, tracks) on every page reload, leading to severe frustration, loss of trust, and repeated setup.
- Business impact: High churn due to unreliable experience, negative reviews, and reduced engagement with core features that require persistence.
- Fix direction: Thoroughly audit all `localStorage` interactions, including Zustand `persist` middleware configuration and manual IIFE patterns, to ensure data is correctly written and read on app load/reload.

### 4. High: Free Users Incorrectly Allowed to Save Waypoints (F3)
- Summary: Free tier users are incorrectly routed to the "New Waypoint" sheet when tapping the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed because `expect(upgradeShown).toBeTruthy()` was `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the UpgradeSheet was *not* shown, but the WaypointSheet *was*.
- Cannot confirm: If the waypoint save process would actually complete for a free user, or if it would fail later.
- Root cause: Incorrect gating logic for the camera button/waypoint creation flow for free users. The `isPro` check is either missing or inverted, allowing free users to access a Pro-gated feature.
- User impact: Free users can access a premium feature, potentially leading to confusion or frustration if the save operation fails later. It also bypasses a key monetization funnel.
- Business impact: Direct loss of potential Pro conversions, as the primary upgrade prompt for a core feature is bypassed.
- Fix direction: Implement correct `isPro` gating logic for the waypoint creation flow to ensure free users are directed to the UpgradeSheet.

### 5. Medium: No Offline Warning Before Waypoint Save Attempt (V14 Confirmed)
- Summary: The application does not provide a user-facing warning about being offline before a user attempts to save a waypoint, leading to silent failure or a post-action error toast.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning.
- Cannot confirm: The exact wording of the post-save error toast, as the primary issue (disabled save button) prevented reaching that stage.
- Root cause: Lack of an explicit network status check and corresponding UI feedback before initiating a Supabase write operation. `STATE_MAP.md` confirms "Fails — toast 'Could not save waypoint'" but no pre-check.
- User impact: Users attempt to save data, only to be met with a failure message *after* their action, which is less helpful than a proactive warning.
- Business impact: Contributes to a perception of unreliability, especially in offline scenarios, potentially reducing user trust and engagement.
- Fix direction: Implement a network connectivity check and display a clear, proactive offline warning to the user before they attempt to save a waypoint.

### 6. Low: Pro User Upgrade Sheet Test Timeout (P1)
- Summary: The test designed to confirm Pro users do not see the UpgradeSheet when tapping a Pro affordance timed out, making it ambiguous whether the expected behavior was met.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with a `Test timeout of 60000ms exceeded`. This test is designed to confirm that Pro users *do not* see the UpgradeSheet.
- Cannot confirm: Whether the UpgradeSheet actually appeared for the Pro user (a bug), or if the test merely timed out waiting for a condition that was already met (i.e., the UpgradeSheet was *not* visible, which is correct behavior).
- Root cause: Ambiguous test assertion or element visibility check. The test might be waiting for an element to *not* be visible, which can lead to timeouts if the element is never found.
- User impact: Unclear. If the UpgradeSheet *did* appear, it's a significant bug for Pro users. If it didn't, the test is just flaky.
- Business impact: Unclear. If a bug, it erodes trust for paying customers. If a flaky test, it wastes CI resources.
- Fix direction: Refine the `pro P1` test assertion to explicitly check for the *absence* of the UpgradeSheet within a reasonable timeout, or for the presence of an expected Pro-only feature.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier tests failed to load the app offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is likely identical for Free users, as they also require authentication and Supabase access for core data. Guest users might load the app shell but would lack any authenticated features.
-   **GPS Acquisition (P3, V3):** Pro tier tests show the "Save Waypoint" button disabled due to "Acquiring GPS...". This issue is likely identical across all tiers if they attempt to save waypoints, as it points to a fundamental problem with GPS data acquisition.
-   **Persistence Failures (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Fails for both Guest and Free tiers, resetting to 'dark'. This indicates a universal persistence issue for `ee_theme`.
    -   **Basemap (V9) / Layer Visibility (V8):** Fails (timeout) for both Guest and Free tiers, implying resets. This points to a universal persistence issue for `ee-map-prefs`.
    -   **Guest Waypoints (V11):** Confirmed lost on reload for Guest tier. This is specific to guest sessions.
    -   **Active Module (V15):** Confirmed lost on reload for Guest tier. Likely affects Free/Pro if they use modules.
    -   **Session Trail (V1):** Confirmed lost on reload for Pro tier. Likely affects Free if they track. Guest cannot track.
    The widespread nature of these failures across different persistence mechanisms (Zustand `persist` and manual `localStorage`) and across tiers suggests a systemic problem with `localStorage` interaction or app initialization.
-   **Learn Tab State (V13, F4):** The Learn header statistics (courses, completion percentage) are correctly preserved across tab switches for both Guest and Free tiers. This indicates the fix for V13 is working for this specific aspect of state.
-   **Pro Badges (F2):** Free users correctly see PRO badges in the LayerPanel, as expected.
-   **Waypoint Gating (F3):** Free users are incorrectly routed to the WaypointSheet instead of the UpgradeSheet, a behavior specific to the Free tier's monetization funnel.

## Findings Discarded

-   No findings were discarded due to matching a previous PHANTOM verdict.
-   No findings were discarded due to being too weak; all identified issues had sufficient evidence.

## Cannot Assess

-   The exact state of `isPro` and `subscriptionStatus` persistence (V10) for Pro users when offline, as the app fails to load entirely.
-   The specific chapter reading position state loss within the Learn tab (V13), as the current tests only verify header statistics, not in-chapter progress.
-   The full extent of persistence failures (V8, V9, V15) for the Pro tier, as tests for these were not explicitly run or timed out ambiguously.

## Systemic Patterns

1.  **Fundamental Offline Capability Breakdown:** The most critical systemic issue is the complete failure of the application to load for authenticated users when offline. This renders the app unusable in its primary target environment and blocks testing of other offline-related vulnerabilities (V10, V2).
2.  **Widespread Persistence Regression:** There is a broad failure across multiple state management mechanisms (Zustand `persist` and manual `localStorage` patterns) to correctly store and retrieve user preferences and session data. This suggests a recent change has globally impacted `localStorage` access or the app's initialization sequence, causing a regression of several previously fixed vulnerabilities (V1, V7, V8, V9, V11, V15).
3.  **GPS Integration Instability:** The consistent failure to acquire GPS data, leading to disabled "Save Waypoint" buttons, points to a persistent issue with the `useTracks` hook, `mapStore.userLocation` updates, or the Playwright geolocation mock setup.

## Calibration Notes

-   The analysis prioritized critical user-blocking issues (offline app load, GPS acquisition) based on past successful diagnoses.
-   Regressions from previously "CONFIRMED" fixes (V1, V7, V11, V15) were identified with high confidence due to explicit annotations confirming the loss of persisted state, reinforcing the importance of detailed test evidence.
-   Interpreted "PASS" for vulnerability tests (V1, V11, V15) as confirmation of the vulnerability *existing* when accompanied by specific "confirmed" annotations. Conversely, "PASS" for V13/F4 was interpreted as the *fix working* for header stats, as the annotation showed no state change.
-   Ambiguous timeouts (P1) were noted as lower confidence, avoiding speculative conclusions.
-   The `net::ERR_INTERNET_DISCONNECTED` error was correctly identified as a critical app-loading failure, preventing further testing of offline features, consistent with previous reports.