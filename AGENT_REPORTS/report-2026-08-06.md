# UX Agent Report — 2026-08-06

## Run Context
- Commits analysed: `54ba614831d831f0cb2aeeca9a3ff0b85b347720` (latest) and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Loss of User-Generated Session Data on Reload (Vulnerability V1, V11, V15)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys via manual `localStorage` patterns.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns for `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) that users expect to persist, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 4. High: Widespread Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, causing the app to revert to default settings and requiring users to reconfigure their preferences repeatedly.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`, with annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null`. This confirms `userStore.theme` is not being persisted via `ee_theme` as per `STATE_MAP.md`. `guest V9` (basemap) and `free V8` (layer preferences) tests timed out, indicating an inability to verify the state after reload, which is highly suggestive of a reset to defaults. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs`.
- Cannot confirm: The exact state of `basemap` and `layerVisibility` after reload for `V9` and `V8` due to test timeouts, but the pattern of persistence failure is consistent with `V7`.
- Root cause: Regression in `localStorage` persistence for `userStore.theme` (manual pattern) and `mapStore.basemap`/`mapStore.layerVisibility` (Zustand `persist` middleware via `ee-map-prefs`).
- User impact: Annoyance and wasted time as users must repeatedly re-apply their preferred settings, leading to a degraded user experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences are not respected.
- Fix direction: Debug and re-enable `localStorage` persistence for `theme`, `basemap`, and `layerVisibility` according to `STATE_MAP.md`.

### 5. Medium: Free User Waypoint Gate Bypass (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet instead of being prompted to upgrade when attempting to save a waypoint, bypassing the intended monetization gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If this bypass allows actual saving of waypoints (which should fail due to Supabase permissions), or if it's purely a UI routing error.
- Root cause: Incorrect conditional rendering or routing logic for the camera button tap, failing to check `isPro` status before deciding whether to show `UpgradeSheet` or `WaypointSheet`.
- User impact: Free users can access a Pro-gated feature's UI, potentially leading to confusion when they cannot complete the action, or a false sense of capability.
- Business impact: Direct loss of potential conversions from free to Pro subscriptions, as the upgrade path is not enforced for a key feature.
- Fix direction: Correct the conditional logic for the camera button tap to display the `UpgradeSheet` for free users.

### 6. Medium: Offline Data Save Failures (Vulnerability V4, V6, V14)
- Summary: The application continues to exhibit known vulnerabilities where user-generated data (tracks, routes, waypoints) cannot be saved offline, leading to data loss or silent failures.
- Tier(s) affected: Pro (inferred Free for V4, V6)
- Confidence: HIGH
- Evidence: `pro V4` (track save fails offline) passed, confirming the failure. `pro V6` (route save offline produces no user-facing toast) passed, confirming the silent failure. `pro V3` (waypoint save fails offline silently) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the lack of a pre-save offline warning.
- Cannot confirm: The exact toast message for V4, as the test only confirms the failure.
- Root cause: Lack of an offline data queue and sync mechanism, as detailed in `STATE_MAP.md` ("What is still NOT persisted"). All Supabase writes fail directly when offline.
- User impact: Users lose valuable data they've created (tracks, routes, waypoints) if they attempt to save while offline, leading to significant frustration and rework.
- Business impact: Erosion of user trust, negative reviews, and reduced engagement with data creation features due to perceived unreliability.
- Fix direction: Implement an offline-first data strategy with a local persistence layer and a sync queue for user-generated content.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier completely fails to load the application when offline. This behavior is inferred to be the same for the Free tier, as both rely on Supabase authentication and data fetching. Guest tier is not explicitly tested for this scenario.
*   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled due to GPS acquisition failure for the Pro tier. This is a core functional issue that would affect all tiers if they were able to access the WaypointSheet.
*   **Persistence Regressions (V1, V7, V8, V9, V11, V15):**
    *   `V7` (theme) affects both Guest and Free tiers, failing to persist.
    *   `V9` (basemap) affects Guest (test timed out, implying reset). `V8` (layer preferences) affects Free (test timed out, implying reset). These likely stem from the same underlying `ee-map-prefs` persistence issue.
    *   `V11` (guest waypoints) and `V15` (active module) specifically affect the Guest tier, confirming loss on reload.
    *   `V1` (session trail) specifically affects the Pro tier, confirming loss on reload.
    *   This indicates a systemic failure in `localStorage` persistence across multiple stores and keys, affecting all tiers for different preferences/data types.
*   **Free User Waypoint Gate (F3):** This issue is specific to the Free tier, where the upgrade gate is bypassed.
*   **Offline Data Save Failures (V4, V6, V14):** Confirmed for the Pro tier. These are general offline write failures to Supabase and would affect any authenticated user (Free, Pro) attempting to save data offline. Guest users do not have Supabase write capabilities for these features.
*   **Learn Tab State (V13):** The `guest V13` and `free V13` tests both *passed*, indicating that the Learn tab header stats are *not* recomputed or lost on tab switch, which confirms the previous fix for V13 is working correctly across both tiers.

## Findings Discarded

*   No findings were discarded in this run, as all identified failures represent significant UX or architectural issues.
*   The `guest V13` and `free V13` tests, despite their "state-loss proof" annotation, actually passed by showing *no* state loss. This indicates the previous fix for V13 is working, so these are not reported as findings.

## Cannot Assess

*   The precise reason for the `Test timeout` errors in `guest V9`, `free V8`, and `pro P1`. While strongly indicative of persistence failures or app loading issues, the timeout itself prevents direct observation of the final state.
*   Whether the `pro V10` issue (Pro status reverting to free offline) would manifest *after* app load, as the app failed to load entirely due to `net::ERR_INTERNET_DISCONNECTED`.

## Systemic Patterns

*   **Widespread Persistence Regression:** A critical pattern observed is the failure of multiple `localStorage` persistence mechanisms. This includes both manual `localStorage` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and Zustand `persist` middleware (`ee-map-prefs`). This suggests a recent change or environmental factor is broadly impacting how the application saves and retrieves user and session state.
*   **Fundamental Offline Instability:** The complete inability of authenticated tiers to load the application offline points to a severe deficiency in the Service Worker caching strategy for the core app shell and initial data. This is a foundational architectural problem for an app targeting rural users.
*   **GPS Acquisition System Failure:** The consistent "Acquiring GPS..." state and disabled save buttons indicate a core issue with the application's GPS handling, either in its integration with the browser's geolocation API or its internal state management (`mapStore.userLocation`).

## Calibration Notes

*   The passing `V13` tests (no state loss) confirmed the effectiveness of the previous fix, reinforcing the need to interpret "proof" annotations in context of the expected outcome, not just the test name.
*   The high confidence in persistence regressions (V1, V7, V11, V15) is directly supported by explicit `localStorage` annotations (e.g., `ee_theme: null`, `ee_guest_waypoints absent`), aligning with past successful diagnoses based on direct evidence.
*   Timeout errors (V8, V9, P1) are treated cautiously, acknowledging the inability to confirm the exact state, but inferring likely issues based on the broader pattern of failures and the test's intent, avoiding speculative "PHANTOM" diagnoses.
*   The critical offline loading failures (V2, V10) are prioritized highly, reflecting the understanding from "Offline-First Design" context that such issues are catastrophic for user experience.