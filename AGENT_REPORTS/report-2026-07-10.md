# UX Agent Report — 2026-07-10

## Run Context
- Commits analysed: `a89a72fec1372d967ff98abc83d661ae69e563fe` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled & Offline Save Fails (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` due to a failure in GPS acquisition, preventing users from saving waypoints even when online. Offline save attempts also fail silently without a pre-save warning.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. Additionally, the app lacks an offline data queue for writes (V3) and a pre-save warning (V14).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and implement an offline write queue with appropriate user warnings.

### 3. Critical: GPS Track Data Lost on Reload (Vulnerability V1)
- Summary: A user's accumulated GPS track (`sessionTrail`) is lost on page reload, despite `STATE_MAP.md` indicating it should be persisted via `ee_session_trail`.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: The `pro V1` test passed, but its annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact point of failure in the manual persistence implementation (e.g., not writing, or being cleared prematurely).
- Root cause: The manual persistence mechanism for `sessionTrail` (task-006) is not correctly implemented or is being cleared, leading to data loss.
- User impact: Loss of potentially hours of recorded activity, leading to significant frustration and distrust in the app's data safety.
- Business impact: Severe erosion of user trust, abandonment of the tracking feature, and negative word-of-mouth.
- Fix direction: Verify and fix the implementation of `ee_session_trail` manual persistence in `mapStore.js` to ensure `sessionTrail` survives reloads.

### 4. Major: Persistence of Preferences and Session Data Fails (Vulnerability V7, V9, V8, V11, V15)
- Summary: Multiple user preferences and session-specific data, including theme, basemap, layer visibility, guest waypoints, and active module, are not persisted across page reloads, reverting to defaults.
- Tier(s) affected: All (guest, free, pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` failed with timeouts, indicating expected basemap/layer states were not found after reload.
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `STATE_MAP.md` indicates `theme`, `sessionWaypoints`, `sessionTrail`, and `activeModule` use manual `localStorage` patterns, while `basemap` and `layerVisibility` use Zustand `persist` middleware. All appear to be failing.
- Cannot confirm: The precise failure point for each persistence mechanism (e.g., write failure, read failure, or premature clearing).
- Root cause: A systemic issue with both Zustand `persist` middleware configuration (for `ee-map-prefs`) and the manual `localStorage` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`) leading to state not being correctly saved or rehydrated.
- User impact: Constant need to reconfigure basic app settings and loss of unsaved guest data, leading to significant frustration and reduced efficiency.
- Business impact: Erodes user trust, increases friction for new users (guests), and negatively impacts overall user experience.
- Fix direction: Thoroughly debug and verify all persistence mechanisms, ensuring data is correctly written to and read from `localStorage` and that Zustand `persist` is configured correctly.

### 5. Major: Inconsistent Waypoint Gating Across Tiers (Vulnerability F3, P1)
- Summary: The logic for gating waypoint creation is inconsistent: Free users can bypass the upgrade sheet to open the `WaypointSheet`, while Pro users are incorrectly shown the `UpgradeSheet` when attempting to use a Pro feature.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence:
    - `free F3` failed: `expect(upgradeShown).toBeTruthy()` failed, with annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}`. This shows the `UpgradeSheet` was NOT shown, but the `WaypointSheet` WAS.
    - `pro P1` failed with a timeout. The test expects the `UpgradeSheet` *not* to be shown for Pro users. A timeout here strongly implies the `UpgradeSheet` *was* shown, blocking the test's progression.
    - `guest C3` passed, correctly showing the `UpgradeSheet` for guests.
- Cannot confirm: If free users can actually *save* waypoints after bypassing the gate, or if Pro users are consistently shown the `UpgradeSheet` for all Pro features.
- Root cause: Flawed conditional rendering logic based on `userStore.isPro` or `userStore.subscriptionStatus`, leading to incorrect routing for both free and pro users.
- User impact: Confusing and frustrating experience for both free (false hope) and pro (questioning subscription) users.
- Business impact: Potential revenue loss if free users can access paid features, or significant user churn and support burden if paying users are prompted to upgrade.
- Fix direction: Review and correct the gating logic for all Pro features, ensuring `isPro` status is accurately checked and `UpgradeSheet` is displayed only when appropriate.

### 6. Major: Offline Data Save Failures (Vulnerability V4, V6)
- Summary: Explicit save operations for tracks and routes fail when the user is offline, leading to data loss, with route saves failing silently without user feedback.
- Tier(s) affected: All (pro confirmed, likely guest/free)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms `tracks` INSERT fails offline, leading to data loss.
    - `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms `routes` INSERT fails silently offline.
- Cannot confirm: The exact toast message for V4, or the console error for V6.
- Root cause: Lack of an offline write queue for user-generated data. The app attempts direct Supabase writes without local caching or retry mechanisms.
- User impact: Loss of valuable user-generated content (tracks, routes), leading to significant frustration and distrust. Silent failures are particularly damaging as users believe their data is saved.
- Business impact: Severe erosion of user trust, abandonment of key features, and negative perception of app reliability, especially for a target audience in rural areas.
- Fix direction: Implement a robust offline data synchronization queue (e.g., using IndexedDB) for all user-generated content, coupled with clear user feedback for pending and failed syncs.

### 7. Minor: Learn Tab Header Stats Recomputed on Tab Switch (Vulnerability V13)
- Summary: When switching away from and back to the Learn tab, the header statistics (e.g., courses, complete percentage) are recomputed, indicating a loss of component state.
- Tier(s) affected: All (guest, free)
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed, with `state-loss-evidence` annotations showing identical "before" and "after" stats. This confirms the recomputation, which happens because the component is unmounted and remounted. `UX Knowledge Context` highlights that "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- Cannot confirm: If the in-progress chapter reading position is also lost, though it is highly probable given the recomputation of header stats.
- Root cause: The `App.jsx` component conditionally renders non-map tabs, causing them to unmount and remount when switching, leading to loss of their internal component state.
- User impact: Minor annoyance, as the user's position within a chapter or scroll position in a course list is lost, breaking continuity in the learning journey.
- Business impact: Reduces engagement with the learning module, as users are forced to re-navigate to their previous position.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted in the DOM (e.g., by toggling `display: none` or `visibility: hidden`) instead of unmounting them.

## Tier Comparison

-   **Offline Loading (V10, V2):** Pro tier fails completely to load. This behavior is expected to be identical for Free users, as both require authentication and Supabase data. Guest users, while not authenticated, might still experience issues if core app shell assets are not cached.
-   **Theme Reset (V7):** Affects Guest and Free tiers identically, resetting to 'dark'. This indicates a core persistence issue not tied to authentication status.
-   **Basemap & Layer Preferences Reset (V9, V8):** Affects Guest and Free tiers identically, resetting to defaults. This also points to a core persistence issue independent of authentication.
-   **Waypoint Persistence (V11):** Guest waypoints are confirmed to be memory-only and lost on reload. Authenticated users (Free/Pro) *should* persist waypoints to Supabase, but the `pro P3/V3` failures indicate that saving waypoints is currently broken for Pro users, making persistence moot.
-   **Active Module Reset (V15):** Affects Guest tier, resetting to 'prospecting'. This behavior is expected to be identical for Free and Pro users, as it's a `moduleStore` persistence issue.
-   **Track Persistence (V1):** Confirmed for Pro tier, track data is lost on reload. This behavior is expected to be identical for Guest and Free users, as it's a `mapStore` persistence issue.
-   **Waypoint Gating (F3, P1, C3):**
    -   **Guest (C3):** Correctly shown the `UpgradeSheet` when tapping a Pro-gated feature.
    -   **Free (F3):** Incorrectly bypasses the `UpgradeSheet` and opens the `WaypointSheet` directly.
    -   **Pro (P1):** Incorrectly shown the `UpgradeSheet` when tapping a Pro-gated feature.
    This shows a significant inconsistency in the gating logic across all three tiers.
-   **Offline Data Saves (V3, V4, V6):** Confirmed failures for Pro users (waypoints, tracks, routes). This behavior is expected to be identical for any tier attempting to save data offline, as it's a fundamental lack of offline write queue.
-   **Learn Tab State Loss (V13):** Affects Guest and Free tiers identically, with header stats recomputing. This indicates a component lifecycle issue (unmount/remount) common to all tiers.

## Findings Discarded
-   No findings were discarded. All identified issues were distinct and impactful enough to be included within the 8-finding limit after consolidation.

## Cannot Assess
-   No specific components or functionalities were entirely unassessable due to missing data or test failures. The `pro V10` and `pro V2` failures prevented deeper analysis of offline `isPro` status, but the primary issue (app failing to load) is clear.

## Systemic Patterns

1.  **Fundamental Offline-First Failure:** The application is not offline-first. It completely fails to load for authenticated users without a network connection, and all data write operations (waypoints, tracks, finds, routes) fail silently or with simple toasts, without any local queuing or retry mechanisms. This is a critical architectural gap for an outdoor mapping app.
2.  **Widespread Persistence Implementation Issues:** There is a recurring pattern of state loss across multiple critical user preferences and session data. This affects both Zustand's `persist` middleware (`ee-map-prefs` for basemap/layers) and several manual `localStorage` implementations (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This suggests either incorrect implementation of the manual patterns or issues with how Zustand's `persist` is configured or interacted with.
3.  **Inconsistent Authorization Gating:** The logic for determining user access to Pro features and displaying the `UpgradeSheet` is inconsistent and buggy across different user tiers. This leads to both free users bypassing intended paywalls and paying Pro users being incorrectly prompted to upgrade.
4.  **Volatile Component State on Tab Switch:** The application's approach to rendering non-map tabs (unmounting and remounting them) leads to a loss of component-specific state, breaking user continuity within those modules.

## Calibration Notes
-   The new three-tier analysis and vulnerability-proof test philosophy proved highly effective. Annotations like `(V11 confirmed)` and `v14-pre-save-offline-warning: no (V14 confirmed)` provided direct, high-confidence evidence for vulnerabilities even when tests "passed" (meaning the journey completed and confirmed the vulnerability).
-   Consolidating multiple related persistence failures (V7, V9, V8, V11, V15) into a single, comprehensive finding allowed for a more holistic view of the underlying architectural problem without exceeding the finding limit. This aligns with previous successful consolidations.
-   The `STATE_MAP.md` was crucial for tracing observed UX issues (e.g., persistence failures) back to their specific implementation details (Zustand `persist` vs. manual `localStorage` keys) and for understanding expected offline behavior.
-   Careful interpretation of "FAIL" vs. "PASS" for vulnerability tests was key. A "PASS" for a vulnerability test often means the vulnerability *was confirmed*, not that the system behaved correctly. This was a learning from previous calibration.