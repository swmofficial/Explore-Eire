# UX Agent Report — 2026-07-24

## Run Context
- Commits analysed: `ff848cf54497cf4f5fa0307bbf580a88c5cfa123` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online, and provides no offline warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also annotated `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The lack of an offline warning (V14) indicates a missing pre-check for connectivity before attempting a save.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose. Users are not warned about offline save failures.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Implement an explicit offline warning (V14) before attempting data saves.

### 3. High: Widespread Failure of `localStorage` Persistence for User Preferences and Session Data (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences and session data (theme, basemap, layer visibility, guest waypoints, active module, session trail) that are explicitly designed to persist via manual `localStorage` patterns or Zustand `persist` middleware are failing to do so, leading to data and preference loss on reload.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `Expected: "light" Received: "dark"`. This confirms theme resets and `ee_theme` is not being written or read.
    - `guest V9` (basemap) and `free V8` (layer visibility) failed with timeouts, implying persistence failure for `mapStore` fields.
    - `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the IIFE read/write pattern or Zustand `persist` middleware (e.g., `setItem` not being called, `getItem` returning null, or `persist` configuration issues).
- Root cause: A systemic failure in `localStorage` integration. Despite `STATE_MAP.md` detailing manual `IIFE + write` patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, and Zustand `persist` for `ee-map-prefs` (basemap, layerVisibility), the tests show these keys are either `null`, `absent`, or their corresponding state reverts. This indicates either the `setItem` calls are not executing, the `getItem` calls are failing, or the `persist` middleware is misconfigured/broken.
- User impact: Users lose their customisation (theme, map layers) and critical in-progress work (waypoints, tracks, active module) on every page reload, leading to significant frustration and a perception of an unreliable, buggy application.
- Business impact: Damages user trust, increases churn, and reduces engagement with core features that require persistence.
- Fix direction: Thoroughly audit all `localStorage` read/write patterns and Zustand `persist` configurations. Verify `setItem` and `getItem` calls are correctly executed and that `persist` middleware is correctly configured and hydrating state.

### 4. High: Free Users Incorrectly Allowed to Create Waypoints Instead of Being Prompted to Upgrade (F3)
- Summary: When a free user taps the camera button to create a waypoint, the `WaypointSheet` is displayed, allowing them to attempt to save a waypoint, instead of correctly routing them to the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific line of code in the gating logic that incorrectly allows `WaypointSheet` to open for free users.
- Root cause: A bug in the feature gating logic for waypoint creation. Free users should be prevented from accessing Pro features and instead be presented with an upgrade prompt. This likely involves an incorrect conditional check on `userStore.isPro` or `userStore.subscriptionStatus` before rendering the `WaypointSheet` or `UpgradeSheet`.
- User impact: Free users are led down a path where they can attempt to use a Pro feature, only to likely encounter a save failure later (as they cannot save to Supabase). This creates confusion and frustration, as they are not clearly informed about the Pro-gated nature of the feature upfront.
- Business impact: Missed opportunity for conversion from free to Pro tier. Users might abandon the app if they perceive core features as broken, rather than understanding they need to upgrade.
- Fix direction: Correct the conditional rendering logic for the camera button's action, ensuring free users are shown the `UpgradeSheet` when attempting to create a waypoint.

### 5. High: Silent Data Loss for Offline Track and Route Saves (Vulnerability V4, V6)
- Summary: When attempting to save a GPS track or a custom route while offline, the application fails silently or with only a console error, leading to complete data loss without adequate user notification or retry mechanisms.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks/routes)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability: "track save fails offline (post-stop data loss)".
    - `pro V6` passed, confirming the vulnerability: "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms `routes` INSERT "Fails — console.error only, no toast".
- Cannot confirm: The exact toast message (or lack thereof) for track save, as the test passes without specific annotation for the toast. However, the test title explicitly states "data loss" and "fails offline".
- Root cause: Lack of an offline data queue and proper error handling for Supabase write operations. `STATE_MAP.md` explicitly notes: "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". This directly violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable, user-generated content (GPS tracks of their expeditions, carefully planned routes) if they attempt to save while offline, leading to significant frustration and distrust in the app's reliability.
- Business impact: Severe damage to user trust and retention, especially for a core feature like tracking and route planning in potentially remote areas. This directly impacts the app's value proposition.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store failed write operations and retry them when connectivity is restored. Provide clear user feedback (toasts, UI indicators) about offline save status.

### 6. Medium: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1)
- Summary: The `pro P1` test, which is designed to confirm that Pro users *do not* see the UpgradeSheet on Pro affordance tap, timed out. This suggests a potential issue where the UpgradeSheet *might* be appearing for Pro users, or the test is stuck waiting for an element that isn't there.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: Whether the UpgradeSheet actually appeared, or if the test merely timed out due to a selector issue or an unexpected state.
- Root cause: Unclear, but could be related to the `UpgradeSheet`'s display logic or the test's assertion. Given `free F3` failed because the `UpgradeSheet` *didn't* show when it should have, there might be a broader issue with the `UpgradeSheet`'s visibility conditions.
- User impact: Pro users might be confused or annoyed if they are prompted to upgrade for features they already have access to, undermining the value of their subscription.
- Business impact: Erodes trust and perceived value for paying customers, potentially leading to churn.
- Fix direction: Investigate the `UpgradeSheet`'s rendering logic for Pro users and the `pro P1` test's assertions to determine if the sheet is incorrectly displayed or if the test is flawed.

## Tier Comparison

-   **Offline App Load (V2, V10):** Pro tier completely fails to load offline (`ERR_INTERNET_DISCONNECTED`). Free tier is inferred to exhibit similar behavior due to shared authentication and data dependencies. Guest tier is not tested for this specific failure, but would likely load the app shell without user-specific data.
-   **Theme Reset (V7):** Identical behavior across Guest and Free tiers. The theme preference resets to 'dark' on reload, and the `ee_theme` localStorage key is `null` both before and after reload, indicating a complete failure of the manual persistence mechanism.
-   **Basemap and Layer Visibility Reset (V9, V8):** Guest (basemap) and Free (layer visibility) tiers both experience timeouts when attempting to verify persistence of map preferences, implying that the `ee-map-prefs` Zustand persist middleware is failing for both.
-   **Learn Tab State Preservation (V13):** Identical behavior across Guest and Free tiers. The Learn tab successfully preserves its header statistics across tab switches, confirming the fix for V13 is working as intended for all users.
-   **Waypoint Creation Gating (F3, P3):** Free users are incorrectly shown the `WaypointSheet` instead of the `UpgradeSheet` (F3 failure). Pro users cannot save waypoints due to a GPS acquisition failure (P3 failure), which also affects the `pro V3` offline save test. Guest users can create temporary waypoints, but they vanish on reload (V11 confirmed vulnerability). The core issue of *saving* waypoints is broken for all tiers due to GPS, but the *gating* logic for free users is specifically flawed.
-   **Session Waypoints (V11):** Guest tier confirms that session waypoints are memory-only and vanish on reload, despite `STATE_MAP.md` indicating manual persistence via `ee_guest_waypoints`.
-   **Active Module (V15):** Guest tier confirms that the active module resets to 'prospecting' on reload, despite `STATE_MAP.md` indicating manual persistence via `ee_active_module`.
-   **Session Trail (V1):** Pro tier confirms that the GPS track accumulated during a session is lost on reload, despite `STATE_MAP.md` indicating manual persistence via `ee_session_trail`.

## Findings Discarded

-   **PRO Badges Visible to Free Users (F2):** This finding was discarded because it describes intended and correct behavior. The LayerPanel is designed to show PRO badges to free users to highlight premium features and encourage upgrades.
-   **Learn Tab State Preservation (V13) is Working:** This finding was discarded because it describes a successfully implemented fix. The Learn tab correctly preserves its state, and the test passed, indicating the vulnerability V13 is no longer active. The test title and annotation are misleading but the functionality is correct.

## Cannot Assess

-   The exact reason for the `pro P1` timeout (Pro user does not see UpgradeSheet) cannot be definitively assessed without further debugging of the test or the application's UpgradeSheet display logic. It's unclear if the sheet is incorrectly displayed or if the test's assertion is flawed.

## Systemic Patterns

1.  **`localStorage` Persistence Implementation Failure:** There is a critical and widespread discrepancy between the `STATE_MAP.md` (which describes manual `localStorage` patterns and Zustand `persist` middleware for various user preferences and session data) and the actual test results. All manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and Zustand `persist` for `mapStore` (`ee-map-prefs`) are failing to persist data across reloads. This indicates a fundamental issue in how `localStorage` is being integrated and used throughout the application.
2.  **Fundamental Offline Capability Gaps:** The application lacks essential offline-first design principles. This manifests as:
    *   Complete failure to load the application shell for authenticated users when offline (V2, V10).
    *   Absence of an offline data queue for user-generated content (waypoints, tracks, routes), leading to silent data loss (V3, V4, V6, V14).
    *   Missing pre-checks for network connectivity before attempting data saves (V14).
3.  **GPS Acquisition System Malfunction:** The app consistently fails to acquire GPS coordinates, which directly impacts the usability of core features like waypoint creation (P3, V3). This suggests a problem with the `useTracks` hook's `watchPosition` callback or how `mapStore.userLocation` is being updated and consumed.

## Calibration Notes

The analysis prioritised findings with direct, unambiguous evidence from test failures and annotations, especially when they contradicted the `STATE_MAP.md`'s description of intended persistence. Past `PHANTOM` verdicts informed a cautious approach to timeouts (e.g., `pro P1`), leading to a `MEDIUM` confidence score when the exact cause of the timeout (app bug vs. test flaw) could not be pinpointed. Conversely, the consistent failure of `localStorage` persistence across multiple tests and tiers, despite `STATE_MAP.md` claiming implementation, was given `HIGH` confidence due to the overwhelming evidence, aligning with previous `CONFIRMED` verdicts for similar persistence issues. The interpretation of "V[X] confirmed" in a passing test as confirmation of the *vulnerability's existence* (not its fix) was crucial for accurate reporting. The successful resolution of V13 (Learn tab state preservation) was noted as a positive outcome, but not included as a "finding" in the main report as it's not an issue.