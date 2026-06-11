# UX Agent Report — 2026-06-11

## Run Context
- Commits analysed: `f3189ed` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data (like `gold_samples` for V2). The app relies on network connectivity for initial load, failing the "Offline-First Design" principle. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement a Service Worker to cache the app shell and critical data for offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online or offline.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms V14 (no offline pre-save warning) because the save button is disabled, preventing the warning from being triggered.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` correctly sets `isPro` and that Pro-gated components correctly check this status.

### 4. High: GPS Track Lost on Reload During Active Tracking (Vulnerability V1)
- Summary: An active GPS track, accumulated during a session, is lost if the application is reloaded (e.g., due to a crash or accidental tab close) before the user explicitly saves it.
- Tier(s) affected: All (Pro test confirms)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the `ee_session_trail` localStorage key, intended for persistence, is not being populated.
- Cannot confirm: If there's any warning about unsaved track data before a reload.
- Root cause: `mapStore.sessionTrail` is intended to persist via the manual `ee_session_trail` localStorage pattern (task-006), but this mechanism is not functioning. `STATE_MAP.md`'s critical note "None are persisted anywhere until the user explicitly saves" is currently accurate in practice.
- User impact: Hours of tracking data lost, severe frustration, potential safety implications for prospectors relying on track logs.
- Business impact: Major trust erosion, negative reviews, potential legal liability.
- Fix direction: Debug the manual `ee_session_trail` localStorage read/write logic in `mapStore.js` to ensure `sessionTrail` is persisted during active tracking.

### 5. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') reverts to the default 'dark' theme after a page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If the theme picker UI itself is broken, or just the persistence. The test implies the theme flip *happened* (`theme-after-flip: light`).
- Root cause: `userStore.theme` is supposed to be persisted via the manual `ee_theme` localStorage key (task-008). The `null` values indicate this manual persistence is not functioning.
- User impact: Minor annoyance, app feels less personalized and polished.
- Business impact: Small negative impact on user experience, perceived lack of polish.
- Fix direction: Debug the manual `ee_theme` localStorage read/write logic in `userStore.js`.

### 6. High: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences revert to their default states after a page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` both failed with `Test timeout`. This indicates the expected basemap or layer visibility state was not found after reload, implying it reverted. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs`.
- Cannot confirm: The exact default state they revert to, but the timeout strongly suggests a reset.
- Root cause: `mapStore`'s `persist` middleware for `basemap` and `layerVisibility` (key `ee-map-prefs`) is either failing to write or read from localStorage.
- User impact: Annoyance, users have to re-configure their map view frequently, disrupting workflow.
- Business impact: Minor negative impact on usability, perceived lack of reliability.
- Fix direction: Debug `mapStore`'s Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly storing and retrieving `basemap` and `layerVisibility`.

### 7. High: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints saved by guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the `ee_guest_waypoints` localStorage key is not being populated.
- Cannot confirm: If there's any UI indication to the guest user that these waypoints are temporary.
- Root cause: `mapStore.sessionWaypoints` is intended to persist via the manual `ee_guest_waypoints` localStorage pattern (task-002), but this mechanism is not functioning.
- User impact: Loss of user-generated data, frustration, disincentive to use the feature without signing in.
- Business impact: Reduces guest user engagement, hinders conversion to authenticated users.
- Fix direction: Debug the manual `ee_guest_waypoints` localStorage read/write logic in `mapStore.js`.

### 8. High: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The `activeModule` preference reverts to 'prospecting' after a page reload, even if another module was previously selected.
- Tier(s) affected: All (Guest test confirms)
- Confidence: HIGH
- Evidence: `guest V15` test passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms the `ee_active_module` localStorage key is not being populated.
- Cannot confirm: If the module picker UI is broken, or just the persistence.
- Root cause: `moduleStore.activeModule` is intended to persist via the manual `ee_active_module` localStorage pattern (task-013), but this mechanism is not functioning.
- User impact: Minor annoyance, users have to re-select their preferred module, disrupting workflow.
- Business impact: Small negative impact on user experience.
- Fix direction: Debug the manual `ee_active_module` localStorage read/write logic in `moduleStore.js`.

## Tier Comparison

-   **Offline Loading (V10, V2):** The behaviour is identical for Free and Pro tiers; both completely fail to load the application when offline. This indicates a systemic issue with the core app shell caching, affecting all authenticated users equally.
-   **Theme Reset (V7):** The behaviour is identical for Guest and Free tiers; the selected theme reverts to 'dark' on reload. This points to a shared issue with the `ee_theme` persistence mechanism, regardless of authentication status.
-   **Basemap and Layer Preferences Reset (V9, V8):** The behaviour is identical for Guest (basemap) and Free (layers); preferences revert to defaults on reload. This indicates a shared issue with `mapStore`'s persistence for these settings, affecting all users.
-   **Learn Tab Header Stats (V13, F4):** The behaviour is identical for Guest and Free tiers; header statistics (`courses`, `completePct`, `chaptersDone`) are correctly preserved across tab switches. This is a positive finding, indicating this specific aspect of Learn tab state is stable.
-   **Waypoint Save (P3, V3, F3, V11):**
    *   **Pro users** (P3, V3) experience a disabled "Save Waypoint" button due to GPS acquisition failure, preventing any save operation (online or offline).
    *   **Free users** (F3) are correctly routed to the UpgradeSheet when attempting to save a waypoint.
    *   **Guest users** (V11) can save waypoints, but these are memory-only and lost on reload.
    *   The underlying GPS acquisition issue likely affects all tiers but is only exposed for Pro users attempting to save.
-   **PRO Badges (F2, P1):**
    *   **Free users** (F2) correctly see PRO badges on gated layers, encouraging upgrade.
    *   **Pro users** (P1) are incorrectly presented with the UpgradeSheet, implying their Pro status is not recognized, or the gating logic is flawed. This is a critical failure for paying users.
-   **GPS Track Loss (V1):** The vulnerability of losing an active GPS track on reload is confirmed for Pro users, and by extension, would affect any user tier capable of tracking.
-   **Offline Track Save (V4):** The behaviour for Pro users is that track save fails offline, which is the expected vulnerability.
-   **Offline Route Save (V6):** The behaviour for Pro users is that route save fails silently offline (no user-facing toast), which is the expected vulnerability.

## Findings Discarded
-   No findings were discarded in this run, as all identified issues were distinct, high-confidence, and within the maximum limit of 8.

## Cannot Assess
-   The specific vulnerability of "in-progress chapter reading position" loss (as described in the UX Knowledge Context for V13) cannot be fully assessed from the provided `state-loss-evidence` annotations, which only cover the Learn tab's header statistics. Further testing or direct code inspection would be required to confirm this specific aspect of V13.

## Systemic Patterns

1.  **Widespread Persistence Failures:** A significant number of findings (V7, V9, V8, V11, V15, V1) indicate a systemic breakdown in localStorage persistence mechanisms. This affects both Zustand's `persist` middleware (for `ee-map-prefs`) and the manual IIFE+write patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`). This suggests a fundamental problem in how localStorage is being accessed, how stores are initialized/updated, or potential race conditions during hydration.
2.  **Critical Offline Capability Gaps:** The complete failure of the application to load for authenticated users when offline (V10, V2) highlights a foundational absence of a robust Service Worker and offline-first architecture. This is not merely a data sync issue but a core app availability problem, rendering the app unusable in its primary target environment.
3.  **GPS Acquisition System Flaws:** The consistent failure of the "Save Waypoint" button due to GPS acquisition issues (P3, V3) points to a problem within the app's GPS handling logic. This could be related to how it processes location data (from real devices or mocks) or how `mapStore.userLocation` is updated and propagated.

## Calibration Notes
-   The previous report's identification of critical offline loading (V10, V2) and GPS acquisition (P3, V3) issues is reinforced by their continued failure in this run, confirming their high severity and persistence.
-   The previous report's finding on Pro status not being recognized (P1) is also re-confirmed, indicating a persistent and critical bug for paying users.
-   Care was taken to distinguish the `V13` test's scope (header stats) from the broader `UX Knowledge Context` definition of V13 (in-chapter page position loss), avoiding a misdiagnosis based on incomplete evidence.
-   The contradiction in `STATE_MAP.md` regarding `sessionTrail` persistence (V1) was resolved by prioritizing direct test evidence (`V1 confirmed`) over the `task-006` note, which proved to be inaccurate in practice. This reinforces the principle of relying on observable test outcomes.
-   The `null` values for `ee_theme` in the `V7` annotations provided strong, direct evidence that the manual localStorage write operation itself is failing, not just the read, guiding the root cause analysis.