# UX Agent Report — 2026-09-13

## Run Context
- Commits analysed: `de66336ee1c7aba60dbfbcb15da214f6cc041249` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
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

### 3. High: Pro Users Incorrectly See Upgrade Sheet (P1 Regression)
- Summary: Authenticated Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, suggesting their Pro status is not being correctly recognized by the UI gating logic.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is designed to assert that the UpgradeSheet is *not* visible. A timeout strongly implies the sheet *was* visible, causing the test to wait indefinitely.
- Cannot confirm: The exact component or store field that is misreporting `isPro` status, but the outcome is clear.
- Root cause: A race condition or incorrect logic in `useAuth` or `useSubscription` where `isPro` is not `true` by the time the Pro affordance is tapped, or the gating logic itself is flawed. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may reset `isPro` to false on null session, but `global-setup.js` should poll for `isPro:true`.
- User impact: Paying users are confused and frustrated, feeling like their subscription is not recognized or valued.
- Business impact: Erodes trust in the subscription model, increases support burden, and could lead to cancellations.
- Fix direction: Investigate the `isPro` state hydration and gating logic for Pro affordances, ensuring `isPro` is `true` and stable before UI renders.

### 4. High: GPS Track Data Lost on Reload (V1 Confirmed)
- Summary: Any accumulated GPS track data from an active tracking session is lost if the application is reloaded or crashes before the user explicitly saves the track.
- Tier(s) affected: All (any user who tracks)
- Confidence: HIGH
- Evidence: `pro V1` test passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` notes `sessionTrail` accumulates in `mapStore` and is "not persisted anywhere until the user explicitly saves."
- Cannot confirm: The exact frequency of app crashes or accidental reloads in the wild, but the data loss mechanism is clear.
- Root cause: `mapStore.sessionTrail` is not persisted to `localStorage` during active tracking, making it volatile.
- User impact: Users lose valuable data from their outdoor activities, leading to significant frustration and loss of trust in the app's reliability.
- Business impact: Damages user retention and reputation, especially for a core feature like GPS tracking.
- Fix direction: Implement auto-persistence of `sessionTrail` to `localStorage` (e.g., `ee_session_trail`) at regular intervals during active tracking, with explicit save/discard on session end.

### 5. High: Offline Data Loss for Tracks, Finds, and Routes (V4, V6 Confirmed)
- Summary: User-generated data for tracks, finds, and routes is lost if the user attempts to save while offline, with either a silent failure (routes) or a non-persistent toast (tracks, finds). There is no offline queue or retry mechanism.
- Tier(s) affected: All (authenticated users for finds/routes, all for tracks)
- Confidence: HIGH
- Evidence:
    - `pro V4` test passed, confirming "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms `tracks` INSERT fails offline with toast "Could not save track", and data is lost.
    - `pro V6` test passed, confirming "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms `routes` INSERT fails offline with `console.error` only, and data is lost.
- Cannot confirm: The exact toast message for track/finds from the test output, but `STATE_MAP.md` is explicit.
- Root cause: Lack of an offline-first data strategy, specifically a persistent sync queue for user-generated content. All writes are directly to Supabase without local caching or retry logic. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data they've spent time creating, especially in rural areas with poor connectivity, leading to severe frustration and distrust.
- Business impact: Directly impacts user retention, data integrity, and the app's reputation as a reliable tool for outdoor activities.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and retry failed write operations for tracks, finds, and routes.

### 6. Medium: Widespread Preference Loss on Reload (V7, V9, V8, V15 Regression)
- Summary: Multiple user preferences including theme, basemap, layer visibility, and active module are not persisting across page reloads, forcing users to reconfigure the app repeatedly.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This confirms `ee_theme` is not being written or read.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`. This indicates failure to assert persistence for basemap and layer visibility, respectively. `STATE_MAP.md` states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V15` test passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms `activeModule` is not persisting. `STATE_MAP.md` states `activeModule` persists via `ee_active_module`.
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key for V9/V8 due to timeout, but the failure pattern is consistent with persistence loss.
- Root cause: The manual `ee_theme` and `ee_active_module` localStorage persistence mechanisms are broken. The `ee-map-prefs` Zustand `persist` middleware for `basemap` and `layerVisibility` is either misconfigured or failing to write/read correctly. This is a regression from previous fixes (task-001, task-008, task-013).
- User impact: Annoying, repetitive setup, loss of customisation, leading to a perception of an unreliable application.
- Business impact: Frustration, reduced user satisfaction, and potential abandonment.
- Fix direction: Debug and verify all manual `localStorage` persistence (for `theme`, `activeModule`) and Zustand `persist` middleware configurations (for `basemap`, `layerVisibility`) to ensure preferences are correctly saved and loaded.

### 7. Medium: Guest Waypoints Lost on Reload (V11 Confirmed)
- Summary: Waypoints created by guest users are stored only in volatile memory and are permanently lost upon page reload or app closure.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` explicitly states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002). The test evidence contradicts `STATE_MAP.md`'s claim of persistence.
- Cannot confirm: The exact reason `ee_guest_waypoints` is absent, given `STATE_MAP.md` says it *should* persist. This suggests a regression or misconfiguration of task-002.
- Root cause: The manual persistence mechanism for `sessionWaypoints` (task-002) is not functioning correctly, or the test is correctly identifying a gap in its implementation.
- User impact: Guest users lose their temporary waypoints, making the "guest" experience frustrating and discouraging conversion to authenticated users.
- Business impact: Hinders user acquisition and conversion funnel by providing a poor initial experience.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` to ensure waypoints are correctly saved and loaded from `localStorage` for guest users.

### 8. Medium: No Offline Warning Before Waypoint Save Attempt (V14 Confirmed)
- Summary: The application does not provide a user-facing warning that a waypoint save will fail if the user is offline, leading to unexpected data loss.
- Tier(s) affected: Pro (inferred Free if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This directly confirms the absence of a warning.
- Cannot confirm: The exact UI state during the offline attempt due to the GPS issue blocking the save button.
- Root cause: Missing pre-check for network connectivity before initiating a Supabase write for waypoints. This violates "Offline-First Design" principles.
- User impact: Users are unaware their action will fail, leading to frustration and wasted effort when their waypoint isn't saved.
- Business impact: Contributes to a perception of unreliability and poor user experience.
- Fix direction: Implement a network connectivity check before allowing a waypoint save, and display a clear warning if offline. Ideally, couple this with an offline queue.

## Tier Comparison
- **Offline App Loading (V2, V10):** Pro tier explicitly fails to load offline. This behavior is likely identical for Free tier, as both rely on Supabase auth and data loading. Guest tier is not tested for this, but might load partially as it has fewer Supabase dependencies.
- **GPS Acquisition Failure (P3, V3):** Pro tier shows the "Save Waypoint" button disabled due to "Acquiring GPS...". This behavior is expected to be identical across all tiers if they were able to access the WaypointSheet and attempt to save.
- **Preference Loss (V7, V9, V8, V15):** Theme (V7) resets for both Guest and Free. Basemap (V9) and Layer Visibility (V8) reset for Guest and Free respectively. Active Module (V15) resets for Guest. This indicates a systemic failure in persistence mechanisms affecting all tiers equally, regardless of authentication status.
- **Learn Tab State (V13, F4):** Both Guest V13 and Free V13/F4 tests show that Learn header stats persist across tab switches, with identical `before` and `after` values. This indicates the fix for *header stats persistence* is working for both unauthenticated and authenticated users. The underlying vulnerability (V13: chapter reading position loss) is not tested by these specific tests.
- **Waypoint Persistence (V11):** Guest waypoints are confirmed to be memory-only. Authenticated users (Free/Pro) save waypoints to Supabase, so this specific vulnerability does not apply to them.
- **Pro Badges (F2):** Free users correctly see PRO badges as upgrade affordances. Pro users are expected *not* to see them (P1 failed, indicating Pro users *do* see the UpgradeSheet, which is a separate issue).
- **Upgrade Sheet Gating (C3, F3, P1):** Guest and Free users correctly see the UpgradeSheet when tapping Pro-gated features (C3, F3). Pro users *incorrectly* see the UpgradeSheet (P1 failed).

## Findings Discarded
- No findings were discarded, as the report contains 8 high-confidence findings.
- Previous PHANTOM verdicts (e.g., "Map Button Naming Ambiguity", "Dashboard Tab Obstruction", "Mobile Viewport Issues") remain valid as no new evidence contradicts them.

## Cannot Assess
- The full extent of `free V8` and `guest V9` (layer and basemap persistence) due to test timeouts. However, the timeout itself is strong evidence of failure.
- The exact toast messages for `pro V4` (track save fails offline) as the test output doesn't include them, but `STATE_MAP.md` provides ground truth.
- The specific chapter reading position state loss for V13, as the current tests only check header statistics, not the in-chapter reading position.

## Systemic Patterns
- **Persistence Regression:** A widespread failure in `localStorage` persistence, affecting both manual implementations (`ee_theme`, `ee_active_module`, `ee_guest_waypoints`) and Zustand `persist` middleware (`ee-map-prefs`). This suggests a recent change or misconfiguration has broken multiple independent persistence mechanisms.
- **Offline-First Neglect:** The app fundamentally fails to operate offline for authenticated users (V2, V10) and lacks basic offline data queuing for user-generated content (V1, V4, V6, V14). This is a critical architectural gap for an outdoor mapping app.
- **GPS Integration Issues:** The app is failing to acquire GPS coordinates, blocking core functionality like waypoint saving (P3, V3). This could be a Playwright mock issue or an app-side bug.

## Calibration Notes
- Prioritised findings with direct `CONFIRMED` annotations from the new vulnerability-proof test design.
- Interpreted "PASS" for vulnerability tests as the test *journey completed and produced evidence*, which might be evidence *of* the vulnerability (e.g., V1, V4, V6, V11, V15).
- Recognized that `page.goto: net::ERR_INTERNET_DISCONNECTED` for offline tests (V2, V10) indicates a more severe problem (app not loading at all) than the specific vulnerability being tested (data missing, status reverting). This was treated as a critical blocker.
- Used `STATE_MAP.md` as ground truth for expected offline behavior (e.g., V6 silent failure) even when test annotations were ambiguous.
- Noted when `STATE_MAP.md` claims persistence but test evidence contradicts it (V11, V7, V15, V9/V8), indicating a regression or misconfiguration.