# UX Agent Report — 2026-09-12

## Run Context
- Commits analysed: `8861d02cfab5ffbb15572bc36b30ae8c3761d88e` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Widespread Persistence Failures for User Preferences (V7, V9, V8 Regression)
- Summary: Multiple user preferences (theme, basemap, and layer visibility) are not persisting across page reloads, despite `STATE_MAP.md` indicating they should be. This represents a significant regression in core state management.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, indicating a failure to assert persistence of basemap and layer visibility, respectively.
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key for V9/V8 due to timeout, but the failure pattern is consistent with persistence loss.
- Root cause: The manual `ee_theme` localStorage persistence is broken. The `ee-map-prefs` Zustand persist middleware for `basemap` and `layerVisibility` is either misconfigured or failing to write/read correctly.
- User impact: Annoying, repetitive setup, loss of customisation, leading to a perception of an unreliable application.
- Business impact: Frustration, reduced user satisfaction, and potential abandonment.
- Fix direction: Debug `ee_theme` manual write/read. Verify `mapStore` Zustand persist configuration for `basemap` and `layerVisibility`.

### 4. High: Session Data Loss on Reload (V1, V11, V15 Regression)
- Summary: Active GPS track, guest waypoints, and the active module are lost on page reload, despite `STATE_MAP.md` indicating they should be persisted via manual localStorage keys.
- Tier(s) affected: All (V1, V15); Guest (V11)
- Confidence: HIGH
- Evidence:
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The exact content of the localStorage keys before reload for V1, V11, V15, but the "absent" or "empty" after reload confirms the loss.
- Root cause: The manual localStorage persistence patterns for `ee_session_trail`, `ee_guest_waypoints`, and `ee_active_module` are not functioning correctly, or the write operations are not being triggered as expected.
- User impact: Loss of unsaved work (e.g., a long GPS track or carefully placed waypoints), leading to significant frustration and the need to re-do actions.
- Business impact: Critical data loss, reduced trust in the application's reliability, and potential user abandonment.
- Fix direction: Debug the manual localStorage write/read logic for `sessionTrail`, `sessionWaypoints`, and `activeModule`.

### 5. High: Free User Can Save Waypoints (F3 Regression)
- Summary: Free users are incorrectly allowed to open the WaypointSheet and attempt to save waypoints, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed `expect(upgradeShown).toBeTruthy()`, `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the upgrade sheet was *not* shown, but the waypoint sheet *was*. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: Whether the save operation would actually succeed for a free user (it should fail due to Supabase RLS, but the UX issue is the prompt).
- Root cause: Incorrect gating logic for the camera button/WaypointSheet based on `userStore.isPro` status. The app is failing to check `isPro` before routing to the WaypointSheet.
- User impact: Frustration when attempting to use a feature only to discover it's gated later in the flow, or if the save operation silently fails. This creates a confusing and misleading user experience.
- Business impact: Missed upgrade opportunities, as users are not clearly directed to the Pro tier. Erodes trust and creates a perception of a buggy application.
- Fix direction: Correct the `isPro` check before opening the WaypointSheet; display the `UpgradeSheet` instead for free users.

### 6. High: Pro User Sees UpgradeSheet (P1 Regression)
- Summary: Pro users are incorrectly shown the UpgradeSheet when tapping a Pro affordance, which should only be visible to Free or Guest users.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This test is designed to verify the *absence* of the UpgradeSheet for Pro users. A timeout strongly suggests the UpgradeSheet *was* present, preventing the test from proceeding as expected.
- Cannot confirm: Direct screenshot evidence of the UpgradeSheet being visible to a Pro user due to the timeout.
- Root cause: Incorrect `userStore.isPro` check for Pro affordances, leading to `userStore.showUpgradeSheet` being set to true even for paying users.
- User impact: Confusing and annoying for paying users to be prompted to upgrade to a service they already have. This undermines their premium experience.
- Business impact: Erodes trust and loyalty with paying customers, potentially leading to churn. Creates a perception of a poorly managed subscription system.
- Fix direction: Correct the `isPro` check for all Pro affordances to ensure the `UpgradeSheet` is only shown to non-Pro users.

### 7. High: Silent Offline Data Write Failures (V4, V6 Confirmed)
- Summary: Saving tracks and routes offline fails silently or with only a console error, leading to data loss without clear user feedback or retry mechanisms.
- Tier(s) affected: Pro (inferred All for data writes)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming that track save fails offline. `STATE_MAP.md` states `tracks` INSERT fails offline with a toast "Could not save track".
    - `pro V6` passed, confirming that route save offline produces no user-facing toast. `STATE_MAP.md` states `routes` INSERT fails offline with `console.error only, no toast`.
    - The `pro V3` test also confirmed `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no pre-save offline warning.
- Cannot confirm: The exact toast message for V4 from the test results, but `STATE_MAP.md` provides this detail.
- Root cause: Lack of an offline data queue and explicit user feedback for failed writes. The app attempts direct Supabase writes without local persistence or a robust retry mechanism.
- User impact: Loss of valuable user-generated data (e.g., recorded tracks, planned routes), leading to significant frustration, distrust, and a feeling of wasted effort.
- Business impact: Critical data loss directly impacts user engagement and retention. Negative word-of-mouth and reduced trust in the application's core functionality.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store pending writes and provide clear, actionable feedback to the user about sync status.

## Tier Comparison

-   **Offline App Load (V2, V10):** The `pro` tier tests failed with a `net::ERR_INTERNET_DISCONNECTED` error on `page.goto`, indicating a fundamental inability to load the application shell when offline. This behaviour is highly likely to be identical across `free` and `guest` tiers, as the core application loading mechanism and initial data fetching (e.g., `gold_samples`) are not tier-specific.
-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** All identified persistence issues (theme, basemap, layer visibility, active module, session trail, guest waypoints) affect all tiers where the respective features are available. This indicates a systemic problem with the underlying persistence mechanisms (Zustand `persist` middleware and manual `localStorage` patterns) rather than tier-specific logic.
-   **GPS Acquisition Failure (P3, V3):** The "Acquiring GPS..." issue preventing waypoint saving was observed in the `pro` tier. This is a core functionality issue that would affect `free` and `guest` users identically if they were able to initiate a waypoint save.
-   **Free User Waypoint Save (F3):** This issue is specific to the `free` tier, where users are incorrectly routed to the WaypointSheet instead of the UpgradeSheet. `Guest` users are correctly routed to the UpgradeSheet (C3 passed), and `pro` users should access the WaypointSheet directly.
-   **Pro User UpgradeSheet (P1):** This issue is specific to the `pro` tier, where paying users are incorrectly shown the UpgradeSheet. `Guest` and `free` users are expected to see the UpgradeSheet for gated features.
-   **Silent Offline Data Write Failures (V4, V6):** These issues were confirmed in the `pro` tier. The underlying data write mechanisms are likely identical across tiers, meaning `free` and `guest` users would experience similar silent failures and data loss if they had access to these features.

## Findings Discarded

-   **V13 — Learn header stats are recomputed on every tab switch (state-loss proof):** This test passed for both `guest` and `free` tiers, with `state-loss-evidence` showing identical header stats (0% complete) before and after tab switching. The test's title implies it should prove state loss, but the evidence shows no change in the *header stats*. The `UX Knowledge Context` describes V13 as the loss of *in-progress chapter reading position*, not header stats. Since a previous fix for V13 ("Preserve Learn tab component state across tab switches") was CONFIRMED, the underlying vulnerability for reading position *should* be resolved. The current test is not effectively proving the specific vulnerability described, nor is it showing a regression of the previous fix. Therefore, it is discarded as an active vulnerability, and the test itself is deemed inadequate for proving V13.

## Cannot Assess

-   No specific limitations preventing assessment were encountered beyond the scope of the provided tests and information.

## Systemic Patterns

The findings reveal a critical breakdown in two core architectural areas:

1.  **Offline Capability (V2, V10, V3, V4, V6):** The application fundamentally fails to load offline for authenticated users, and all data write operations (waypoints, tracks, routes) fail silently or with inadequate feedback when offline. This indicates a complete absence of an offline-first strategy, including comprehensive Service Worker caching for the app shell and data, and a persistent offline data queue. This is a severe systemic failure given the target user base.
2.  **State Persistence (V1, V7, V8, V9, V11, V15):** Multiple critical user preferences (theme, basemap, layer visibility) and session-specific user-generated data (GPS tracks, guest waypoints, active module) are not persisting across page reloads. This points to a widespread regression or misconfiguration of both the Zustand `persist` middleware and the manual `localStorage` patterns that were explicitly implemented for these fields.

## Calibration Notes

The current run confirms the importance of tracing every finding to its architectural root cause, especially when previous fixes were marked `CONFIRMED`. The regression of multiple persistence vulnerabilities (V1, V7, V8, V9, V11, V15) highlights that a `CONFIRMED` status for a fix does not guarantee its long-term stability. The `net::ERR_INTERNET_DISCONNECTED` error for V2/V10 also reinforces that a fix for a *sub-component* of an offline vulnerability (like `isPro` status) is insufficient if the *entire application* cannot load. The `PHANTOM` verdicts from previous runs (e.g., for UI obstructions or visual inconsistencies) continue to guide me to focus strictly on direct evidence from annotations and explicit test failures, avoiding speculative inferences. The ambiguity of the V13 test's "state-loss proof" when the evidence showed no change in stats also taught me to scrutinize test intent versus actual evidence.