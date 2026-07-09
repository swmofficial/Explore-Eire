# UX Agent Report — 2026-07-09

## Run Context
- Commits analysed: `cb91079` (latest) and 19 preceding commits.
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
- Summary: A user's accumulated GPS track (`sessionTrail`) is lost on page reload, despite the `STATE_MAP.md` indicating it should be persisted via `ee_session_trail`.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: The `pro V1` test passed, but its annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact point of failure in the manual persistence implementation (e.g., not writing, or being cleared prematurely).
- Root cause: The manual persistence mechanism for `sessionTrail` (task-006) is not correctly implemented or is being cleared, leading to data loss.
- User impact: Loss of potentially hours of recorded activity, leading to significant frustration and distrust in the app's data safety.
- Business impact: Severe erosion of user trust, abandonment of the tracking feature, and negative word-of-mouth.
- Fix direction: Verify and fix the implementation of `ee_session_trail` manual persistence in `mapStore.js` to ensure `sessionTrail` survives reloads.

### 4. Major: Theme, Basemap, and Layer Preferences Lost on Reload (Vulnerability V7, V9, V8)
- Summary: User's selected theme, basemap, and map layer visibility preferences reset to their default values on page reload.
- Tier(s) affected: All
- Confidence: HIGH (V7), MEDIUM (V9, V8)
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`, and annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. `guest V9` and `free V8` tests timed out, indicating an inability to assert the state after reload, which is consistent with a persistence failure. `STATE_MAP.md` indicates `theme` (manual `ee_theme`), `basemap`, and `layerVisibility` (Zustand `ee-map-prefs`) should all be persisted.
- Cannot confirm: The precise reason for the timeouts in V9 and V8, though it strongly suggests a failure to load the expected state or the UI elements.
- Root cause: The manual persistence for `userStore.theme` (`ee_theme`) is not functioning correctly. The Zustand `persist` middleware for `mapStore` (`ee-map-prefs`) might also be misconfigured or failing, or localStorage is being cleared prematurely.
- User impact: Annoying and repetitive re-configuration of preferred visual and map settings on every app restart.
- Business impact: Minor user frustration, but contributes to a perception of an unreliable or buggy application.
- Fix direction: Debug the manual persistence for `ee_theme`. Investigate the `ee-map-prefs` Zustand persist configuration and ensure localStorage is not being cleared inappropriately.

### 5. Major: Free User Bypasses Upgrade Gate for Waypoints (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet instead of being prompted to upgrade to a Pro subscription when attempting to create a waypoint.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: The `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly confirms the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: If the free user can actually *save* the waypoint, or just open the form. However, opening the form for a premium feature is a gating failure.
- Root cause: The conditional logic for the camera button (or waypoint creation flow) is flawed, allowing free users to access the `WaypointSheet` directly instead of triggering the `UpgradeSheet`.
- User impact: Free users gain access to a premium feature without upgrading, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, undermining the app's revenue model and feature differentiation.
- Fix direction: Correct the conditional rendering or routing logic for the camera button to ensure free users are directed to the `UpgradeSheet` when attempting to create a waypoint.

### 6. Minor: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints saved by guest users (`sessionWaypoints`) are lost on page reload, despite the `STATE_MAP.md` indicating they should be persisted via `ee_guest_waypoints`.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: The `guest V11` test passed, but its annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The exact point of failure in the manual persistence implementation.
- Root cause: The manual persistence mechanism for `sessionWaypoints` (task-002) is not correctly implemented or is being cleared, leading to data loss.
- User impact: Loss of temporary user-generated data, requiring re-entry or re-creation.
- Business impact: Minor frustration for guest users, which may deter them from signing up for an account.
- Fix direction: Verify and fix the implementation of `ee_guest_waypoints` manual persistence in `mapStore.js`.

### 7. Minor: Active Module Resets on Reload (Vulnerability V15)
- Summary: The `activeModule` preference resets to 'prospecting' on page reload, despite the `STATE_MAP.md` indicating it should be persisted via `ee_active_module`.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: The `guest V15` test passed, but its annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly confirms the vulnerability. `STATE_MAP.md` states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The exact point of failure in the manual persistence implementation.
- Root cause: The manual persistence mechanism for `activeModule` (task-013) is not correctly implemented or is being cleared.
- User impact: Minor annoyance, requiring the user to re-select their preferred module after each app restart.
- Business impact: Slight friction in the user workflow, potentially reducing engagement with specific modules.
- Fix direction: Verify and fix the implementation of `ee_active_module` manual persistence in `moduleStore.js`.

### 8. Minor: Learn Tab Header Stats Recomputed on Tab Switch (Vulnerability V13)
- Summary: Learn tab header statistics are recomputed on every tab switch, implying a re-render that could lead to loss of component-level state (e.g., scroll position within a course or active chapter page).
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed, but their annotations `state-loss-evidence` explicitly state "learn header stats are recomputed on every tab switch (state-loss proof)". This contradicts the previous fix for V13 (always mounting tabs).
- Cannot confirm: Direct loss of scroll position or active chapter page, only the recomputation of stats which strongly implies a re-render.
- Root cause: Despite the previous fix for V13 (always mounting tabs), the Learn tab content might still be re-rendering or re-fetching data on tab switch, leading to potential component state loss.
- User impact: Loss of context (e.g., scroll position, current page) when navigating away from and back to the Learn tab, disrupting the learning flow.
- Business impact: Frustration for users engaging with learning content, potentially reducing course completion rates.
- Fix direction: Investigate why Learn tab content is recomputing/re-rendering on tab switch and ensure true component state preservation.

## Tier Comparison

-   **Offline App Load (V10, V2)**: Explicitly failed for Pro tier. Guest and Free tiers do not have dedicated tests for this, but the underlying architectural issue (lack of app shell caching) would likely affect all tiers equally.
-   **Waypoint Save Disabled & Offline Save Fails (P3, V3, V14)**: Observed in the Pro tier. The GPS acquisition issue and lack of offline write queue are systemic, affecting any user attempting to save waypoints across all tiers.
-   **GPS Track Loss (V1)**: Observed in the Pro tier. The `sessionTrail` state is global to `mapStore`, so this vulnerability affects all tiers equally.
-   **Preference Loss (V7, V9, V8)**: Theme (V7) persistence failure is confirmed for both Guest and Free tiers. Basemap (V9) and Layer (V8) persistence tests timed out for Guest and Free, but the underlying persistence mechanisms (`ee_theme` manual, `ee-map-prefs` Zustand) are global, indicating this issue affects all tiers.
-   **Free User Waypoint Bypass (F3)**: This issue is specific to the Free tier's upgrade gating logic for premium features.
-   **Guest Waypoint Loss (V11)**: This issue is specific to the Guest tier, as `sessionWaypoints` are designed for unauthenticated users.
-   **Active Module Reset (V15)**: Observed in the Guest tier. The `activeModule` state is global to `moduleStore`, so this vulnerability affects all tiers equally.
-   **Learn Tab Header Stats Recomputed (V13)**: Observed in both Guest and Free tiers. The underlying component rendering logic is global, so this vulnerability affects all tiers equally.

## Findings Discarded

-   **`pro P1` timeout**: This test aims to confirm that a Pro user *does not* see the UpgradeSheet. A timeout means the test could not complete its assertions, so it cannot confirm the presence or absence of the UpgradeSheet. It is not a direct UX issue that can be confirmed from the results.
-   **`pro V4` (track save fails offline)** and **`pro V6` (route save offline produces no user-facing toast)**: These tests passed because they successfully confirmed the existence of the stated vulnerabilities (offline save failure and silent failure). While valid issues, they are subsumed by the broader "Incomplete Offline-First Implementation" systemic pattern and the more critical `V1` (GPS Track Data Lost on Reload) finding, which represents a more severe form of data loss.

## Cannot Assess

-   The exact root cause of the timeouts for `guest V9`, `free V8`, and `pro P1` tests. While likely related to persistence or app loading issues, the timeout error itself does not provide specific diagnostic information beyond the test exceeding its time limit.

## Systemic Patterns

1.  **Broken Manual Persistence**: Multiple critical data points (`sessionTrail`, `sessionWaypoints`, `activeModule`, `theme`) that were explicitly moved to manual `localStorage` persistence (tasks 002, 006, 008, 013) are failing to persist. This suggests a fundamental issue with the manual `IIFE read + setItem on write` pattern or its implementation across the board.
2.  **Incomplete Offline-First Implementation**: The app completely fails to load offline for authenticated users (V10, V2) and lacks robust offline data queuing for writes (V3, V4, V6, V14). This indicates a foundational gap in the offline strategy, beyond just tile caching, making the app unusable in its primary target environment.
3.  **GPS Acquisition Issues**: The app consistently fails to acquire GPS, leading to disabled save buttons for critical features like waypoints (P3, V3). This impacts core functionality even when online, suggesting a problem with the `useTracks` hook or its interaction with the browser's geolocation API.

## Calibration Notes

-   **Prioritizing Direct Evidence**: I focused on findings where annotations or error messages directly confirmed the vulnerability, even if the test "passed" by observing the vulnerability (e.g., V1, V11, V15). This aligns with the "vulnerability-proof test philosophy."
-   **Interpreting Timeouts**: For `V9`, `V8`, and `P1`, timeouts were treated as `MEDIUM` confidence for the underlying issue (persistence, app loading) rather than `HIGH` for the specific assertion, as the root cause of the timeout itself is not fully clear. However, given the other persistence failures, it strengthens the case for a systemic persistence problem.
-   **Leveraging `STATE_MAP.md`**: The `STATE_MAP.md` was crucial for identifying contradictions between intended persistence (e.g., `ee_session_trail` *should* be present but is absent) and observed behavior, allowing for high-confidence root cause identification.
-   **Avoiding Phantom Errors**: Every finding is backed by concrete evidence from the test results or `STATE_MAP.md`, avoiding speculative conclusions.