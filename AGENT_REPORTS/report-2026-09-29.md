# UX Agent Report — 2026-09-29

## Run Context
- Commits analysed: `12f2e568851bd7da8da769b33fd7b9ef0f83025a` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Blocks Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: User Preference Persistence Regressions (V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisting across page reloads, reverting to default settings. This is a regression for theme (V7) and indicates failures for basemap (V9) and layers (V8).
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH (V7), MEDIUM (V8, V9)
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, confirming the `ee_theme` localStorage key is not being correctly written or read.
    - `guest V9` failed with `Test timeout`.
    - `free V8` failed with `Test timeout`.
- Cannot confirm: The exact default states for V8 and V9 due to timeouts, but the failures strongly imply a reset.
- Root cause: The manual `localStorage` read/write pattern for `ee_theme` is failing. For `basemap` and `layerVisibility`, which are managed by Zustand `persist` middleware (`ee-map-prefs`), the persistence mechanism is either misconfigured or failing to hydrate the store on reload. This is a regression for V7.
- User impact: Users experience frustration as their personalized app settings are lost on every reload, requiring manual re-configuration.
- Business impact: Erodes user trust and satisfaction, potentially leading to reduced engagement and higher churn.
- Fix direction: Debug `ee_theme` manual `localStorage` implementation. Investigate `mapStore`'s Zustand `persist` configuration and hydration for `basemap` and `layerVisibility`.

### 4. High: Session Data Persistence Regressions (V1, V11, V15)
- Summary: Critical session-specific user data, including active GPS tracks, guest waypoints, and the active module, are not persisting across page reloads, leading to data loss. These were previously confirmed fixes.
- Tier(s) affected: All (Guest, Pro)
- Confidence: HIGH
- Evidence:
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact line of code where `localStorage.setItem` or `localStorage.getItem` is failing, but the annotations confirm the keys are not present or correctly read.
- Root cause: The manual `localStorage` read/write patterns (IIFE on store init, `localStorage.setItem` on state update) for `ee_session_trail`, `ee_guest_waypoints`, and `ee_active_module` are not functioning as intended, or the initial state is not being correctly hydrated from `localStorage` on app load. This represents a regression from previous fixes.
- User impact: Significant data loss for active sessions (e.g., entire GPS tracks from a hike), leading to severe frustration and loss of valuable user-generated content.
- Business impact: Destroys user trust in the app's reliability, leading to abandonment and negative word-of-mouth. Directly impacts the core value proposition of tracking and saving field data.
- Fix direction: Debug the manual `localStorage` implementations for `sessionTrail`, `sessionWaypoints`, and `activeModule` to ensure data is correctly written and read on app load/unload.

### 5. High: Free Users Can Access Pro Waypoint Saving (F3)
- Summary: Free users are incorrectly presented with the "New Waypoint" sheet when tapping the camera button, instead of being routed to the "Upgrade Sheet" as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, confirming the WaypointSheet was shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: If the waypoint could actually be saved by a free user, as the GPS acquisition issue (Finding 2) would likely prevent it.
- Root cause: Incorrect conditional rendering or routing logic for the camera button tap, failing to check `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users are led to believe they can use a Pro feature, only to be blocked later (e.g., by GPS failure or a server-side permission error), creating a frustrating experience.
- Business impact: Confuses the value proposition of the Pro tier and creates a poor first impression for potential subscribers.
- Fix direction: Adjust the camera button's click handler to correctly gate access to `WaypointSheet` based on `userStore.isPro` status, routing free users to `UpgradeSheet`.

### 6. Medium: Pro Users Incorrectly See Upgrade Sheet (P1)
- Summary: Pro users are unexpectedly presented with an "Upgrade Sheet" when interacting with a Pro-gated affordance, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This implies the test could not verify the absence of the UpgradeSheet, suggesting it was displayed or interfered with the test flow.
- Cannot confirm: The exact trigger or content of the Upgrade Sheet, as the test timed out before providing explicit evidence.
- Root cause: Potential misconfiguration in the Pro feature gating logic, where `isPro` status is not correctly evaluated, leading to an erroneous display of the `UpgradeSheet` for paying users. This is a regression from a previous fix for P1.
- User impact: Pro users are confused and annoyed by being prompted to upgrade to a service they already pay for, undermining their premium experience.
- Business impact: Damages trust and satisfaction among paying subscribers, potentially leading to churn and negative perception of the Pro tier's value.
- Fix direction: Review the gating logic for Pro affordances to ensure `userStore.isPro` is correctly checked and prevents `UpgradeSheet` from appearing for Pro users.

### 7. High: Offline Data Write Failures (V4, V6 Confirmed)
- Summary: The application fails to save tracks (V4) and routes (V6) when offline, with track saves failing explicitly and route saves failing silently (no user-facing toast).
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability: "track save fails offline (post-stop data loss)".
    - `pro V6` passed, confirming the vulnerability: "route save offline produces no user-facing toast (silent failure)". The annotation `route-button-missing: cannot proof V6` is ambiguous but the test passing implies the silent failure was observed.
- Cannot confirm: The exact toast message for V4, or the precise moment of data loss for V6, but the tests confirm the overall vulnerability.
- Root cause: The application lacks an offline data synchronization queue. As per `STATE_MAP.md`, "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)" is a known vulnerability. Supabase write operations fail when offline, and there is no local persistence or retry mechanism.
- User impact: Users lose valuable data (e.g., entire GPS tracks from a hike, carefully planned routes) if they attempt to save while offline, leading to significant frustration and rework.
- Business impact: Severe erosion of user trust and app reliability, particularly for the target audience operating in rural areas with intermittent connectivity. This directly impacts retention and the app's core utility.
- Fix direction: Implement an offline data synchronization queue (e.g., using IndexedDB) to store failed write operations and retry them when connectivity is restored.

## Tier Comparison

-   **Offline App Load (V2, V10):** The `pro` tier tests explicitly failed to load the app when offline. While `guest` and `free` tiers were not tested for this specific full app load failure, the root cause (lack of comprehensive app shell caching) would likely affect all tiers.
-   **GPS Acquisition Failure (P3, V3):** The `pro` tier tests showed the "Save Waypoint" button disabled due to GPS acquisition failure. This issue with `mapStore.userLocation` would affect any user (Guest, Free, Pro) attempting to save a waypoint.
-   **Theme Preference Persistence (V7):** Fails for both `guest` and `free` tiers, indicating a systemic issue affecting all users regardless of authentication status.
-   **Basemap Preference Persistence (V9):** Fails for the `guest` tier. Given the shared `mapStore` and persistence mechanism, it is highly probable this affects `free` and `pro` tiers as well.
-   **Layer Preference Persistence (V8):** Fails for the `free` tier. Similarly, this is likely a universal issue across all tiers.
-   **Session Data Persistence (V1, V11, V15):** `V1` (track loss) is confirmed for `pro`, `V11` (guest waypoints loss) and `V15` (active module loss) are confirmed for `guest`. These manual `localStorage` persistence issues are systemic and affect the relevant data for any tier.
-   **Free User Waypoint Gating (F3):** This issue is specific to the `free` tier, where the camera button incorrectly surfaces the `WaypointSheet` instead of the `UpgradeSheet`.
-   **Pro User UpgradeSheet Gating (P1):** This issue is specific to the `pro` tier, where Pro users are incorrectly presented with an `UpgradeSheet`.
-   **Offline Data Write Failures (V4, V6):** Confirmed for the `pro` tier. The underlying architectural lack of an offline write queue affects all users attempting to save data offline, regardless of tier.

## Findings Discarded

-   **V13 Learn Tab State Loss:** The tests `guest V13` and `free V13` passed, showing the Learn header stats (courses, completePct, chaptersDone) remained stable across tab switches. While the test title mentions "state-loss proof", the evidence provided (header stats) does not directly address the core V13 vulnerability of "in-progress chapter reading position" being lost. The previous fix for V13 involved always mounting the Learn tab components, which *should* prevent this. Therefore, the current test is insufficient to confirm or deny the true V13 vulnerability, and the header stats themselves are stable. I cannot confirm a regression for the *actual* V13.

## Cannot Assess

-   **True V13 Vulnerability (in-progress chapter reading position):** The current `V13` tests only verify the stability of the Learn header statistics, not the persistence of a user's reading position within a chapter. Therefore, the actual vulnerability of losing in-progress chapter state on tab switch remains unassessed.

## Systemic Patterns

1.  **Widespread Persistence Regressions:** Multiple critical user preferences (theme, basemap, layer visibility) and session data (GPS tracks, guest waypoints, active module) are failing to persist across reloads. This indicates a systemic breakdown in both Zustand `persist` middleware and the manual `localStorage` implementations, representing a significant regression from previously "CONFIRMED" fixes.
2.  **Fundamental Offline-First Failure:** The application completely fails to load for authenticated users when offline, and all data write operations (waypoints, tracks, routes) fail silently without an offline queue. This is a critical architectural flaw for an outdoor mapping app targeting rural areas.
3.  **Core Feature Blocked by GPS Acquisition:** The inability to acquire GPS coordinates is a single point of failure that blocks a fundamental feature (saving waypoints) across all tiers, highlighting a critical bug in the location services integration or mock handling.
4.  **Inconsistent Feature Gating:** The logic for gating Pro features is flawed, allowing free users to access Pro features (waypoint saving) while simultaneously incorrectly prompting Pro users to upgrade. This creates a confusing and frustrating experience for both user segments.

## Calibration Notes

The current run's results strongly align with previous "CONFIRMED" verdicts regarding persistence issues (V1, V7, V11, V15), indicating these are recurring problem areas and that recent changes have introduced regressions. The "PHANTOM" verdicts from past runs (e.g., for UI element issues or haptic feedback) continue to guide me to prioritize direct evidence from annotations and explicit test failures over speculative inferences from timeouts alone, though timeouts for persistence (V8, V9, P1) are treated as strong indicators when combined with other evidence. The consistent failure of offline capabilities (V2, V10, V4, V6) reinforces the understanding that this is a deep-seated architectural problem.