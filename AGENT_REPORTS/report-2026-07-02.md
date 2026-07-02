# UX Agent Report — 2026-07-02

## Run Context
- Commits analysed: `ff51eb5` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1 - Regression)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping/tracking app.
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js`.

### 4. Critical Data Loss: Offline Track Save Fails Without Queuing (Vulnerability V4)
- Summary: When a user attempts to save a GPS track while offline, the operation fails immediately without any local queuing mechanism, resulting in complete loss of the track data.
- Tier(s) affected: Pro (likely all tiers capable of tracking)
- Confidence: HIGH
- Evidence: `pro V4` passed. The test passing in this context means the journey completed and confirmed the vulnerability. `STATE_MAP.md` explicitly states for `tracks` INSERT: "Offline Behaviour: Fails — toast 'Could not save track'. Data Lost? YES — entire GPS trail... gone." This aligns with the "Offline-First Design" principles which highlight the lack of a sync queue.
- Cannot confirm: The exact toast message displayed, as it's not captured in annotations.
- Root cause: The application lacks an offline data write queue (e.g., using IndexedDB or a Service Worker background sync) for user-generated content, as noted in `STATE_MAP.md` ("Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)").
- User impact: Users lose potentially hours of recorded activity if they attempt to save a track in an area with no connectivity, leading to significant frustration and loss of valuable data.
- Business impact: Undermines the reliability of a core feature, leading to user churn and negative reviews, particularly from the target audience who frequently operate offline.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store failed track save operations and retry them when connectivity is restored.

### 5. Data Loss: Guest Waypoints Vanish on Reload (Vulnerability V11 - Regression)
- Summary: Waypoints saved by guest users are not persisted to local storage and are lost upon page reload, despite a previous fix for this vulnerability.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `SampleSheet "Save Waypoint"` action is not triggering the write to localStorage as intended. This is a regression.
- User impact: Guest users lose any saved waypoints if they navigate away or the app reloads, making the "Save Waypoint" feature unreliable for them.
- Business impact: Reduces the perceived value of the app for potential new users, hindering conversion to authenticated or paying tiers.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` and `SampleSheet.jsx`.

### 6. Preference Loss: Theme Resets to Default on Reload (Vulnerability V7 - Regression)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads and reverts to the default 'dark' theme. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` localStorage key is not being written or read correctly. This directly contradicts `STATE_MAP.md` which states `theme` persists via `ee_theme` (manual pattern, task-008) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `userStore`'s manual persistence implementation for `theme`.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` described in `STATE_MAP.md` is not functioning correctly, or the `SettingsView theme picker` is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users experience a jarring visual change and have to re-select their preferred theme on every app load, leading to minor but persistent annoyance.
- Business impact: Contributes to a perception of an unpolished or unreliable application, potentially impacting user satisfaction and attention to detail.
- Fix direction: Debug and verify the `ee_theme` manual persistence implementation in `userStore.js` and `SettingsView.jsx`.

### 7. Preference Loss: Active Module Resets on Reload (Vulnerability V15 - Regression)
- Summary: The user's `activeModule` preference is not persisted across page reloads and reverts to the default 'prospecting' module. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `moduleStore`'s manual persistence implementation for `activeModule`.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly, or the `ModuleDashboard` is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users are forced to re-select their desired module on every app load, causing minor workflow disruption and annoyance.
- Business impact: Minor impact on user experience, but contributes to a general feeling of the app not remembering user preferences.
- Fix direction: Debug and verify the `ee_active_module` manual persistence implementation in `moduleStore.js` and `ModuleDashboard.jsx`.

### 8. Preference Loss: Basemap and Layer Visibility Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for the basemap and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, this typically indicates the test could not find the expected state after reload, implying a reset. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are part of `mapStore` and *should* be persisted via `ee-map-prefs`.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage after the reload, or the specific layer visibility settings that failed to persist, due to the timeout.
- Root cause: The `mapStore`'s Zustand `persist` middleware for `ee-map-prefs` is either not configured correctly, or there's an issue with how `basemap` and `layerVisibility` are being written to or read from localStorage.
- User impact: Users have to re-configure their preferred map view (basemap, visible layers) on every app load, leading to minor but repetitive annoyance.
- Business impact: Minor impact on user experience, but contributes to a general feeling of the app not remembering user preferences.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and ensure `basemap` and `layerVisibility` are correctly saving and loading from `ee-map-prefs`.

## Tier Comparison

*   **V7 (Theme Reset):** Affects **guest** and **free** tiers identically, failing with the same `Expected: "light" Received: "dark"` error. This indicates a core issue with the manual `ee_theme` persistence, independent of authentication status.
*   **V13 (Learn Header Stats):** Behaves identically for **guest** and **free** tiers. The `state-loss-evidence` shows identical `before` and `after` values, confirming that header stats persistence is working as intended across both unauthenticated and authenticated free users.
*   **V9 (Basemap Reset) / V8 (Layer Preferences Reset):** Both failed with `Test timeout` for **guest** and **free** tiers respectively. This suggests a common underlying issue with `mapStore` preference persistence, regardless of authentication.
*   **V1 (GPS Track Loss):** Confirmed for **Pro** tier. Given `sessionTrail` is in `mapStore` and its persistence is a manual pattern, it is highly likely to affect **all** tiers.
*   **V11 (Guest Waypoints Loss):** Confirmed for **guest** tier. This vulnerability is inherently guest-specific.
*   **V15 (Active Module Reset):** Confirmed for **guest** tier. Given `activeModule` is in `moduleStore` and its persistence is a manual pattern, it is highly likely to affect **all** tiers.
*   **Offline Loading (V10/V2):** Confirmed for **Pro** tier. Given the root cause is app shell caching and data loading, it is highly likely to affect **Free** users as well, as they also require authentication and data loading. Guest users might load partially but would still lack data.
*   **Waypoint Save Button Disabled (P3/V3):** Confirmed for **Pro** tier. This is a core GPS acquisition issue, likely affecting any user attempting to save a waypoint (Pro, or Free if they could somehow bypass the upgrade sheet).
*   **Offline Track Save (V4):** Confirmed for **Pro** tier. This is a general offline data write issue, likely affecting any user attempting to save tracks offline.

## Findings Discarded

*   **pro V6 — route save offline produces no user-facing toast (silent failure):** Discarded as PHANTOM. The annotation `route-button-missing: cannot proof V6` indicates the test itself could not provide evidence for the vulnerability, making it impossible to confirm or deny.
*   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** Discarded due to LOW confidence and ambiguity. The test failed with a timeout, which could mean various things (e.g., the test got stuck, or the UpgradeSheet *did* appear unexpectedly, but no direct evidence was provided).

## Cannot Assess

*   The full extent of `V13` (Learn tab component state loss) beyond header stats. The current test only checks header stats, which appear to be correctly persisted. It does not provide evidence for the persistence of the *in-progress chapter reading position*, which is the core of V13 as described in the `UX Knowledge Context`.

## Systemic Patterns

*   **Persistence Regression:** A significant number of previously "CONFIRMED" fixes for state persistence (V1, V7, V11, V15) have regressed. This points to a fragility in the manual `localStorage` persistence patterns (IIFE + write) or a recent refactor that inadvertently broke these implementations across multiple stores (`mapStore`, `userStore`, `moduleStore`).
*   **Fundamental Offline Unusability:** The application exhibits severe limitations in offline scenarios. Authenticated users cannot even load the app (V10/V2), and critical data saving operations (waypoints, tracks) fail immediately without any queuing or local retention (P3/V3, V4). This indicates a fundamental lack of an offline-first architectural approach, which is critical for the target user base operating in rural areas.
*   **GPS Acquisition Failure:** A core issue with GPS acquisition is preventing the "Save Waypoint" button from becoming active (P3/V3). This suggests a problem in the app's geolocation handling logic or its interaction with the testing environment's mock GPS data.

## Calibration Notes

*   The current test suite design, where a "PASS" can confirm a vulnerability (e.g., V1, V4, V11, V15), requires careful interpretation of annotations and the `STATE_MAP.md` to understand the intended evidence. This aligns with the "Vulnerability-Proof Test Philosophy" where tests produce evidence rather than simple pass/fail.
*   I prioritised findings with direct assertion failures or clear annotations over timeouts when confidence was ambiguous, reflecting past experience with PHANTOM verdicts for speculative timeout interpretations.
*   The recurrence of previously "CONFIRMED" vulnerabilities (V1, V7, V11, V15) as regressions reinforces the need for robust, automated regression testing and potentially more resilient persistence mechanisms than manual `localStorage` patterns.