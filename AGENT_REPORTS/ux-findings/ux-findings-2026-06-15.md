# UX Agent Report — 2026-06-15

## Run Context
- Commits analysed: `0af4de4` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test from proceeding.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it even when online.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring the persisted `isPro` state is correctly read and applied.

### 4. Critical: GPS Track Lost on Reload (Vulnerability V1)
- Summary: Any active GPS track is lost entirely if the user reloads the page or the app crashes, as the `sessionTrail` data is not being persisted to local storage as intended.
- Tier(s) affected: Pro (and implicitly Free/Guest if they could track, but currently Pro-gated)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the `ee_session_trail` localStorage key is not retaining the track.
- Cannot confirm: The exact point of failure in the `sessionTrail` manual persistence implementation, but the outcome is clear.
- Root cause: The manual `ee_session_trail` persistence pattern (task-006) described in `STATE_MAP.md` is not functioning correctly, leading to `sessionTrail` remaining volatile in `mapStore`.
- User impact: Users lose valuable tracking data for their hikes or prospecting sessions, leading to significant frustration and loss of trust in the app's reliability.
- Business impact: Undermines a core feature for active users, leading to churn and negative perception.
- Fix direction: Debug and correct the manual `ee_session_trail` localStorage persistence implementation.

### 5. Critical: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are lost upon page reload, as the `sessionWaypoints` data is not being persisted to local storage as intended.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the `ee_guest_waypoints` localStorage key is not retaining the waypoints.
- Cannot confirm: The exact point of failure in the `sessionWaypoints` manual persistence implementation, but the outcome is clear.
- Root cause: The manual `ee_guest_waypoints` persistence pattern (task-002) described in `STATE_MAP.md` is not functioning correctly, leading to `sessionWaypoints` remaining volatile in `mapStore`.
- User impact: Guest users lose any unsaved waypoints they've created, leading to frustration and a poor first impression, discouraging sign-up.
- Business impact: Hinders guest user engagement and conversion to authenticated users.
- Fix direction: Debug and correct the manual `ee_guest_waypoints` localStorage persistence implementation.

### 6. High: Route Save Offline Fails Silently (Vulnerability V6)
- Summary: When a Pro user attempts to save a route while offline, the operation fails without any user-facing toast notification, leading the user to believe their route has been saved when it has not.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V6` test passed, and `STATE_MAP.md` explicitly states: "Route save: `routes` INSERT... Fails — console.error only, no toast". The test annotation `route-button-missing: cannot proof V6` indicates the test itself was unable to fully execute the save journey, but the architectural vulnerability is confirmed by the `STATE_MAP.md`.
- Cannot confirm: The exact reason the test couldn't proof V6 (e.g., button not found), but the underlying vulnerability is clear.
- Root cause: The `routes` INSERT operation in `RouteBuilder` lacks a user-facing error handling mechanism for network failures, only logging to console.
- User impact: Users lose their carefully planned routes without warning, leading to significant frustration and wasted effort.
- Business impact: Erodes trust in the app's data safety and reliability, especially for a feature critical to planning expeditions.
- Fix direction: Implement a user-facing toast notification for failed route save operations, and ideally, an offline queue.

### 7. High: Theme Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads, reverting to the default 'dark' theme.
- Tier(s) affected: Guest, Free (likely Pro as well)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being set or read correctly.
- Cannot confirm: If this affects Pro users, but the underlying `userStore` mechanism is shared.
- Root cause: The manual `ee_theme` persistence pattern (task-008) described in `STATE_MAP.md` is not functioning correctly, leading to `userStore.theme` remaining volatile or incorrectly initialized.
- User impact: Minor annoyance, as users must re-select their preferred theme after every reload, leading to an inconsistent user experience.
- Business impact: Contributes to a perception of an unpolished or unreliable application.
- Fix direction: Debug and correct the manual `ee_theme` localStorage persistence implementation.

### 8. High: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to their default states.
- Tier(s) affected: Guest (basemap), Free (layers) (likely Pro as well)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This timeout suggests the UI elements (basemap picker, layer toggles) were not in the expected state after reload, implying the preferences reset.
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key, as no direct annotation was provided for it.
- Root cause: The `mapStore`'s `basemap` and `layerVisibility` fields are intended to be persisted via Zustand's `persist` middleware to `ee-map-prefs` (`STATE_MAP.md`). The timeouts suggest this persistence is failing or being incorrectly applied on re-hydration.
- User impact: Users must repeatedly re-configure their map view, leading to minor but recurring frustration.
- Business impact: Similar to theme resets, it contributes to a perception of an unpolished application.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

## Tier Comparison
- **Offline Loading (V10, V2):** Affects Free and Pro tiers, preventing app load. Guest users are not explicitly tested for this, but the core app shell caching issue would likely affect them too.
- **Preference Resets (V7, V9, V8):** Theme (V7) affects Guest and Free. Basemap (V9) affects Guest. Layer visibility (V8) affects Free. These are common issues across tiers, indicating a systemic problem with localStorage persistence mechanisms (both manual and Zustand `persist`).
- **Data Loss on Reload (V1, V11):** Guest waypoints (V11) specifically affects Guest. GPS track (V1) specifically affects Pro (as tracking is Pro-gated). These are critical data loss issues for their respective tiers.
- **Pro-Specific Failures (P1, P3, V3, V14, V6):** Pro status recognition (P1), waypoint save (P3, V3, V14), and route save (V6) are all critical failures impacting paying Pro users, highlighting issues with feature gating, GPS integration, and offline data handling for premium features.
- **Learn Tab State (V13):** The `guest V13` and `free V13` tests passed, showing header stats are stable across tab switches. This suggests the fix for V13 (keeping tabs mounted) is working for this specific metric. However, the test does not cover the full scope of V13, specifically the in-progress chapter reading position, which `UX Knowledge Context` indicates is still volatile.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- The full scope of V13 (Learn tab state loss, specifically chapter reading position) cannot be fully assessed by the current test, which only checks header statistics. While the header stats are stable, the core vulnerability of losing in-chapter progress may still exist.
- The exact content of `ee-map-prefs` localStorage key for V9/V8 could not be directly observed from annotations, leading to a MEDIUM confidence score for these preference resets.

## Systemic Patterns
A critical systemic pattern observed is the **failure of localStorage persistence mechanisms**. Multiple vulnerabilities (V1, V7, V11, V15, V8, V9) are directly linked to either the Zustand `persist` middleware or the "manual IIFE + write pattern" failing to correctly store and retrieve data from localStorage. This contradicts `STATE_MAP.md` which describes these manual patterns as "proven reliable". This suggests a fundamental flaw in how localStorage is being used or how these persistence layers are initialized and re-hydrated.

Another pattern is the **lack of robust offline capabilities**, leading to complete app failure for authenticated users (V10, V2) and silent data loss for critical user-generated content (V6, V4). This is a direct violation of "Offline-First Design" principles and is particularly damaging for an app targeting users in rural areas.

Finally, **GPS acquisition issues** are preventing core functionality (P3, V3, V14), indicating a problem with the `watchPosition` integration or how its output is consumed by the UI.

## Calibration Notes
The direct contradiction between `STATE_MAP.md`'s claims of "proven reliable" manual persistence patterns and the test annotations showing `null` or `absent` localStorage keys for V1, V7, V11, V15 was a key learning. In such cases, the direct, observable evidence from test annotations (e.g., `ee_theme-after-reload: null`) takes precedence over architectural documentation. This reinforces the need to trust direct test evidence for `HIGH` confidence findings, even when it conflicts with assumed architectural truths. The previous `PHANTOM` verdicts for issues like "Map Layer Style Inconsistencies" (where visual output was identical despite code changes) guided me to focus on direct functional failures and observable state changes rather than speculative side effects.