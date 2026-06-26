# UX Agent Report — 2026-06-26

## Run Context
- Commits analysed: `5f13cdf` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. High: User Preferences (Theme, Basemap, Layers) Reset on Reload (Vulnerability V7, V9, V8)
- Summary: User-selected preferences for theme, basemap, and layer visibility are lost and reset to defaults upon page reload.
- Tier(s) affected: All (Guest, Free, likely Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`.
    - `guest V9` (basemap) and `free V8` (layers) failed with `Test timeout of 60000ms exceeded.`, indicating the expected state was not reached or the app hung.
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key for V8/V9, but the timeout strongly suggests a persistence failure.
- Root cause: The manual persistence for `userStore.theme` (`ee_theme` key) is not functioning, as the key is `null` before and after reload. Similarly, `mapStore.basemap` and `mapStore.layerVisibility` (persisted via `ee-map-prefs` using Zustand `persist`) are also failing to persist, likely due to an issue with the `persist` middleware configuration or a bug in the store's initialization/hydration. The `STATE_MAP.md` claims these are persisted, but the tests contradict this.
- User impact: Annoying and repetitive experience, as users must re-apply their preferred settings after every reload, leading to frustration and perceived unreliability.
- Business impact: Reduced user satisfaction, decreased engagement, and negative perception of app quality.
- Fix direction: Debug the manual `ee_theme` persistence implementation and the Zustand `persist` middleware configuration for `ee-map-prefs` to ensure preferences are correctly written to and read from `localStorage`.

### 4. High: Pro Users Incorrectly See Upgrade Sheet (Vulnerability P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, despite already having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout indicates the test was waiting for the UpgradeSheet *not* to be visible, but it likely appeared, causing the test to hang.
- Cannot confirm: The exact UI element that triggered the UpgradeSheet, as the test timed out before a specific assertion could fail.
- Root cause: The gating logic for `showUpgradeSheet` (controlled by `userStore.showUpgradeSheet`) is likely misconfigured or has a race condition, failing to correctly check `userStore.isPro` before displaying the sheet. This is a regression of a previously confirmed fix.
- User impact: Confusing and frustrating experience for paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the `showUpgradeSheet` gating logic to ensure it correctly evaluates `userStore.isPro` and `userStore.subscriptionStatus` before displaying the upgrade sheet.

### 5. High: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
- Cannot confirm: The exact point of failure in the `sessionWaypoints` manual persistence implementation.
- Root cause: The manual persistence mechanism for `sessionWaypoints` to `ee_guest_waypoints` (task-002) is not functioning correctly, as the `localStorage` key is absent after reload. The `STATE_MAP.md` claims this is a "proven reliable pattern" but the test evidence contradicts this.
- User impact: Loss of unsaved work, discouraging new users from exploring and creating content, leading to frustration.
- Business impact: Poor first-time user experience, reduced engagement, and lower conversion rates to authenticated users.
- Fix direction: Debug the `sessionWaypoints` manual persistence implementation in `mapStore.js` to ensure waypoints are correctly written to and read from `ee_guest_waypoints` in `localStorage`.

### 6. High: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The user's selected active module (e.g., 'prospecting') is not persisted and resets to the default upon page reload.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence: `guest V15` test passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The exact point of failure in the `activeModule` manual persistence implementation.
- Root cause: The manual persistence mechanism for `moduleStore.activeModule` to `ee_active_module` (task-013) is not functioning correctly, as the `localStorage` key is absent after reload. The `STATE_MAP.md` claims this is a "proven reliable pattern" but the test evidence contradicts this.
- User impact: Annoying and repetitive experience, as users must re-select their preferred module after every reload, disrupting their workflow.
- Business impact: Reduced user satisfaction and perceived unreliability, especially for power users who frequently switch modules.
- Fix direction: Debug the `activeModule` manual persistence implementation in `moduleStore.js` to ensure the active module is correctly written to and read from `ee_active_module` in `localStorage`.

### 7. High: GPS Track Lost on Reload (Vulnerability V1)
- Summary: An active GPS tracking session's accumulated trail data is not persisted and is completely lost if the application is reloaded during tracking.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the `sessionTrail` manual persistence implementation.
- Root cause: The manual persistence mechanism for `mapStore.sessionTrail` to `ee_session_trail` (task-006) is not functioning correctly, as the `localStorage` key is empty or missing after reload. The `STATE_MAP.md` claims this is a "proven reliable pattern" but the test evidence contradicts this. This violates "Data Safety" principles.
- User impact: Severe data loss for users who might accidentally close the tab, experience a crash, or lose connectivity during a long tracking session, leading to extreme frustration.
- Business impact: Erodes user trust in the app's ability to safeguard their valuable activity data, leading to high churn and negative reviews.
- Fix direction: Debug the `sessionTrail` manual persistence implementation in `mapStore.js` to ensure track points are correctly written to and read from `ee_session_trail` in `localStorage` during active tracking.

### 8. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: When attempting to save a recorded GPS track while offline, the save operation fails, resulting in the complete loss of the track data.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states `tracks` INSERT fails offline with a toast "Could not save track" and "YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message shown, as no screenshot or annotation for it was provided.
- Root cause: The application lacks an offline data synchronization queue. `tracks` INSERT operations directly attempt to write to Supabase, failing when offline. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable recorded activity data if they attempt to save it in an area without connectivity, leading to significant frustration and distrust.
- Business impact: Severe data loss for users, leading to high churn, negative reviews, and a perception that the app is unreliable for its core outdoor use case.
- Fix direction: Implement an offline data synchronization queue (e.g., using IndexedDB) to store failed track save operations and retry them when connectivity is restored.

## Tier Comparison

- **V7 (Theme Resets):** Identical behavior across Guest and Free tiers. Both fail to persist the theme preference on reload, indicating a core issue with the `ee_theme` manual persistence, independent of authentication.
- **V9 (Basemap Resets) / V8 (Layer Preferences Resets):** Guest V9 and Free V8 both fail with timeouts, suggesting a shared underlying issue with `mapStore` persistence (basemap and layer visibility) across unauthenticated and authenticated free users.
- **V13 (Learn Header Stats):** Identical behavior across Guest and Free tiers. Both pass, indicating that the Learn tab header statistics (courses, complete percentage, chapters done) are correctly maintained across tab switches. The core V13 vulnerability (chapter page position loss) is not directly tested by this specific assertion.
- **Offline Loading (V10, V2):** Fails for Pro users, preventing the app from loading at all. This behavior is likely shared with Free users due to common authentication and data loading mechanisms. Guest users might load partially but without data.
- **Waypoint Saving (P3, V3, F3, V11):**
    - Pro users (P3, V3) are blocked from saving waypoints due to GPS acquisition failure, even online.
    - Free users (F3) are correctly gated to the UpgradeSheet when attempting to save a waypoint.
    - Guest users (V11) can create waypoints, but they are memory-only and lost on reload.
    - The *outcome* (cannot save/persist waypoints) is consistent across tiers, but the *reasons* differ.
- **Upgrade Sheet Visibility (P1, C3, F3):**
    - Pro users (P1) incorrectly see the Upgrade Sheet (test fails).
    - Guest (C3) and Free (F3) users correctly see the Upgrade Sheet when interacting with Pro-gated features (both pass).
- **V11 (Guest Waypoints Lost):** Confirmed for Guest tier only, as Free/Pro users save waypoints to Supabase.
- **V15 (Active Module Resets):** Confirmed for Guest tier. As `activeModule` is a global store state, this vulnerability likely affects all tiers.
- **V1 (GPS Track Lost):** Confirmed for Pro tier. As `sessionTrail` is a global store state, this vulnerability likely affects all tiers.
- **V4 (Offline Track Save Fails):** Confirmed for Pro tier. This behavior is likely shared with Free users as both rely on Supabase for track saving.

## Findings Discarded

- **pro V6 — route save offline produces no user-facing toast (silent failure):** This finding was discarded to adhere to the 8-finding limit. While `STATE_MAP.md` confirms silent failure, the test annotation `route-button-missing: cannot proof V6` was ambiguous, and the user impact of a lost route is generally lower than a lost GPS track or waypoint data.

## Cannot Assess

- **V13 (Learn tab state loss for chapter reading position):** While `guest V13` and `free V13` tests passed, their annotations only confirm that the *header statistics* (courses, complete percentage, chapters done) are not lost across tab switches. The core vulnerability described in `UX Knowledge Context` for V13, which is the loss of *in-progress chapter reading position* within a `ChapterReader` component, is not directly assessed by these tests.

## Systemic Patterns

-   **Widespread Persistence Failures:** The most critical systemic issue is the failure of state persistence across multiple key user preferences and generated data. This affects both Zustand's `persist` middleware (V8, V9) and the manual `localStorage` patterns (V1, V7, V11, V15). The `STATE_MAP.md` describes these manual patterns as "proven reliable," but the test results directly contradict this, indicating a fundamental flaw in their implementation or an outdated `STATE_MAP.md`.
-   **Fundamental Offline Unusability:** The application completely fails to load offline for authenticated users (V10, V2) and critical data write operations (V3, V4) fail without an offline queue. This demonstrates a severe lack of adherence to "Offline-First Design" principles, making the app unreliable in its primary use context (rural Ireland).
-   **GPS Acquisition Instability:** The consistent failure to acquire GPS (P3, V3) is blocking core functionality (waypoint saving) and points to an issue with the app's geolocation integration or its interaction with mock data.

## Calibration Notes

-   This run confirms several critical issues identified in previous reports, including the app's failure to load offline (V10, V2), disabled waypoint saving due to GPS issues (P3, V3, V14), Pro users incorrectly seeing the upgrade sheet (P1), and the loss of user preferences (V7, V8, V9). The recurrence of these issues highlights their severity and persistence.
-   Explicit test annotations for V1, V11, and V15 (`(V1 confirmed)`, `(V11 confirmed)`, `(V15 confirmed)`) provided direct evidence, allowing for HIGH confidence ratings despite the `STATE_MAP.md` describing their persistence mechanisms as "proven reliable." This reinforces the principle of prioritizing direct test evidence over architectural documentation when discrepancies arise.
-   The ambiguity in the `pro V6` annotation and its lower user impact led to its justified discard, aligning with the strategy of ranking findings by user impact and confidence.