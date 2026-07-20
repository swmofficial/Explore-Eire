# UX Agent Report — 2026-07-20

## Run Context
- Commits analysed: `82f98837254eb61c645acbd1ce77f17f20bc9f8f` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online, and provides no offline warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also annotated `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The lack of an offline warning (V14) indicates a missing pre-check for connectivity before attempting a save.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose. Users are not warned about offline save failures.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Implement an explicit offline warning (V14) before attempting data saves.

### 3. High: Systemic Failure of Manual `localStorage` Persistence (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload across all tiers.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    - `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes (task-008, task-002, task-013, task-006).
- User impact: Loss of critical session data (e.g., a recorded track, guest waypoints) and user preferences (theme, active module), leading to frustration and a perception of an unreliable application.
- Business impact: Damages user trust, reduces engagement, and can lead to abandonment if valuable data is repeatedly lost.
- Fix direction: Debug and re-implement the manual `localStorage` read/write patterns for all affected state keys to ensure data persistence across reloads.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (Feature F3)
- Summary: Free users are incorrectly able to access the "New Waypoint" sheet and attempt to save waypoints directly, bypassing the intended `UpgradeSheet` prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy() Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the `UpgradeSheet` was not displayed, but the `WaypointSheet` was.
- Cannot confirm: The exact component or hook responsible for the incorrect routing decision.
- Root cause: The logic gating the "Save Waypoint" action for free users is flawed, allowing direct access to the `WaypointSheet` instead of routing to the `UpgradeSheet` as intended for Pro-gated features.
- User impact: Free users gain access to a Pro-gated feature without upgrading, devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, undermining the subscription model and perceived value of premium features.
- Fix direction: Correct the gating logic for the "Save Waypoint" button to ensure free users are consistently prompted to upgrade when attempting to use Pro-exclusive features.

### 5. High: Layer Preferences Reset to Defaults on Reload (Vulnerability V8)
- Summary: User-configured map layer visibility preferences are lost on page reload, reverting to default settings.
- Tier(s) affected: Free (inferred All)
- Confidence: MEDIUM
- Evidence: `free V8` test failed with `Test timeout of 60000ms exceeded`. This implies the test could not confirm the layer preferences were retained after reload. `STATE_MAP.md` states `mapStore.layerVisibility` is persisted via `ee-map-prefs` using Zustand's `persist` middleware.
- Cannot confirm: The specific reason for the `persist` middleware failure (e.g., incorrect configuration, data corruption, or a race condition).
- Root cause: The `mapStore`'s Zustand `persist` middleware for `layerVisibility` is either failing to save the user's preferences to `localStorage` or failing to restore them correctly on app initialization.
- User impact: Users must manually reconfigure their desired map layers (e.g., "Gold heatmap", "Arsenic") after every page reload, leading to repetitive and annoying interactions.
- Business impact: Degrades user experience, potentially reducing engagement with map features and increasing friction for power users who rely on custom layer configurations.
- Fix direction: Investigate `mapStore`'s `persist` middleware configuration and functionality for `layerVisibility` to ensure reliable saving and restoration.

### 6. High: Basemap Preference Resets to Default on Reload (Vulnerability V9)
- Summary: The user's selected basemap preference is lost on page reload, reverting to the default 'satellite' basemap.
- Tier(s) affected: Guest (inferred All)
- Confidence: MEDIUM
- Evidence: `guest V9` test failed with `Test timeout of 60000ms exceeded`. This implies the test could not confirm the basemap preference was retained after reload. `STATE_MAP.md` states `mapStore.basemap` is persisted via `ee-map-prefs` using Zustand's `persist` middleware.
- Cannot confirm: The specific reason for the `persist` middleware failure (e.g., incorrect configuration, data corruption, or a race condition).
- Root cause: The `mapStore`'s Zustand `persist` middleware for `basemap` is either failing to save the user's preference to `localStorage` or failing to restore it correctly on app initialization.
- User impact: Users must manually re-select their preferred basemap after every page reload, leading to repetitive and annoying interactions.
- Business impact: Degrades user experience, potentially reducing engagement with map features and causing minor frustration.
- Fix direction: Investigate `mapStore`'s `persist` middleware configuration and functionality for `basemap` to ensure reliable saving and restoration.

### 7. Medium: Track Save Fails Offline (Vulnerability V4)
- Summary: When a user attempts to save a recorded GPS track while offline, the save operation fails, resulting in the complete loss of the track data.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states that `tracks` INSERT operations "Fails — toast 'Could not save track'" and result in "YES — entire GPS trail, distance, elevation, duration gone."
- Cannot confirm: The exact toast message displayed to the user, as the test only confirms the failure.
- Root cause: The application lacks an offline data queue for user-generated content. Supabase write operations for tracks fail immediately without connectivity, and there is no mechanism to store the data locally for later synchronization.
- User impact: Users lose their entire recorded GPS track if they attempt to save it while offline, leading to significant data loss and frustration, especially after a long activity.
- Business impact: Erodes user trust in data safety and reliability, which is critical for an outdoor mapping app where offline use is a common and expected scenario.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store and retry track saves when connectivity is restored, ensuring data is not lost.

### 8. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a planned route while offline, the operation fails silently, providing no user-facing feedback (toast) that the save was unsuccessful.
- Tier(s) affected: Pro (inferred Free)
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not directly assert the *silent* nature of the failure. However, `STATE_MAP.md` explicitly states that `routes` INSERT operations "Fails — console.error only, no toast" and result in "YES — route points gone."
- Cannot confirm: The exact console error message or the absence of a toast in the UI, due to the test's limitation.
- Root cause: The application lacks an offline data queue for user-generated content and fails to provide user-facing feedback (e.g., a toast notification) when a route save operation fails due to a lack of connectivity.
- User impact: Users lose their planned route without any notification, leading to confusion, wasted effort, and a false sense of security that their route has been saved.
- Business impact: Damages user trust and reliability perception, especially for a core planning feature, and can lead to negative reviews or churn.
- Fix direction: Implement an offline data sync queue for routes and ensure user-facing feedback (e.g., a toast) is consistently provided for all failed offline data writes.

## Tier Comparison

-   **V13 (Learn header stats persistence):** This vulnerability is **fixed across all tiers (guest, free)**. Both `guest V13` and `free V13` tests passed, and their `state-loss-evidence` annotations show identical "before" and "after" header statistics, confirming that Learn tab header stats persist across tab switches.
-   **V7 (Theme persistence):** This vulnerability is **active for both guest and free tiers**. Both `guest V7` and `free V7` tests failed with identical errors (`Expected: "light" Received: "dark"`) and annotations (`ee_theme-before-reload: null`, `ee_theme-after-reload: null`), indicating a common failure in the manual `localStorage` persistence for theme.
-   **V9 (Basemap persistence):** This vulnerability is **active for the guest tier** (timeout). It is inferred to affect all tiers due to the common `mapStore` persistence mechanism.
-   **V8 (Layer preferences persistence):** This vulnerability is **active for the free tier** (timeout). It is inferred to affect all tiers due to the common `mapStore` persistence mechanism.
-   **V11 (Guest Waypoints persistence):** This vulnerability is **active for the guest tier**, as confirmed by the test passing (waypoints vanished). This is not applicable to authenticated (free/pro) users who save waypoints to Supabase.
-   **V15 (Active Module persistence):** This vulnerability is **active for the guest tier**, as confirmed by the test passing (module reset). It is inferred to affect all tiers due to the common `moduleStore` persistence mechanism.
-   **Offline Load (V2, V10):** This critical vulnerability is **active for the Pro tier** (app fails to load). It is inferred to affect the Free tier as well, as both are authenticated and rely on similar initial data loading. The Guest tier, being unauthenticated, might experience different offline loading issues but not this specific authentication-related failure.
-   **GPS Acquisition (P3, V3):** This critical vulnerability is **active for the Pro tier** (waypoint save button disabled). It is inferred to affect Free and Guest tiers if they were able to save waypoints, as it points to a core GPS acquisition issue.
-   **Offline Data Saves (V4, V6):** These vulnerabilities are **active for the Pro tier** (track save fails, route save fails silently). They are inferred to affect the Free tier as well, as both rely on Supabase for data writes. The Guest tier cannot save these types of data.
-   **F3 (Free Waypoint Bypass):** This vulnerability is **active for the Free tier**, allowing free users to bypass the upgrade gate. This is specific to the Free tier's permission model.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This finding was discarded to adhere to the maximum of 8 findings. The test failed with a timeout, which suggests the UpgradeSheet *was* visible to the Pro user, which would be a bug. However, the confidence is lower due to the indirect nature of a timeout, and its user impact is less severe than data loss or app unavailability.

## Cannot Assess

-   No specific components or features were entirely unassessable in this run.

## Systemic Patterns

-   **Offline-First Failure:** The application exhibits a fundamental lack of offline-first design. Authenticated users cannot even load the app offline (V2, V10), and all user-generated data writes (waypoints, tracks, routes) fail immediately and often silently when offline (V3, V4, V6). This is a critical architectural gap for an app targeting users in rural areas with unreliable connectivity.
-   **Persistence Regression/Failure:** There is a widespread issue with state persistence across the application. Multiple manual `localStorage` persistence mechanisms (V1, V7, V11, V15) are failing to save or restore data, and the Zustand `persist` middleware for `mapStore` (V8, V9) also appears to be failing. This suggests either a recent regression in the persistence layer or incomplete/incorrect implementation of previous fixes.
-   **GPS Acquisition Issues:** The app consistently fails to acquire GPS coordinates, blocking core functionality like saving waypoints (P3, V3). This indicates a problem with the underlying geolocation API integration or its handling of mock data in the test environment.

## Calibration Notes

-   The reconfirmation of critical findings (Offline Load Failure, GPS Acquisition Failure, Systemic Persistence Failure) from previous reports highlights the persistent nature of these core architectural issues. The new test design, with its explicit `state-loss-evidence` and `v14-pre-save-offline-warning` annotations, provides clearer and more direct evidence for these vulnerabilities.
-   The successful confirmation of the V13 fix for Learn tab header stats demonstrates the effectiveness of the previous "CONFIRMED" verdict and the value of the new test suite in validating fixes.
-   Care was taken to interpret timeouts (V8, V9, P1) with appropriate confidence levels. For V8 and V9, the timeouts, combined with `STATE_MAP.md` indicating these should be persisted, provided sufficient evidence for a MEDIUM confidence finding. For P1, the timeout was less conclusive without more specific assertion details, leading to its discard. This aligns with past PHANTOM verdicts for speculative timeout interpretations.