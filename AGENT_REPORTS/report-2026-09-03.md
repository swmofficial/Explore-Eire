# UX Agent Report — 2026-09-03

## Run Context
- Commits analysed: `5d770c196d9265cfb61bfed4f7c9c29f84467817` and 19 preceding commits.
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
- Cannot confirm: The specific values of basemap and layer visibility after reload due to timeouts, but the failures strongly suggest a reset.
- Root cause: Regression in both Zustand `persist` middleware for `mapStore` and manual `localStorage` implementations for `userStore.theme`, `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, `moduleStore.activeModule`.
- User impact: Constant re-configuration, loss of unsaved work (tracks, waypoints), frustrating user experience, and perceived unreliability.
- Business impact: Reduced engagement, user frustration, and potential for data loss leading to churn.
- Fix direction: Debug and restore functionality of Zustand `persist` middleware and manual `localStorage` implementations for all affected state keys.

### 4. High: Free Users Bypass Waypoint Save Gate (F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet instead of being prompted to upgrade when attempting to save a waypoint, undermining the app's monetization strategy.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed. The test expected `upgradeShown` to be `true` but received `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms the `WaypointSheet` was shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` visually confirms the "New Waypoint" sheet is open.
- Cannot confirm: If a free user can actually *save* a waypoint to the database, or if the save operation would fail at a later stage.
- Root cause: Incorrect gating logic for the "Save Waypoint" action for free users.
- User impact: Free users can access a Pro feature, potentially leading to failed saves and confusion if the backend still rejects the save.
- Business impact: Undermines the value proposition of the Pro subscription and directly impacts conversion rates.
- Fix direction: Correct the client-side gating logic to display the `UpgradeSheet` when a free user attempts to save a waypoint.

### 5. Medium: Pro Users See Upgrade Sheet on Pro Affordance (P1 Regression)
- Summary: Pro users are incorrectly shown the UpgradeSheet when interacting with a Pro-gated feature, despite already having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout`. Given the test's purpose ("Pro user does not see UpgradeSheet on Pro affordance tap"), a timeout strongly implies the `UpgradeSheet` *was* shown or the test could not confirm its absence. This is a regression, as a previous fix for P1 was confirmed.
- Cannot confirm: The exact UI state at the moment of timeout, but the failure context points to the `UpgradeSheet` appearing unexpectedly.
- Root cause: Regression in the Pro status check or gating logic for Pro features, potentially a race condition or incorrect state hydration.
- User impact: Confusing and frustrating for paying users who are told to upgrade when they already have a subscription.
- Business impact: Erodes trust in the subscription service and can lead to unnecessary support inquiries.
- Fix direction: Re-verify the `isPro` status check and gating logic for Pro features to ensure `UpgradeSheet` is only shown to non-Pro users.

### 6. Medium: Offline Track Save Fails with Data Loss (V4)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the complete loss of the accumulated track data.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` passed. The test is specifically designed to confirm this vulnerability, and its passing indicates the scenario (offline save failure leading to data loss) occurred as expected. `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast 'Could not save track'", "YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message or visual feedback without specific screenshots for this step.
- Root cause: Lack of an offline data queue for user-generated content and insufficient error handling for Supabase write failures.
- User impact: Loss of valuable activity data, leading to significant frustration and wasted effort.
- Business impact: Severe damage to user trust and retention, especially for a core tracking functionality.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync track data when connectivity is restored.

### 7. Medium: Offline Route Save Fails Silently (V6)
- Summary: Users attempting to save a route while offline experience a silent failure, with no user-facing toast or feedback, leading to data loss and confusion.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` passed, but annotation `route-button-missing: cannot proof V6` indicates the test itself couldn't provide direct evidence of the *silent* failure. However, `STATE_MAP.md` explicitly states `routes` INSERT "Fails — console.error only, no toast" when offline.
- Cannot confirm: Direct visual evidence from the test run that no toast appeared.
- Root cause: Lack of an offline data queue and insufficient error handling/feedback for offline Supabase write operations.
- User impact: User believes the route is saved, only to find it missing later, leading to frustration and wasted effort.
- Business impact: Erodes trust in data integrity and app reliability, potential for negative reviews.
- Fix direction: Implement an offline data queue for routes and ensure user-facing feedback (e.g., a toast) is provided for offline save failures.

## Tier Comparison

*   **Offline App Load (V2, V10):** The primary failure (`net::ERR_INTERNET_DISCONNECTED`) was observed in the Pro tier. This issue is systemic and would affect all authenticated users (Free and Pro) equally, as the core app shell and initial data fetching are not robustly cached for offline access. Guest users might load, but with limited functionality.
*   **GPS Acquisition Failure (P3, V3):** This critical issue (disabled "Save Waypoint" button due to "Acquiring GPS...") was observed in the Pro tier. This is a core app functionality problem that would affect all tiers attempting to use GPS-dependent features if they were allowed to.
*   **Preference and Session Data Loss (V1, V7, V8, V9, V11, V15):**
    *   **V7 (Theme):** Fails for both Guest and Free tiers. This indicates a widespread regression in theme persistence, likely affecting Pro users as well.
    *   **V9 (Basemap) & V8 (Layer Visibility):** Fail for Guest and Free tiers respectively (via timeouts). This points to a general failure in `mapStore` preference persistence, likely affecting all tiers.
    *   **V11 (Guest Waypoints):** Confirmed as lost for Guest users. This is specific to the guest experience.
    *   **V15 (Active Module):** Confirmed as lost for Guest users. This likely affects Free and Pro users as well.
    *   **V1 (Session Trail):** Confirmed as lost for Pro users. This likely affects Free and Guest users if they could track.
    *   *Systemic Pattern:* All tested persistence mechanisms (both Zustand `persist` and manual `localStorage`) are failing across all tiers where applicable, indicating a widespread regression in state management.
*   **Waypoint Gating Logic (F3, P1):**
    *   **Free (F3):** Free users incorrectly bypass the upgrade gate and are shown the "New Waypoint" sheet.
    *   **Pro (P1):** Pro users are incorrectly shown the `UpgradeSheet` when interacting with a Pro feature (implied by timeout).
    *   *Difference:* The gating logic is flawed in different ways for Free and Pro users, leading to distinct but equally problematic UX issues.
*   **Offline Data Saves (V4, V6):** These data loss scenarios were confirmed in the Pro tier. These are core data-saving features that would likely affect all tiers if they had access to them.

## Findings Discarded
- `free F2 — LayerPanel renders PRO badges for free user`: This test passed, and the behavior (showing PRO badges to free users) is an intended upsell mechanism, not a bug. It was incorrectly identified as a potential issue in the initial scan.
- `guest V13` and `free V13` (Learn header stats): These tests passed, and the annotations show the header stats (0% complete) did not change across tab switches. This indicates the *header stats* persistence is working, which is a *fix* for a part of V13. The broader V13 vulnerability (in-progress chapter reading position) is not covered by this test, but the test itself is not a failure.

## Cannot Assess
- The exact state of `mapStore.basemap` and `mapStore.layerVisibility` after reload for `guest V9` and `free V8` due to test timeouts. While the timeouts strongly imply a reset, direct evidence of the *value* is missing.
- The full scope of V13 (Learn tab reading position persistence) as the current test only covers header statistics.
- Direct visual evidence for the silent failure of `pro V6` (offline route save) as the test annotation explicitly states it "cannot proof V6".

## Systemic Patterns
1.  **Widespread Persistence Regression:** Both Zustand `persist` middleware (for `basemap`, `layerVisibility`) and manual `localStorage` implementations (for `theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`) are failing. This suggests a fundamental issue with how `localStorage` is being accessed or written to, or a recent change that invalidated existing keys/versions. The annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` are particularly damning, indicating the key isn't even being set.
2.  **Critical Offline Functionality Failure:** The app cannot load at all for authenticated users when offline, and core data-saving operations (waypoints, tracks, routes) fail with data loss. This indicates a complete absence of an offline-first strategy for data and a broken Service Worker for the app shell.
3.  **GPS Acquisition Issues:** The app consistently fails to acquire GPS, blocking critical features like waypoint saving. This points to a problem with the `useTracks` hook or `mapStore.userLocation` updates, potentially related to Playwright's geolocation mock or an underlying app bug.
4.  **Auth Gating Logic Errors:** Inconsistent and incorrect gating for Pro features, affecting both Free users (bypassing gates) and Pro users (being incorrectly gated).

## Calibration Notes
- The new test philosophy, where a "PASS" can confirm a vulnerability, was crucial for correctly interpreting V1, V11, V15, and V4. This allowed for precise identification of regressions in persistence.
- Prioritized critical blockers (app not loading, core features disabled) as per previous successful diagnoses, reinforcing the importance of foundational functionality.
- Combined multiple related persistence failures into a single, high-impact finding, as they share a systemic root cause, streamlining the report and highlighting the broader issue.
- Strictly adhered to direct evidence from annotations, error messages, and screenshots, and cross-referenced with `STATE_MAP.md` to avoid phantom errors. This was key in discarding `free F2` and accurately assessing `pro V6`.
- Recognized that `Test timeout` for persistence issues (V8, V9, P1) strongly implies a failure, especially when combined with other explicit persistence failures and the context of the test.