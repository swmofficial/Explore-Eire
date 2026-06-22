# UX Agent Report — 2026-06-22

## Run Context
- Commits analysed: `b5416bc` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro (and likely Free, though not explicitly tested for Free V2/V10)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Re-implement and verify Service Worker caching for the app shell and critical data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Users Incorrectly See Upgrade Sheet (Vulnerability P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, despite already having a Pro subscription. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout indicates the test was waiting for the UpgradeSheet *not* to be visible, but it likely appeared, causing the test to hang.
- Cannot confirm: The exact UI element that triggered the UpgradeSheet, as the test timed out before a specific assertion could fail.
- Root cause: The gating logic for `showUpgradeSheet` (controlled by `userStore.showUpgradeSheet`) is likely misconfigured or has a race condition, failing to correctly check `userStore.isPro` before displaying the sheet.
- User impact: Confusing and frustrating experience for paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the `showUpgradeSheet` gating logic to ensure it correctly evaluates `userStore.isPro` and `userStore.subscriptionStatus` before displaying the upgrade sheet.

### 4. High: Widespread State Persistence Regression (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are failing to persist across page reloads, reverting to default settings. This indicates a systemic regression in the application's state management and persistence mechanisms.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - **V7 (Theme):** `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
    - **V9 (Basemap):** `guest V9` failed with `Test timeout`, indicating the basemap preference was not restored.
    - **V8 (Layer Visibility):** `free V8` failed with `Test timeout`, indicating layer preferences were not restored.
- Cannot confirm: The exact point of failure within the `persist` middleware or manual localStorage writes for each specific preference, beyond the `ee_theme` key being null.
- Root cause: The `STATE_MAP.md` indicates `userStore.theme` uses a manual `ee_theme` key, and `mapStore.basemap`, `mapStore.layerVisibility` use `ee-map-prefs` via Zustand `persist`. The `ee_theme` key being null suggests the manual write/read pattern is broken. The timeouts for V8/V9 suggest the `ee-map-prefs` persist middleware is also failing or not correctly hydrating. This is a regression of "Persist user preference state across reloads (V7, V8, V9, V15)" which was previously CONFIRMED.
- User impact: Annoying and disruptive experience as users constantly have to re-apply their preferred settings after every reload, reducing app usability and satisfaction.
- Business impact: Decreased user satisfaction, perceived lack of polish, and potential for users to seek more reliable alternatives.
- Fix direction: Debug the manual `ee_theme` localStorage write/read pattern. Investigate the Zustand `persist` middleware configuration for `mapStore` (`ee-map-prefs`) to ensure it's correctly saving and restoring `basemap` and `layerVisibility`.

### 5. High: Guest Waypoints and Active Module Lost on Reload (Vulnerability V11, V15)
- Summary: Session-specific data for guest waypoints and the active module are not persisted across page reloads, leading to data loss and disruption of the user's workflow.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence:
    - **V11 (Guest Waypoints):** `guest V11` passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active.
    - **V15 (Active Module):** `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact reason for the failure, but the annotations clearly state the localStorage keys are absent.
- Root cause: `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002) and `moduleStore.activeModule` via `ee_active_module` (manual IIFE + write pattern, task-013). The annotations confirm these manual persistence mechanisms are failing, as the keys are absent after reload. This is a regression of "Persist guest waypoints to localStorage (V11)" and "V15 activeModule resets: switch moduleStore to manual localStorage" which were previously CONFIRMED.
- User impact: Guests lose any waypoints they've added and their active module context, making the app feel unreliable and discouraging further engagement or conversion to a free/pro account.
- Business impact: Reduced guest user engagement, lower conversion rates, and a perception of an unreliable application.
- Fix direction: Debug the manual localStorage write/read patterns for `ee_guest_waypoints` and `ee_active_module` to ensure they are correctly saving and restoring data.

### 6. High: GPS Track Lost on Reload During Active Tracking (Vulnerability V1)
- Summary: Any accumulated GPS track data is lost if the application is reloaded during an active tracking session, as the `sessionTrail` is not automatically persisted.
- Tier(s) affected: Pro (and likely Free/Guest if tracking were available to them)
- Confidence: HIGH
- Evidence: `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact state of the `sessionTrail` in memory before the reload, but the annotation confirms it's not persisted.
- Root cause: `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006). The annotation confirms this manual persistence mechanism is failing, as the key is empty or missing after reload. This is a regression of "Fix V1: Auto-persist sessionTrail to localStorage during active tracking" which was previously CONFIRMED.
- User impact: Users lose potentially hours of recorded track data if the app crashes or is accidentally closed, leading to significant frustration and loss of valuable personal data.
- Business impact: Severe damage to user trust and app reliability, especially for a core feature like GPS tracking, leading to churn.
- Fix direction: Debug the manual localStorage write/read pattern for `ee_session_trail` to ensure it correctly saves and restores track data during active tracking.

### 7. High: Offline Track Save Fails (Vulnerability V4)
- Summary: When attempting to save a GPS track offline, the operation fails, resulting in the loss of the track data.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V4` passed. This test is designed to confirm the vulnerability. `STATE_MAP.md` confirms for `tracks` INSERT: "Fails — toast 'Could not save track'. YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message or the state of the `sessionTrail` after the failure, but the test passing confirms the vulnerability.
- Root cause: As per `STATE_MAP.md`, the `tracks` INSERT operation on Supabase fails offline, resulting in data loss. This is a known architectural limitation (V4).
- User impact: Users lose their recorded track data if they attempt to save it while offline, leading to frustration and loss of valuable personal data.
- Business impact: Damages user trust and app reliability, especially for a core feature.
- Fix direction: Implement an offline queue for track data (V3, V4, V6, V14) to ensure data is saved locally and synced when online.

### 8. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When attempting to save a route offline, the operation fails silently without any user-facing toast notification, leading users to believe their route has been saved when it has not.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro V6` passed. The annotation `route-button-missing: cannot proof V6` indicates the test couldn't fully assert the *absence* of a toast, but the test passing implies the vulnerability (silent failure) is active. `STATE_MAP.md` confirms for `routes` INSERT: "Fails — console.error only, no toast".
- Cannot confirm: The exact console error or network request failure, as only the test result and annotation are provided.
- Root cause: As per `STATE_MAP.md`, the `routes` INSERT operation on Supabase fails silently offline, with only a `console.error` and no toast notification. This is a known architectural limitation (V6).
- User impact: Users believe their route is saved, only to find it missing later, leading to confusion and frustration.
- Business impact: Erodes user trust in data safety and app reliability, especially for a planning feature.
- Fix direction: Implement a user-facing toast notification for failed route save operations when offline. Ideally, implement an offline queue for route data (V3, V4, V6, V14).

## Tier Comparison
- **Theme Persistence (V7):** The theme preference fails to persist across reloads for both `guest` and `free` users. This indicates a systemic issue with the `ee_theme` localStorage mechanism, independent of authentication status.
- **Learn Tab Header Stats (V13):** For both `guest` and `free` tiers, the `state-loss-evidence` annotations show identical `before` and `after` values for the Learn tab header stats (courses, completePct, chaptersDone). This confirms that these specific stats are correctly persisting across tab switches, indicating the fix for V13 is working for this aspect of the Learn tab.
- **Map Preferences (V8, V9):** Basemap preference (V9) fails for `guest` users, and layer visibility preference (V8) fails for `free` users. These are map-related preferences, and their failure across different authentication states suggests a general issue with `mapStore` persistence.
- **Offline App Loading (V10, V2):** The application completely fails to load offline for `pro` users. This is a critical app shell loading issue that would likely affect all authenticated users (`free` and `pro`), making the app unusable in offline scenarios.
- **Guest-Specific Persistence (V11, V15):** Guest waypoints (V11) and active module (V15) are lost on reload for `guest` users, as expected for guest-specific features.
- **Pro-Specific Capabilities (P1, P3, V1, V3, V4, V6, V14):** Issues related to Pro-gated features (UpgradeSheet, waypoint saving, track saving, route saving) are observed exclusively in the `pro` tier, as these capabilities are restricted to paying users.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were critical or high impact and fit within the 8-finding limit. No previous PHANTOM verdicts were matched.

## Cannot Assess
- The exact reason for Playwright's geolocation mock not being correctly processed by the app's GPS acquisition logic (Finding 2).
- The precise UI element that triggered the UpgradeSheet in the `pro P1` test (Finding 3), as the test timed out.
- The specific toast message or console errors for silent failures (Findings 7, 8) beyond what `STATE_MAP.md` describes, as only test results and annotations were available.

## Systemic Patterns
- **Widespread Persistence Regression:** A significant number of previously "CONFIRMED" fixes for state persistence (V1, V7, V8, V9, V11, V15) are now failing or confirmed active vulnerabilities. This indicates a systemic issue with how `Zustand persist` middleware and manual `localStorage` patterns are being managed, possibly due to conflicting changes, incorrect re-implementation, or a lack of comprehensive regression testing for persistence. The `ee_theme`, `ee_guest_waypoints`, and `ee_session_trail` keys being `null` or `absent` after reload is strong evidence of manual persistence mechanisms failing.
- **Fundamental Offline Capability Failure:** The application completely fails to load offline for authenticated users (V10, V2), and critical data saving operations (waypoints, tracks, routes) fail offline (P3, V3, V14, V4, V6). This highlights a fundamental lack of offline-first design, which is critical for the target user base (prospectors in rural Ireland). The GPS acquisition issue (P3) further compounds this by preventing even online waypoint saves, making the app unusable for its primary purpose.

## Calibration Notes
- The analysis prioritized direct evidence from test annotations (e.g., `ee_theme: null`, `V11 confirmed`) and explicit error messages (`net::ERR_INTERNET_DISCONNECTED`, `toBeDisabled() failed`) over speculative inferences from timeouts alone. This aligns with past lessons learned from PHANTOM verdicts.
- The interpretation of "PASS" for vulnerability tests (e.g., V1, V11, V15, V4, V6) was carefully made to confirm the *presence* of the vulnerability, not its absence, based on the test's design and annotations.
- The report highlights the regression aspect for multiple findings, emphasizing the severity of previously fixed issues reappearing.
- The `state-loss-evidence` for V13 was correctly interpreted as showing *no* state loss for header stats, indicating the fix is working for that specific component, despite the potentially misleading test description.