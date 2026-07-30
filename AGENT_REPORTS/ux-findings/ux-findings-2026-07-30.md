# UX Agent Report — 2026-07-30

## Run Context
- Commits analysed: `41448cb79a67d4a1d02c58adcabff004393a405e` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3 implied)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: User-Generated Session Data (Tracks, Guest Waypoints) Lost on Reload (Vulnerability V1, V11 Regression)
- Summary: Critical user-generated session data, including active GPS tracks and guest waypoints, are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest (V11), Pro (V1), (inferred Free for V1)
- Confidence: HIGH
- Evidence: `guest V11` test annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` test annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claim that `sessionWaypoints` and `sessionTrail` persist via `ee_guest_waypoints` and `ee_session_trail` respectively.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for these keys.
- Root cause: The manual `localStorage` keys (`ee_guest_waypoints`, `ee_session_trail`) are either not being written to or read from `localStorage` correctly, despite `STATE_MAP.md` indicating they should be.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations), leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug the manual `localStorage` write/read patterns for `sessionWaypoints` and `sessionTrail` to ensure data persistence across reloads.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (Feature F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints directly via the camera button, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific code change that introduced this regression.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check the user's `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users access a premium feature without paying, diminishing the value proposition of the Pro subscription.
- Business impact: Direct revenue loss, devalues the Pro subscription, and creates an unfair advantage for free users.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when the camera button is tapped, ensuring `isPro` status is correctly evaluated.

### 5. High: User Preferences (Theme, Basemap, Layers, Active Module) Lost on Reload (Vulnerability V7, V9, V8, V15 Regression)
- Summary: User preferences for theme, basemap, layer visibility, and the active module selection are lost on page reload, indicating a regression in their `localStorage` persistence mechanisms.
- Tier(s) affected: All (V7, V9, V8), Guest (V15)
- Confidence: HIGH (for V7, V15), MEDIUM (for V9, V8)
- Evidence:
    - `guest V7` and `free V7` tests failed, with annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, and `Expected: "light" Received: "dark"`.
    - `guest V15` test annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `guest V9` and `free V8` tests timed out, strongly implying a failure to persist basemap and layer preferences, respectively.
- Cannot confirm: The exact cause of the timeouts for V9 and V8, but the pattern of other persistence failures makes it highly probable.
- Root cause: The manual `localStorage` keys (`ee_theme`, `ee_active_module`) are not being written/read correctly. For `basemap` and `layerVisibility`, `STATE_MAP.md` indicates they are persisted via Zustand's `ee-map-prefs`, which appears to be failing. This contradicts `STATE_MAP.md`.
- User impact: Annoying, app feels unreliable, users constantly re-setting preferences, leading to a poor user experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't remembered.
- Fix direction: Debug the manual `localStorage` write/read patterns for `theme` and `activeModule`. Investigate Zustand `persist` middleware for `mapStore` (`ee-map-prefs`) to ensure `basemap` and `layerVisibility` are correctly persisted.

### 6. Medium: No Offline Warning Before Waypoint Save Attempt (Vulnerability V14)
- Summary: The application does not provide a user-facing warning or pre-check when attempting to save a waypoint offline, leading to a failed save operation without clear user guidance.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact error message shown to the user if the save button were enabled and clicked offline, as the button is currently disabled due to GPS issues.
- Root cause: Lack of an explicit offline detection and warning mechanism before initiating Supabase write operations for waypoints. `STATE_MAP.md` confirms "Fails — toast 'Could not save waypoint'" but no pre-check.
- User impact: User attempts to save, the operation fails, and they are not informed *why* it failed or that they are offline, leading to confusion and frustration.
- Business impact: Frustration, perceived unreliability, and increased support requests.
- Fix direction: Implement an offline detection mechanism to display a clear warning to the user before they attempt to save a waypoint when offline.

### 7. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: The application fails to save a recorded GPS track when the user is offline, resulting in the loss of the entire track data.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V4` test passed. The test is designed to pass if the track save *fails* offline, thus confirming the vulnerability. `STATE_MAP.md` states `tracks` INSERT "Fails — toast 'Could not save track'", confirming this behavior.
- Cannot confirm: The exact toast message or UI feedback provided to the user, as the test only confirms the failure.
- Root cause: Lack of an offline data queue or local-first write strategy for track data. Supabase write operations fail directly when offline.
- User impact: Loss of valuable, effort-intensive GPS track data, leading to significant frustration and potential re-doing of activities.
- Business impact: Data loss, perceived unreliability, and negative user sentiment, especially for prospectors in remote areas.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store track data locally and sync it when connectivity is restored.

### 8. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: The application fails to save a user-created route when offline, and this failure is not communicated to the user via a toast notification, leading to silent data loss.
- Tier(s) affected: Pro (inferred Free)
- Confidence: LOW
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not directly verify the *silent* aspect of the failure. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast".
- Cannot confirm: The exact user experience of the silent failure, as the test's proof was limited.
- Root cause: Lack of an offline data queue for routes and absence of user-facing feedback (toast) on Supabase write failure.
- User impact: User believes their route has been saved, but it is silently lost, leading to confusion and potential re-work.
- Business impact: Data loss, user frustration, and erosion of trust in the application's data integrity.
- Fix direction: Implement an offline data queue for routes and ensure a user-facing toast notification is displayed upon offline save failure.

## Tier Comparison

-   **V13 (Learn tab state loss):** Both `guest V13` and `free V13` tests passed with identical `before` and `after` header stats, indicating that the Learn tab's header state is now correctly preserved across tab switches for both unauthenticated and authenticated users. This vulnerability appears to be fixed across all tiers.
-   **V7 (Theme resets):** `guest V7` and `free V7` both failed, showing that the theme preference resets to 'dark' on reload, and the `ee_theme` localStorage key is `null` before and after reload. This behavior is identical across unauthenticated and authenticated free users, pointing to a systemic issue with the `ee_theme` persistence mechanism.
-   **V9 (Basemap resets) & V8 (Layer preferences reset):** `guest V9` and `free V8` tests both resulted in timeouts. While not direct assertions, the consistent timeout for preference persistence across tiers suggests a shared underlying issue with `mapStore`'s `ee-map-prefs` Zustand persistence, affecting all users.
-   **V11 (Guest waypoints lost):** This vulnerability is specific to the `guest` tier, as authenticated users save waypoints to Supabase. The test confirms loss of guest waypoints on reload.
-   **V15 (Active module resets):** This vulnerability was confirmed for the `guest` tier, with `ee_active_module` absent after reload. While not tested for `free` or `pro`, the manual `localStorage` pattern suggests it would affect all tiers if the write/read is broken.
-   **V2/V10 (Offline app load failure):** `pro V10` and `pro V2` tests failed due to `net::ERR_INTERNET_DISCONNECTED`. This critical failure to load offline is likely to affect `free` users as well, as both are authenticated and rely on Supabase for initial data, but was not explicitly tested for `free`. `guest` users might load partially if their initial data dependencies are fewer.
-   **P3/V3 (Waypoint save button disabled):** Tested only for `pro` tier, but the underlying GPS acquisition issue would prevent *any* user from saving waypoints if they reached the `WaypointSheet`.
-   **F3 (Free users save waypoints):** This is a specific regression affecting only the `free` tier, allowing them to bypass a `pro`-gated feature.
-   **V1/V4/V6 (Track/Route save offline):** Tested only for `pro` tier, but the lack of offline data queuing and silent failure mechanisms would affect any authenticated user attempting these actions offline.

## Findings Discarded

-   No findings were discarded in this run, as all identified issues were deemed to have sufficient confidence and user/business impact to warrant inclusion within the 8-finding limit.

## Cannot Assess

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test timed out. P1 was previously marked CONFIRMED (fixed), meaning the UpgradeSheet *should not* be shown. A timeout here means the test couldn't complete its assertion, not necessarily that the UpgradeSheet *was* shown. Therefore, the status of P1 (fixed) remains unconfirmed by this run's test result.
-   **pro V6 — route save offline produces no user-facing toast (silent failure):** While the test passed (confirming the failure), the annotation `route-button-missing: cannot proof V6` indicates the test could not directly verify the *silent* aspect of the failure (i.e., the absence of a toast). The `STATE_MAP.md` confirms the silent failure, but the test itself provides limited direct evidence for this specific aspect.

## Systemic Patterns

1.  **Widespread Persistence Mechanism Failure:** A critical systemic issue is the failure of multiple `localStorage` persistence mechanisms. This affects both Zustand's `persist` middleware (`ee-map-prefs` for basemap/layers) and the manual IIFE + `setItem` pattern (`ee_theme`, `ee_active_module`, `ee_guest_waypoints`, `ee_session_trail`). The `STATE_MAP.md` explicitly claims these items are persisted, but test annotations consistently show the `localStorage` keys as `null` or `absent` after reload. This indicates a fundamental breakdown in how state is being saved and rehydrated, leading to significant data and preference loss across the application.
2.  **Incomplete Offline-First Implementation:** Beyond basic map tile caching, the application lacks robust offline capabilities. It completely fails to load for authenticated users when offline (V2/V10) and exhibits silent or poorly communicated failures for all data write operations (waypoints, tracks, routes) without any queuing mechanism (V3, V4, V6, V14). This is a major disconnect from the target user's likely environment (rural Ireland with patchy connectivity).
3.  **GPS Acquisition Instability:** The consistent failure to acquire GPS coordinates, leading to a disabled "Save Waypoint" button (P3, V3), points to an underlying issue with the app's GPS handling logic, potentially exacerbated by the Playwright geolocation mock. This impacts a core feature of the app.

## Calibration Notes

-   I have explicitly called out instances where test annotations directly contradict the `STATE_MAP.md` (e.g., `ee_theme` being `null` despite being listed as persisted). This is a strong indicator of a discrepancy between documented architecture and runtime behavior.
-   For tests like `guest V13` and `free V13`, where the test name implies "state-loss proof" but the `before`/`after` annotations are identical and the test passes, I've interpreted this as the *fix* for V13 being successful (i.e., state *is* preserved), rather than a failure of the test itself.
-   Timeouts for persistence tests (V9, V8) were rated MEDIUM confidence rather than PHANTOM, given the strong pattern of other confirmed persistence failures (V7, V1, V11, V15). This inference is grounded in the systemic nature of the observed issues.
-   The consistent GPS acquisition failure (P3, V3) despite Playwright's geolocation mock is treated as a high-confidence finding, as it directly impacts core functionality and is observable in screenshots.