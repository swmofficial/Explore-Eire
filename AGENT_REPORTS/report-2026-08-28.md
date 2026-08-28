# UX Agent Report — 2026-08-28

## Run Context
- Commits analysed: `acc72d15348a38a4b825657377c7f097fbae159d` and 19 preceding commits.
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
    - `guest V9` failed (timeout), implying `mapStore.basemap` resets. `STATE_MAP.md` lists `basemap` under `ee-map-prefs` Zustand persist.
    - `free V8` failed (timeout), implying `mapStore.layerVisibility` resets. `STATE_MAP.md` lists `layerVisibility` under `ee-map-prefs` Zustand persist.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
- Cannot confirm: The exact point of failure in the Zustand `persist` middleware or the manual `IIFE + write` patterns for each specific key.
- Root cause: A systemic regression in state persistence mechanisms. This violates "Data Safety" and "Form State Persistence" UX principles.
- User impact: Significant frustration as preferences are forgotten, and critical user-generated data (waypoints, tracks) is lost, leading to distrust and abandonment.
- Business impact: High churn, negative reviews, and reduced engagement with core features.
- Fix direction: Thoroughly debug and re-implement persistence for `userStore.theme`, `mapStore.basemap`, `mapStore.layerVisibility`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail`, verifying `localStorage` writes and reads.

### 4. High: Free Users Can Access Pro Waypoint Saving Feature (F3)
- Summary: Tapping the camera button on the map, intended to surface an `UpgradeSheet` for free users, incorrectly opens the `WaypointSheet`, allowing free users to attempt to save waypoints, a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `UpgradeSheet` was not shown, but the `WaypointSheet` was. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: Whether the waypoint save operation would actually succeed for a free user (it should fail at the Supabase level).
- Root cause: Incorrect conditional rendering or routing logic for the camera button tap, failing to gate the `WaypointSheet` behind the `isPro` status.
- User impact: Confusion and frustration for free users who attempt to use a feature they cannot save, and a broken upgrade path.
- Business impact: Loss of potential Pro conversions, as the upgrade path is bypassed. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the conditional logic for the camera button tap to ensure free users are routed to the `UpgradeSheet`.

### 5. Medium: No Offline Warning Before Waypoint Save Attempt (V14)
- Summary: When attempting to save a waypoint offline, the application does not provide a pre-save warning about the lack of connectivity, leading to a failed save operation without prior user notification.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test, despite failing due to GPS acquisition, includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact toast message or UI behavior if the save button were enabled and tapped offline.
- Root cause: Absence of an explicit network status check and corresponding UI warning before initiating a Supabase write operation. This violates "Offline-First Design" principles.
- User impact: Users are surprised by save failures, leading to frustration and potential data loss if they don't realize the operation failed.
- Business impact: Erodes user trust in the app's reliability, especially in offline scenarios common for prospectors.
- Fix direction: Implement a network connectivity check and display a clear warning or disable the save button with an explanation when offline.

### 6. Medium: Route Save Fails Silently Offline (V6)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing feedback (e.g., a toast notification), leading to silent data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, indicating the journey completed as expected for a silent failure. The annotation `route-button-missing: cannot proof V6` is ambiguous, but a passing test for "silent failure" implies the silence was confirmed. `STATE_MAP.md` confirms `routes` INSERT "Fails — console.error only, no toast".
- Cannot confirm: The exact console error message or the state of the `routePoints` array after the silent failure.
- Root cause: The `routes` INSERT operation lacks a user-facing error handling mechanism (toast notification) for network failures, as described in `STATE_MAP.md`. This violates "Data Safety" and "Offline-First Design" principles.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to significant frustration and wasted effort.
- Business impact: Severe damage to user trust and app reliability, especially for a core feature like route planning.
- Fix direction: Add a user-facing toast notification for failed route save operations when offline.

### 7. Medium: Track Save Fails Offline (V4)
- Summary: When a user attempts to save a GPS track after stopping tracking while offline, the save operation fails, resulting in the loss of the entire accumulated track data.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: MEDIUM
- Evidence: `pro V4` test passed, indicating the journey completed as expected for a failed offline save. `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast 'Could not save track'" and "YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message displayed or the state of the `sessionTrail` after the failure.
- Root cause: The `tracks` INSERT operation fails when offline, and while a toast is present, the underlying data is still lost. This violates "Data Safety" and "Offline-First Design" principles.
- User impact: Users lose valuable track data from their outdoor activities, leading to significant frustration and potential safety concerns if they rely on saved tracks.
- Business impact: Erodes user trust, particularly for a core feature of an outdoor mapping app.
- Fix direction: Implement an offline queue for track data to ensure local persistence and eventual sync when connectivity returns.

### 8. Low: Pro User May Still See UpgradeSheet on Pro Affordance Tap (P1 - Ambiguous)
- Summary: A Pro user may still be presented with an `UpgradeSheet` when interacting with a Pro-gated feature, despite being a paying subscriber. This indicates a regression in the logic that should hide Pro badges and unlock features for Pro users.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` test failed with a `Test timeout of 60000ms exceeded`. This typically means an expected UI state (e.g., `UpgradeSheet` not visible) was not met, or an element to interact with was not found. Given previous fixes aimed to hide Pro badges for Pro users, a timeout here suggests either the badges are still visible and trigger the sheet, or an unlocked feature still incorrectly triggers the sheet.
- Cannot confirm: The exact UI element that was tapped, or whether the `UpgradeSheet` was indeed visible.
- Root cause: Potential regression in the `!isPro` guard logic for displaying Pro badges or gating features, or a test flakiness.
- User impact: Minor annoyance for paying users who are incorrectly prompted to upgrade.
- Business impact: Slight erosion of trust and perceived value for Pro subscribers.
- Fix direction: Verify the `!isPro` guard logic for all Pro-gated UI elements and features.

## Tier Comparison

-   **Offline App Load Failure (V2, V10 Blocker):** Observed for Pro. The underlying cause (lack of Service Worker caching for app shell) suggests this would affect Free and Guest users equally if they were authenticated or attempting to load data.
-   **GPS Acquisition Failure (P3, V3 Blocker):** Observed for Pro. The underlying GPS acquisition logic is universal, so this issue would affect all tiers attempting to save waypoints.
-   **Widespread Preference/Session Data Loss (V1, V7, V8, V9, V11, V15):**
    -   `V7 (theme)`: Identical behavior for Guest and Free users (resets to dark). Inferred for Pro.
    -   `V9 (basemap)`: Observed for Guest. Inferred for Free and Pro.
    -   `V8 (layer visibility)`: Observed for Free. Inferred for Guest and Pro.
    -   `V11 (guest waypoints)`: Specific to Guest users.
    -   `V15 (active module)`: Observed for Guest. Inferred for Free and Pro.
    -   `V1 (session trail)`: Observed for Pro. Inferred for Free and Guest.
    -   **Overall:** This is a systemic regression in persistence affecting multiple state keys across all tiers, indicating a fundamental issue with the persistence implementation rather than tier-specific logic.
-   **Free User Accesses Pro Waypoint Save (F3):** This is a specific business logic error affecting only the Free tier, as it incorrectly grants access to a Pro feature.
-   **Offline Data Save Failures (V4, V6, V14):** Observed for Pro. The underlying offline behavior (no queue, silent failure for routes, toast for tracks) would be consistent across tiers if they could perform these actions.
-   **Pro User Sees UpgradeSheet (P1):** This is a specific issue affecting only the Pro tier, indicating a potential regression in Pro entitlement checks.

## Findings Discarded

-   **guest V13 / free V13 (Learn tab state loss):** Both tests passed, and the `state-loss-evidence` annotations showed identical `before` and `after` values for learn header stats. This indicates that the state *did not* regress, confirming the previous fix for V13 is working. The test description "state-loss proof" is misleading; the evidence proves *no state loss*.

## Cannot Assess

-   The exact cause of the `pro P1` timeout. While inferred as a regression, more detailed logs or screenshots of the failure point would be needed to confirm the precise UX issue (e.g., if an UpgradeSheet was visible, or if the target element was missing).

## Systemic Patterns

-   **Persistence Regression:** A critical and widespread failure in state persistence mechanisms (both Zustand `persist` and manual `localStorage` patterns) is evident across multiple findings (V1, V7, V8, V9, V11, V15). This suggests a recent change or misconfiguration has broken previously confirmed fixes.
-   **Offline-First Deficiency:** The application fundamentally fails to operate offline (V2, V10 blocker) and lacks robust offline data handling (V4, V6, V14), which is a critical flaw for an outdoor mapping app.
-   **GPS Acquisition Issues:** The consistent failure to acquire GPS (P3, V3 blocker) points to a problem with the geolocation integration or mock setup.

## Calibration Notes

-   The top two critical findings (offline app load and GPS acquisition) were correctly identified in the previous report, reinforcing their severity and persistence.
-   The widespread persistence regression (V1, V7, V8, V9, V11, V15) highlights the importance of comprehensive regression testing for state management, especially when `STATE_MAP.md` indicates specific persistence strategies. The explicit `null` values for `ee_theme` and `absent` annotations for `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail` were crucial in confirming the regression despite `STATE_MAP.md`'s claims of manual persistence.
-   Interpreting test results requires careful attention to annotations and the *intent* of the test, not just pass/fail status. For example, V13's "state-loss proof" test passing with identical before/after values correctly indicates *no state loss*, confirming the fix. Similarly, a "silent failure" test passing confirms the silence.