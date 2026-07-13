# UX Agent Report — 2026-07-13

## Run Context
- Commits analysed: `f0c35329f02b01f82144ad63f7bb6f51ffbceb50` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. Critical: Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload across all tiers.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    *   `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    *   `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    *   `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    *   `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `theme`, `sessionTrail`, `sessionWaypoints`, and `activeModule` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable".
- User impact: Loss of user preferences and critical session data (e.g., a recorded GPS track), leading to significant frustration and distrust.
- Business impact: Erodes user trust, increases churn, and devalues core features.
- Fix direction: Thoroughly debug and re-implement the manual `localStorage` read/write patterns for all affected state keys.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and save waypoints, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, indicating the WaypointSheet was shown instead of the UpgradeSheet. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: If the waypoint actually saves to the database for free users, or if it fails silently later.
- Root cause: Incorrect gating logic for the camera button's tap handler, failing to check `isPro` status before routing to the `WaypointSheet` or `UpgradeSheet`.
- User impact: Free users gain access to a premium feature without subscribing.
- Business impact: Direct revenue loss, undermines the subscription model, and devalues the Pro tier.
- Fix direction: Correct the conditional rendering or routing logic for the camera button to display the `UpgradeSheet` for free users.

### 5. High: Layer and Basemap Preferences Reset to Defaults on Reload (Vulnerability V8, V9)
- Summary: User-selected basemap and layer visibility preferences are lost on page reload, reverting to default settings.
- Tier(s) affected: Guest, Free (likely Pro)
- Confidence: HIGH
- Evidence: `guest V9` (basemap) and `free V8` (layer preferences) both failed with `Test timeout of 60000ms exceeded`. This implies the test could not find the expected, non-default state after reload.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload, as no annotations were provided for this key.
- Root cause: The `mapStore`'s `basemap` and `layerVisibility` fields are configured to persist via Zustand's `persist` middleware (key: `ee-map-prefs`), but this mechanism is failing to correctly save or restore these preferences.
- User impact: Users must repeatedly re-configure their preferred map view and layers, leading to frustration and inefficiency.
- Business impact: Degraded user experience, reduced engagement with map customization features.
- Fix direction: Debug the Zustand `persist` middleware configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved to and loaded from `localStorage`.

### 6. Medium: Pro Users Incorrectly See Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: Pro users are shown the "Upgrade to Pro" sheet when interacting with a feature that should be available to them, causing confusion and a degraded experience for paying customers.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. Given the test's purpose ("Pro user does not see UpgradeSheet"), a timeout strongly suggests the UpgradeSheet *was* displayed, preventing the test from proceeding as expected.
- Cannot confirm: The exact content or trigger for the UpgradeSheet, or if it was a transient display.
- Root cause: An incorrect `isPro` check or a race condition in the gating logic for Pro features, leading to the `UpgradeSheet` being shown even when `userStore.isPro` is true.
- User impact: Annoyance and confusion for paying users who are prompted to upgrade for features they already have.
- Business impact: Damages trust with paying customers, potentially leading to churn.
- Fix direction: Review the gating logic for Pro features to ensure `isPro` is correctly evaluated and that the `UpgradeSheet` is never shown to authenticated Pro users.

### 7. Medium: Offline Data Writes Fail Silently or Without Proper User Feedback (Vulnerability V3, V4, V6, V14)
- Summary: User-generated data (waypoints, tracks, routes) cannot be saved when offline, and these failures often occur silently or with insufficient user feedback, leading to data loss.
- Tier(s) affected: Pro (likely Free and Guest for relevant features)
- Confidence: HIGH
- Evidence:
    *   `pro V3` failed (waypoint save fails offline) and annotation `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no pre-save warning.
    *   `pro V4` passed (confirming vulnerability): track save fails offline.
    *   `pro V6` passed (confirming vulnerability): route save offline produces no user-facing toast.
- Cannot confirm: The exact toast messages shown for V3 and V4, or the specific data loss mechanism for each.
- Root cause: Lack of an offline data queue (e.g., using IndexedDB) to store pending write operations and a robust error handling mechanism to inform users and retry sync when connectivity returns. This directly violates "Offline-First Design" and "Data Safety" principles.
- User impact: Loss of valuable user-generated data (waypoints, tracks, routes), leading to significant frustration and distrust in the app's reliability.
- Business impact: Erodes user trust, leads to data loss, and severely impacts the app's utility in its primary use context (rural areas with poor connectivity).
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for all user-generated content, provide clear sync status indicators, and implement auto-retry mechanisms.

### 8. Low: Learn Tab Header Stats Recompute on Tab Switch (Vulnerability V13)
- Summary: The Learn tab's header statistics (Courses, Complete %, Chapters Done) are recomputed (reset to initial state) when switching away from and back to the Learn tab, causing a minor loss of context.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed, with `state-loss-evidence` annotations showing `before` and `after` stats are identical (0% complete). This confirms the vulnerability that state is lost, even if the specific test case started at 0%.
- Cannot confirm: If in-progress chapter reading position is also lost, though this is highly likely given the root cause.
- Root cause: `App.jsx` conditionally renders non-map tabs, causing them to unmount and lose component state, violating "Mobile Navigation State" principles.
- User impact: Minor annoyance, loss of immediate context in the Learn tab, potentially requiring users to re-scroll or re-orient themselves.
- Business impact: Slightly degraded user experience, but not critical for core functionality.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted (e.g., by toggling `display: none`) instead of unmounting them, or lift relevant component state to a persistent store.

## Tier Comparison

*   **Offline App Load (V2, V10):** The Pro tier completely fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). While not explicitly tested for Guest and Free, the systemic root cause (lack of app shell caching) suggests this would affect all tiers.
*   **Waypoint Save Button Disabled (P3, V3):** The Pro tier experiences the "Save Waypoint" button being disabled due to GPS acquisition issues. This is a core functionality problem likely affecting all tiers capable of saving waypoints.
*   **Manual `localStorage` Persistence (V1, V7, V11, V15):** This is a systemic failure affecting *all* tiers. Theme (V7) resets for Guest and Free. Session Waypoints (V11) and Active Module (V15) reset for Guest. GPS Track (V1) is lost for Pro. This indicates a widespread issue with the manual persistence pattern.
*   **Layer and Basemap Preferences Reset (V8, V9):** Basemap (V9) resets for Guest, and layer visibility (V8) resets for Free. This indicates a systemic failure in `mapStore`'s Zustand persist configuration affecting map preferences across tiers.
*   **Learn Tab State Loss (V13):** Confirmed for both Guest and Free tiers, indicating a consistent behavior due to the conditional rendering architecture.
*   **Pro Badges (F2, C3):** Free users correctly see PRO badges in the LayerPanel (`free F2` PASS). Guest users also see them (implied by `guest C3` screenshot showing LayerPanel with PRO badges before upgrade tap). Pro users are *incorrectly* shown the UpgradeSheet (P1 FAIL), suggesting a gating issue.
*   **Upgrade Sheet Routing (F3, C3, P1):**
    *   Guest users correctly see the UpgradeSheet when tapping a Pro-gated feature (`guest C3` PASS).
    *   Free users *incorrectly* see the WaypointSheet instead of the UpgradeSheet when tapping the camera button (`free F3` FAIL).
    *   Pro users *incorrectly* see the UpgradeSheet when tapping a Pro affordance (`pro P1` FAIL/timeout).

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- The exact content of `ee-map-prefs` in `localStorage` for `guest V9` and `free V8` was not annotated, making it harder to pinpoint the exact failure point within the Zustand persist middleware for map preferences.
- The precise reason for the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic (P3, V3) cannot be fully assessed without deeper code inspection or Playwright trace analysis.

## Systemic Patterns
1.  **Widespread Persistence Failures:** Both Zustand `persist` middleware (for `mapStore`'s `basemap` and `layerVisibility`) and the manual `localStorage` patterns (for `theme`, `sessionTrail`, `sessionWaypoints`, `activeModule`) are failing. This indicates a fundamental issue with how `localStorage` is being accessed or how the stores are being initialized/hydrated across reloads.
2.  **Critical Offline Capability Gaps:** The app has severe deficiencies in its offline-first design, ranging from complete failure to load (V2, V10) to silent data loss on write operations (V3, V4, V6, V14). This is a major architectural weakness for an app designed for field use in potentially remote areas.
3.  **Inconsistent Gating Logic:** Errors in feature gating logic affect multiple tiers, leading to free users accessing premium features (F3) and paying users being prompted to upgrade (P1).
4.  **GPS Dependency Issues:** A core dependency (GPS location) is not being reliably acquired, disabling critical features like waypoint saving across tiers.

## Calibration Notes
- The "manual localStorage pattern" was previously described as "proven reliable" in `STATE_MAP.md`. However, current test results (V1, V7, V11, V15) directly contradict this, indicating a regression or a need to re-evaluate the robustness of this pattern. I have prioritized this as a critical systemic issue.
- The `V10` vulnerability has evolved from `isPro` status reverting to a complete app load failure offline. This highlights the importance of re-evaluating vulnerabilities based on current test evidence rather than historical descriptions.
- I have correctly interpreted "passing" a vulnerability test (e.g., V1, V11, V15) as confirmation of the vulnerability, as the test is designed to complete a journey that *exposes* the issue.
- Timeouts (e.g., `pro P1`, `guest V9`, `free V8`) are treated as strong indicators of failure to reach the expected state, especially in "reset" tests where the expected state is the *non-reset* preference. However, I acknowledge that the *exact* visual outcome of a timeout cannot always be fully confirmed without specific screenshots or more detailed annotations.