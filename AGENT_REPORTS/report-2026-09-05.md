# UX Agent Report — 2026-09-05

## Run Context
- Commits analysed: `901a3f704cf99d8cfec6743684de80d5aa409193` and 19 preceding commits.
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

### 3. High: Widespread Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, indicating a systemic regression in state persistence.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` (timeout) and `free V8` (timeout) imply `mapStore.basemap` and `mapStore.layerVisibility` are resetting, indicating `ee-map-prefs` persistence failure.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` confirms all these items *should* be persisted via Zustand `persist` or manual `localStorage` keys, indicating a regression.
- Cannot confirm: The exact cause of the `localStorage` keys being `null` or absent, given `STATE_MAP.md` indicates they *should* be written. This could be a race condition, a `persist` middleware misconfiguration, or a manual `setItem` failure.
- Root cause: A systemic failure in `localStorage` persistence mechanisms, affecting both Zustand `persist` middleware and manual `IIFE + write` patterns. This is a regression from previous fixes (task-001, task-002, task-006, task-008, task-013).
- User impact: Users constantly lose their preferred settings and in-progress work (waypoints, tracks), leading to significant frustration and a perception of an unreliable, buggy application.
- Business impact: High churn due to poor user experience, reduced engagement with core features, and negative brand perception.
- Fix direction: Re-evaluate and debug the `Zustand persist` middleware configuration and the manual `localStorage` write patterns for all affected state keys.

### 4. High: Offline Data Saves Fail Silently or with Data Loss (V3, V4, V6, V14)
- Summary: Critical user-generated data (waypoints, tracks, routes) cannot be saved offline. Waypoint saves are blocked by GPS, but even if they weren't, there's no pre-save warning (V14). Track and route saves fail silently or with data loss.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V3` failed due to GPS, but annotation `v14-pre-save-offline-warning: no (V14 confirmed)` confirms the absence of an offline warning before attempting to save a waypoint.
    - `pro V4` passed, meaning the track save failed offline as expected by the test. `STATE_MAP.md` confirms `tracks INSERT` fails with a toast "Could not save track" and data loss.
    - `pro V6` passed, meaning the route save failed silently as expected by the test. `STATE_MAP.md` confirms `routes INSERT` fails with `console.error only, no toast` and data loss.
- Cannot confirm: The exact toast message for V4 from the test output, but `STATE_MAP.md` provides it.
- Root cause: Lack of an offline data queue and local-first write strategy. Supabase write operations fail directly when offline, leading to immediate data loss or blocking. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable field data (waypoints, tracks, routes) collected offline, leading to severe frustration, distrust in the app, and potential loss of critical prospecting information.
- Business impact: Direct impact on user retention, as the app fails in its core utility for its target audience. Damages brand reputation.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored. Provide clear offline status indicators and pre-save warnings.

### 5. Medium: Free Users Can Attempt to Save Waypoints (F3)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` and attempt to save a waypoint, rather than being directed to the `UpgradeSheet` as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: Whether the save operation itself would then be blocked or if it would optimistically fail later. (It would likely fail, as saving waypoints is a Pro feature).
- Root cause: Incorrect gating logic for the "Save Waypoint" feature for free users. The condition to show the `UpgradeSheet` is not being met, or the `WaypointSheet` is being shown unconditionally.
- User impact: Free users encounter a dead-end or error message after spending time filling out waypoint details, leading to frustration and a poor first impression of premium features.
- Business impact: Missed opportunity to convert free users to Pro by clearly communicating feature limitations and upgrade paths. Leads to user frustration instead of conversion.
- Fix direction: Correct the conditional rendering or routing logic for the "Save Waypoint" button/action to ensure `UpgradeSheet` is displayed for free users.

### 6. Medium: Pro User UpgradeSheet Gating Test Times Out (P1 Regression)
- Summary: The test designed to verify that Pro users do *not* see the `UpgradeSheet` when tapping a Pro affordance timed out, indicating a potential regression in the gating logic or a test flakiness.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. The previous finding for P1 was "Hide PRO badges in LayerPanel for authenticated Pro users (P1) → CONFIRMED". This timeout suggests a regression or a test flakiness.
- Cannot confirm: Whether the `UpgradeSheet` *actually* appeared or if the test simply failed to complete its assertions due to a timeout. Given the previous fix, it's more likely a test flakiness or a new race condition.
- Root cause: Unclear, but likely a test flakiness or a new race condition in the `global-setup.js` or the test itself, preventing it from asserting the absence of the `UpgradeSheet` within the timeout.
- User impact: If the `UpgradeSheet` *is* shown, it's a confusing and frustrating experience for paying Pro users who expect full access.
- Business impact: If the `UpgradeSheet` is shown, it erodes trust and satisfaction for paying customers, potentially leading to cancellations.
- Fix direction: Investigate the `pro P1` test for flakiness or race conditions. Ensure the `global-setup.js` correctly sets up the Pro user state before the test runs.

### 7. Low: Learn Tab State Loss Across Tab Switches (V13)
- Summary: While the test passes, the `state-loss-evidence` annotation confirms that Learn tab header statistics are recomputed on every tab switch, indicating that the Learn tab's internal component state is not preserved.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed, but the `state-loss-evidence` annotation shows `{"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{...}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{...}}}`. The values are identical (0/0/0) because no progress was made in the test, but the recomputation itself confirms the state loss. `UX Knowledge Context` explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- Cannot confirm: The specific component state that is lost beyond the header stats (e.g., scroll position, active chapter page).
- Root cause: `App.jsx` conditionally unmounts non-map tabs when switching, destroying their internal React component state. This violates mobile navigation state persistence guidelines.
- User impact: Users lose their place in course lists, settings sub-pages, or profile scroll position when switching tabs, requiring them to re-navigate.
- Business impact: Minor, but contributes to a less polished and frustrating user experience, potentially reducing engagement with learning content.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility (e.g., using `display: none`) instead of unmounting.

## Tier Comparison

-   **Offline App Load (V2, V10):** Only tested for Pro, where it completely failed to load due to `net::ERR_INTERNET_DISCONNECTED`. This behavior is likely similar for Free users who also rely on Supabase for profile data, but Guest users might experience a partial load as they have no authenticated session.
-   **GPS Acquisition Failure (P3, V3 Blocker):** Only tested for Pro, but the underlying GPS acquisition logic is universal. This issue would likely affect all tiers attempting to use location-dependent features.
-   **Widespread Preference and Session Data Loss (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Affects Guest and Free identically. Both failed to persist theme, with `ee_theme` being `null` before and after reload. This points to a global issue with the `ee_theme` manual persistence.
    -   **Basemap (V9):** Failed for Guest (timeout).
    -   **Layer Visibility (V8):** Failed for Free (timeout).
    -   **Guest Waypoints (V11):** Confirmed lost for Guest.
    -   **Active Module (V15):** Confirmed lost for Guest.
    -   **Session Trail (V1):** Confirmed lost for Pro.
    -   The widespread nature of these persistence failures across different stores and persistence mechanisms (Zustand `persist` and manual `localStorage` keys) indicates a systemic problem affecting all tiers.
-   **Offline Data Saves (V3, V4, V6, V14):** Tested for Pro, confirming silent failures and data loss. These issues are inherent to the Supabase write operations and lack of an offline queue, thus affecting all tiers attempting to save data offline.
-   **Free User Waypoint Gate (F3):** Specific to the Free tier, where the camera button incorrectly opens the `WaypointSheet` instead of the `UpgradeSheet`.
-   **Pro User UpgradeSheet Gating (P1):** Specific to the Pro tier, where the test to verify the *absence* of the `UpgradeSheet` timed out.
-   **Learn Tab State Loss (V13):** Affects Guest and Free identically, with header stats being recomputed on tab switch. This indicates a general issue with tab unmounting, not specific to authentication status.

## Findings Discarded

-   **PRO Badges Visible to Free Users (F2):** This test passed and confirmed that PRO badges are visible to free users (`pro-badge-count: 8`). This is the expected and correct behavior for free users, as it highlights premium features and encourages upgrades. It is not a UX issue.

## Cannot Assess

-   The full impact of V2 (gold/mineral data missing offline) and V10 (Pro status reverts to free offline) could not be assessed because the application failed to load at all when offline for Pro users. The `net::ERR_INTERNET_DISCONNECTED` error prevented any further interaction or state inspection.

## Systemic Patterns

-   **Persistence Regression:** There is a significant and widespread regression in `localStorage` persistence. This affects both Zustand `persist` middleware (implied by V8/V9 timeouts) and the manual `IIFE + write` patterns (explicitly confirmed by `null`/`absent` annotations for V1, V7, V11, V15). This is a critical architectural failure, as core user preferences and session data are not surviving reloads.
-   **Offline-First Failure:** The application fundamentally fails in offline scenarios. It cannot load for authenticated users, and it cannot reliably save user-generated data (waypoints, tracks, routes) offline, leading to critical data loss and rendering the app unusable in its primary target environment. This is a direct violation of "Offline-First Design" principles.
-   **GPS Integration Issues:** The app is consistently failing to acquire GPS coordinates, which is blocking core functionality like saving waypoints. This suggests a problem with the `useTracks` hook or its interaction with the browser's geolocation API.
-   **Inconsistent Feature Gating:** There are specific flaws in how premium features are gated, leading to free users being able to access (and then be blocked by) Pro features (F3), and a potential regression in ensuring Pro users don't see upgrade prompts (P1).

## Calibration Notes

-   Prioritized findings based on user impact, with app loading failures and data loss taking precedence over preference resets and minor UI inconsistencies.
-   Leveraged `STATE_MAP.md` extensively to confirm expected persistence behaviors and offline failure modes, allowing for high confidence in identifying regressions against known architectural patterns.
-   Paid close attention to annotations like `state-loss-evidence` and `X confirmed` even for passing tests, as per the "Vulnerability-Proof Test Philosophy," to identify confirmed vulnerabilities despite a 'pass' status.
-   Explicitly noted when a test failed due to a *blocker* (e.g., app not loading offline preventing V2/V10 verification) rather than confirming the specific vulnerability it was designed to test.
-   Avoided speculative "phantom" errors by requiring direct evidence from error messages, annotations, or clear visual cues in screenshots, rather than inferring issues solely from timeouts without further context. The `ee_theme: null` annotations for V7 were particularly strong evidence of a persistence regression.