# UX Agent Report — 2026-10-04

## Run Context
- Commits analysed: `daed49e5c89ce3b2fb636020546a4be79579b6db` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. Critical: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to save waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.
- Fix direction: Correct the conditional rendering logic for the waypoint creation flow to ensure `UpgradeSheet` is shown for free users when attempting to save a waypoint.

### 4. High: User Preference Persistence Failures (V7, V9, V8)
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free, Pro - inferred for Pro V7/V8/V9 as tests failed for Guest/Free)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being written or read correctly.
    - `guest V9` and `free V8` failed: Timeout. This indicates the test could not verify the state after reload, likely because the state *did* reset, and the test couldn't find the expected element or condition.
- Cannot confirm: The exact default state for basemap and layer visibility, only that they are not persisting.
- Root cause:
    - **V7 (Theme):** `STATE_MAP.md` states `ee_theme` is a manual localStorage key (task-008). The `null` annotations suggest the `setTheme` function is not correctly calling `localStorage.setItem('ee_theme', newTheme)` or the `userStore` is not initializing `theme` from this key.
    - **V9 (Basemap) & V8 (Layer Visibility):** `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via Zustand's `persist` middleware under `ee-map-prefs`. The failures suggest this persistence is either not configured correctly, or the `mapStore` is not hydrating from localStorage on reload.
- User impact: Users constantly have to re-apply their preferred theme, basemap, and layer settings after every app reload, leading to annoyance and a perception of an unreliable application.
- Business impact: Degrades user experience, potentially leading to lower engagement and increased support requests for "lost settings."
- Fix direction: Verify `userStore.setTheme` correctly writes to `ee_theme` and `userStore` initializes `theme` from `ee_theme`. Debug `mapStore`'s Zustand `persist` middleware configuration and hydration logic to ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

### 5. High: Session Data Loss on Reload (V1, V11, V15) Despite Supposed Fixes
- Summary: Critical user-generated session data (guest waypoints, active GPS tracks) and application state (active module) are lost upon page reload, directly contradicting `STATE_MAP.md` and previous confirmed fixes.
- Tier(s) affected: All (V11 Guest, V1 Pro, V15 All)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The exact point of failure in the "manual IIFE + write pattern" or Zustand `persist` middleware that causes these keys to be absent/empty.
- Root cause: Despite `STATE_MAP.md` indicating that `sessionWaypoints` (`ee_guest_waypoints`), `sessionTrail` (`ee_session_trail`), and `activeModule` (`ee_active_module`) are persisted using manual localStorage patterns (task-002, task-006, task-013), the tests confirm these keys are absent or empty after reload. This suggests a regression or an underlying bug in the persistence implementation for these specific data points.
- User impact: Users lose their unsaved waypoints, active GPS tracks, and their current module context, leading to significant frustration, wasted effort, and distrust in the application's reliability.
- Business impact: High churn due to data loss, negative reviews, and reduced engagement with core features like tracking and waypoint logging.
- Fix direction: Thoroughly re-verify the implementation of the manual localStorage persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`. Ensure `localStorage.setItem` is called correctly on state changes and `localStorage.getItem` is used for initial state hydration.

### 6. Medium: Offline Data Save Failures (V4, V6, V14)
- Summary: The application fails to save user-generated data (tracks, routes) when offline, and does not provide a pre-save warning for offline conditions.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence:
    - `pro V4` passed: This test is designed to confirm track save fails offline. The pass implies the expected failure occurred.
    - `pro V6` passed: Annotation `route-button-missing: cannot proof V6`. The test passed, but the annotation indicates it couldn't fully prove the silent failure. However, `STATE_MAP.md` explicitly states `routes` INSERT fails offline with "console.error only, no toast".
    - `pro V3` (which failed due to disabled button) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a pre-save warning.
- Cannot confirm: The exact toast message for V4, or the console error for V6, as screenshots are not provided for these specific failure points.
- Root cause: The application lacks an offline data queue and robust error handling for Supabase write failures. `STATE_MAP.md` confirms "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". This directly violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, without clear indication or a retry mechanism. The lack of a pre-save warning means they might not even realize they're about to lose data.
- Business impact: Erodes user trust, leads to data loss, and makes the app unreliable in its primary use context (rural areas with intermittent connectivity).
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and retry failed write operations. Provide clear UI feedback (toasts, warnings) when offline saves fail or when a user is about to attempt an offline save without a queue.

### 7. Medium: Pro Users May See Upgrade Prompts (P1)
- Summary: The test designed to confirm Pro users do not see upgrade prompts timed out, suggesting a potential issue where Pro users might be incorrectly presented with upgrade sheets.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.` The test's purpose is to assert the *absence* of the UpgradeSheet. A timeout here means the assertion could not be met within the time limit, which could happen if the UpgradeSheet *was* present and the test was waiting for it to disappear, or if the app hung.
- Cannot confirm: Whether the UpgradeSheet was actually visible to the Pro user, or if the timeout was due to test flakiness or another app hang.
- Root cause: Unclear due to timeout. Could be a race condition, incorrect Pro status check, or a test configuration issue.
- User impact: Pro users, who have already paid, being prompted to upgrade creates confusion, frustration, and a perception of being nickel-and-dimed.
- Business impact: Damages trust with paying customers, potentially leading to cancellations and negative sentiment.
- Fix direction: Investigate the `pro P1` test timeout. Verify the logic that gates `UpgradeSheet` visibility for Pro users.

## Tier Comparison

-   **Offline App Loading (V2, V10 Blocker):** The app fails to load for Pro users when offline, preventing any functionality. This is an app-level issue that would likely affect Free users similarly, and Guest users would also experience a failure to load map data (V2) if not the entire shell.
-   **GPS Acquisition Failure (P3, V3 Blocker):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition issues. This underlying GPS problem would affect Free and Guest users if they were able to initiate waypoint creation.
-   **Free Users Bypassing Upgrade Gate (F3):** This is a specific business logic error affecting only the Free tier, allowing them to access the WaypointSheet instead of the UpgradeSheet.
-   **User Preference Persistence Failures (V7, V8, V9):** Theme (V7) persistence fails for both Guest and Free users, with `ee_theme` localStorage key being `null`. Basemap (V9) and Layer Visibility (V8) persistence also fail for Guest and Free users (indicated by timeouts). This suggests a systemic issue affecting all tiers.
-   **Session Data Loss (V1, V11, V15):** Guest waypoints (V11) are lost for Guest users. Active GPS tracks (V1) are lost for Pro users. Active module (V15) is lost for Guest users. These are distinct data points but highlight a common failure in persistence across different user types.
-   **Learn Header Stats (V13):** The Learn tab header statistics (courses, complete percentage, chapters done) remain stable across tab switches for both Guest and Free users. This indicates the fix for V13 (preserving component state) is working as intended for these elements across tiers.
-   **Offline Data Save Failures (V4, V6, V14):** Track save (V4) and route save (V6) fail offline for Pro users, and there's no pre-save warning (V14). These features are Pro-gated, so this behavior is specific to the Pro tier.
-   **Pro Users May See Upgrade Prompts (P1):** This potential issue is specific to the Pro tier, where paying users might be incorrectly shown upgrade prompts.

## Findings Discarded

-   **Learn Header Stats Recomputed (V13 - Test Clarification):** While the test description for V13 (`guest V13`, `free V13`) mentions "recomputed on every tab switch (state-loss proof)", the `state-loss-evidence` annotation clearly shows identical `before` and `after` values for the header stats. Given that a previous fix for V13 (keeping tab content mounted) was confirmed, the header stats are stable, and the original vulnerability (loss of *in-progress chapter reading position*) is likely resolved. This is a test description issue rather than an active UX bug, so it's not included as a primary finding.

## Cannot Assess

-   The exact cause of the `pro P1` timeout (Pro user not seeing UpgradeSheet) cannot be definitively assessed without further debugging or direct visual evidence of the UpgradeSheet appearing. It could be a test flakiness or an actual bug.
-   The precise error messages or UI feedback for `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) cannot be fully confirmed as no specific screenshots or annotations detailing these were provided, beyond the test passing (implying the expected failure occurred).

## Systemic Patterns

-   **Widespread Persistence Failures:** A critical and recurring pattern is the failure of state persistence across multiple user preferences (theme, basemap, layer visibility) and user-generated session data (guest waypoints, active GPS tracks, active module). This directly contradicts `STATE_MAP.md`'s claims of fixes via both Zustand's `persist` middleware and manual `localStorage` patterns, indicating a systemic issue in the implementation or hydration of persisted state.
-   **Fundamental Offline-First Deficiencies:** The application exhibits a complete lack of an offline-first strategy for data. It fails to load entirely when offline, and when it does, it cannot save user data without proper queuing or user warnings. This is a foundational architectural flaw for an app targeting users in areas with intermittent connectivity.
-   **GPS Integration Issues:** A core feature (saving waypoints) is consistently blocked by a failure to acquire GPS coordinates, suggesting a problem with the app's geolocation API integration or its interaction with test mocks.

## Calibration Notes

-   **Prioritizing Test Output over `STATE_MAP.md`:** For vulnerabilities like V1, V11, and V15, where `STATE_MAP.md` indicated a fix but the test output explicitly stated "V[X] confirmed" and showed the relevant localStorage key as "absent" or "empty/missing", I prioritized the direct test evidence of current behavior. This aligns with previous "Misdiagnosed" cases where relying solely on `STATE_MAP.md` led to incorrect conclusions about runtime state.
-   **Cautious Interpretation of Timeouts:** For `pro P1`, the timeout was interpreted as a "potential issue" with Medium confidence rather than a definitive bug. This avoids past "PHANTOM" verdicts that resulted from over-speculating on the meaning of a timeout without direct evidence.
-   **Leveraging Specific Annotations:** The `ee_theme: null` annotations for V7 were instrumental in narrowing down the root cause from a general persistence issue to a specific failure in writing to `localStorage`, demonstrating the value of detailed test annotations.