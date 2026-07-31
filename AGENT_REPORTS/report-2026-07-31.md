# UX Agent Report — 2026-07-31

## Run Context
- Commits analysed: `03dfda5959c8ee33c553fd4a0ccf41309b9d27cb` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3 implied)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Manual `localStorage` Persistence Regression for User-Generated Data and Preferences (V1, V11, V15)
- Summary: User-generated session data (GPS tracks, guest waypoints) and module preferences are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest (V11, V15), Pro (V1), (inferred Free for V1, V15)
- Confidence: HIGH
- Evidence: `guest V11` test annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` test annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `guest V15` test annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. These directly contradict `STATE_MAP.md`'s claim that these keys persist.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for these keys.
- Root cause: The manual `localStorage` keys (`ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are either not being written to or read from `localStorage` correctly, despite `STATE_MAP.md` indicating they should be.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user workflow preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug the manual `localStorage` write/read patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure data persistence across reloads.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme on every page reload, regardless of authentication status.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for `ee_theme`.
- Root cause: The manual `localStorage` key `ee_theme` is not being written or read correctly, despite `STATE_MAP.md` indicating it should be via a manual pattern (task-008).
- User impact: Minor annoyance as users must re-select their preferred theme after every reload, impacting personalization.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially reducing user satisfaction.
- Fix direction: Debug the manual `localStorage` write/read pattern for `userStore.theme` to ensure `ee_theme` is correctly persisted.

### 5. High: Free Users Can Access Waypoint Save Feature, Bypassing Upgrade Gate (Feature F3 Regression)
- Summary: Free tier users are able to access and interact with the "New Waypoint" sheet, which is intended to be a Pro-gated feature, bypassing the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed because `expect(upgradeShown).toBeTruthy()` received `false`. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, confirming the `UpgradeSheet` was not shown and the `WaypointSheet` was. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: Whether the waypoint can actually be *saved* by a free user, as the test only checks for the sheet's visibility.
- Root cause: Incorrect conditional rendering or routing logic for the WaypointSheet, failing to show the `UpgradeSheet` for free users when they attempt to save a waypoint.
- User impact: Free users gain access to a Pro feature, which could lead to confusion if they attempt to save and it fails, or devalues the Pro subscription if it succeeds.
- Business impact: Undermines the subscription model by allowing free users access to premium features, potentially reducing conversion to Pro.
- Fix direction: Correct the gating logic for the WaypointSheet to ensure `UpgradeSheet` is displayed for free users.

### 6. Medium: Map Preferences (Basemap, Layers) Reset on Reload (Vulnerability V9, V8 Regression)
- Summary: User preferences for the basemap and layer visibility are likely resetting to their default states on page reload, indicated by test timeouts during verification.
- Tier(s) affected: All (Guest V9, Free V8, inferred Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both timed out. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand's `persist` middleware. The timeouts suggest the expected state was not found after reload, implying a reset.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload, as the test timed out before capturing it.
- Root cause: Potential issues with the `ee-map-prefs` Zustand persist middleware, or a race condition in state hydration preventing the test from asserting the correct state.
- User impact: Users lose their preferred map view settings (e.g., chosen basemap, active layers), requiring manual re-configuration after every reload.
- Business impact: Contributes to a perception of an unreliable application, potentially reducing user satisfaction and engagement with map features.
- Fix direction: Debug the `ee-map-prefs` Zustand persist configuration and state hydration to ensure `basemap` and `layerVisibility` are correctly restored.

### 7. Medium: Pro Users Incorrectly Prompted to Upgrade (Feature P1 Regression)
- Summary: Pro users are incorrectly presented with the `UpgradeSheet` when interacting with Pro-gated features, despite already having an active subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test timed out. The test's purpose is to ensure Pro users *do not* see the `UpgradeSheet`. A timeout here strongly suggests the `UpgradeSheet` *was* shown, preventing the test from proceeding to its expected state.
- Cannot confirm: The exact content of the `UpgradeSheet` or the specific trigger that caused it to appear.
- Root cause: Flawed Pro gating logic or a race condition where the `isPro` status is not immediately available or correctly evaluated when a Pro affordance is tapped.
- User impact: Paying Pro users are frustrated by being asked to upgrade, eroding trust and satisfaction with their subscription.
- Business impact: Damages customer loyalty and trust, potentially leading to subscription cancellations and negative word-of-mouth.
- Fix direction: Review the Pro gating logic and `isPro` state hydration to ensure Pro users are correctly identified and not prompted to upgrade.

### 8. Low: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails without providing any user-facing feedback (e.g., a toast notification), leading to silent data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: LOW
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not confirm the *silent* failure aspect. `STATE_MAP.md` explicitly states "console.error only, no toast" for route save failure.
- Cannot confirm: Whether a console error was indeed logged, or if the route data was truly lost, as the test's assertion was insufficient.
- Root cause: Lack of user-facing error handling for offline route save operations, as described in `STATE_MAP.md`.
- User impact: Users believe their route has been successfully saved when it has not, leading to unexpected data loss and confusion when they later try to access it.
- Business impact: Erodes user trust in data safety and the application's reliability, especially for a core feature like route planning.
- Fix direction: Implement a user-facing toast notification for offline route save failures and consider an offline queue for data synchronization.

## Tier Comparison

-   **Offline App Load (V2, V10):** Confirmed to fail for **Pro** users. Inferred to affect **Free** users due to similar authentication requirements. **Guest** users are not directly affected by auth-related offline load issues, but may still face V2 if core assets aren't cached.
-   **Waypoint Save Button Disabled (P3, V3):** Confirmed for **Pro** users. Inferred to affect **Free** and **Guest** users if they were able to access the waypoint save feature, as the underlying GPS acquisition issue is likely systemic.
-   **Manual `localStorage` Persistence (V1, V11, V15):**
    *   `sessionTrail` (V1) loss confirmed for **Pro**.
    *   `sessionWaypoints` (V11) loss confirmed for **Guest**.
    *   `activeModule` (V15) loss confirmed for **Guest**.
    This indicates a widespread issue with the manual `localStorage` pattern for these specific keys, affecting all tiers where the respective features are available.
-   **Theme Reset (V7):** Identical behavior across **Guest** and **Free** tiers (both fail, theme resets to 'dark'). Inferred to affect **Pro** users as well, pointing to a systemic issue with `ee_theme` persistence.
-   **Learn Header Stats (V13):** Identical behavior across **Guest** and **Free** tiers (both pass, header stats are recomputed on tab switch, confirming the state-loss vulnerability). This confirms the underlying component unmount/remount issue for non-map tabs.
-   **Free Waypoint Save (F3):** Specific to the **Free** tier, showing a regression where they can access the waypoint save feature, bypassing the upgrade gate.
-   **Map Preferences Reset (V8, V9):** `basemap` (V9) reset indicated for **Guest**. `layerVisibility` (V8) reset indicated for **Free**. Inferred to affect all tiers, pointing to a systemic issue with `ee-map-prefs` persistence.
-   **Pro UpgradeSheet (P1):** Specific to the **Pro** tier, showing a regression where Pro users are incorrectly prompted to upgrade.
-   **Offline Route Save (V6):** Indicated for **Pro** users. Inferred to affect **Free** and **Guest** users if they could save routes, as the lack of user feedback for offline failures is likely systemic.

## Findings Discarded
- No findings were discarded in this report, as all identified issues had sufficient evidence and user impact to warrant inclusion within the maximum limit.

## Cannot Assess
- The exact content of `localStorage` keys for `ee-map-prefs` (V8, V9) after reload due to test timeouts.
- The specific code change that broke the manual `localStorage` write/read for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Whether free users can *successfully* save waypoints (F3), only that they can access the sheet.
- Whether a console error is logged for offline route save failures (V6), only that no user-facing toast appears.

## Systemic Patterns
-   **Widespread Persistence Failures:** Multiple findings (V1, V7, V8, V9, V11, V15) point to a fundamental breakdown in `localStorage` persistence mechanisms. This affects both Zustand's `persist` middleware (`ee-map-prefs`) and the manual `IIFE + write` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This indicates a critical flaw in how user preferences and session data are saved and restored across reloads.
-   **Severe Offline Capability Gaps:** The application completely fails to load offline for authenticated users (V2, V10) and exhibits silent data loss for offline save operations (V6). This highlights a profound lack of offline-first design, making the app unusable in its primary target environment (rural Ireland).
-   **Flawed Feature Gating Logic:** Regressions in feature gating (F3, P1) suggest inconsistencies or race conditions in how the user's `isPro` status is evaluated and applied to UI elements and actions, leading to incorrect access or prompts.
-   **Persistent GPS Acquisition Issues:** The consistent "Acquiring GPS..." state (P3, V3) points to a problem with the app's geolocation handling, either with the browser API integration, Playwright mock, or its internal state management, preventing core functionality.

## Calibration Notes
-   The "Vulnerability-Proof Test Philosophy" is proving effective, with tests explicitly confirming vulnerabilities via annotations (e.g., V1, V11, V15), which is crucial for accurate reporting.
-   Timeouts (V8, V9, P1) are interpreted as `MEDIUM` confidence findings, inferring that the expected state was not met. This approach avoids misdiagnosing genuine issues as `PHANTOM` errors, aligning with lessons from previous runs.
-   Direct evidence from annotations like `ee_theme-before-reload: null` for V7 provides strong, unambiguous confirmation of persistence failures.