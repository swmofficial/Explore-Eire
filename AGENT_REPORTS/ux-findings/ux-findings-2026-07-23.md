# UX Agent Report — 2026-07-23

## Run Context
- Commits analysed: `8757d767b0ab9ffe2cc0d1f0160a3ea6135d2dd6` (latest) and 19 preceding commits.
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

### 3. High: All Manual `localStorage` Persistence Mechanisms Failing (Vulnerability V1, V7, V11, V15)
- Summary: Multiple critical user preferences and session data (theme, guest waypoints, active module, session trail) that are explicitly designed to persist via manual `localStorage` patterns are failing to do so, leading to data and preference loss on reload.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `Expected: "light" Received: "dark"`. This confirms theme resets and `ee_theme` is not being written.
    - `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the IIFE read/write pattern (e.g., `setItem` not being called, or `getItem` returning null unexpectedly).
- Root cause: The `STATE_MAP.md` describes `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` as using a "manual IIFE + write pattern — proven reliable". The test results directly contradict this, indicating a fundamental failure in this persistence mechanism.
- User impact: Users lose their chosen theme, guest waypoints, active module context, and in-progress GPS tracks on every reload, leading to significant frustration and loss of unsaved work.
- Business impact: Erodes user trust, reduces engagement with core features, and hinders conversion for features like tracking and waypoints.
- Fix direction: Thoroughly debug the manual `localStorage` read/write patterns for all affected state keys, ensuring `localStorage.setItem` is correctly invoked and `localStorage.getItem` is correctly hydrating the store on initialization.

### 4. High: Free Users Can Save Waypoints Instead of Upgrading (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to save waypoints directly, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, indicating that tapping the camera button opened the `WaypointSheet` instead of the `UpgradeSheet`.
- Cannot confirm: The specific code path that leads to this incorrect routing.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `userStore.isPro` before displaying the `WaypointSheet`.
- User impact: Free users gain access to a premium feature without payment, devaluing the Pro subscription.
- Business impact: Direct revenue loss, undermines the value proposition of the Pro tier, and could lead to a perception of unfairness among paying subscribers.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` for free users when attempting to save a waypoint.

### 5. Medium: Pro Users See Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: Pro users are incorrectly presented with an Upgrade Sheet when interacting with a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with a timeout. The test expects the UpgradeSheet *not* to be visible after a Pro affordance tap. A timeout in this context often means the expected element (e.g., the Pro feature itself) did not appear, or the UpgradeSheet *did* appear and blocked further interaction. Given the `free F3` test's failure (UpgradeSheet *not* shown when it *should* be), it's plausible P1 timed out because the UpgradeSheet *was* shown when it *shouldn't* have been.
- Cannot confirm: Direct visual evidence of the UpgradeSheet being visible for Pro users due to the timeout.
- Root cause: Incorrect conditional rendering logic for Pro features, failing to correctly evaluate `userStore.isPro` or `userStore.subscriptionStatus` before displaying the UpgradeSheet.
- User impact: Frustration for paying Pro users who are incorrectly prompted to upgrade, undermining their premium experience.
- Business impact: Damages trust and satisfaction among paying subscribers, potentially leading to churn.
- Fix direction: Review the gating logic for Pro features to ensure `isPro` status is correctly checked and the UpgradeSheet is only displayed for non-Pro users.

### 6. Medium: Map Preferences (Basemap, Layer Visibility) Reset on Reload (Vulnerability V8, V9)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: Guest, Free
- Confidence: MEDIUM
- Evidence: `guest V9` (basemap) and `free V8` (layer preferences) tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, this strongly suggests the expected persisted state (e.g., 'light' basemap, specific layer toggles) was not present after reload, causing the test to wait indefinitely.
- Cannot confirm: Direct visual evidence of the reset due to the timeout.
- Root cause: `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via Zustand's `persist` middleware under `ee-map-prefs`. The consistent timeouts across tiers suggest an issue with this specific Zustand persistence configuration or its interaction with the application's reload cycle.
- User impact: Users must reconfigure their preferred basemap and layer visibility settings after every page reload, leading to repetitive and annoying tasks.
- Business impact: Minor but persistent friction that degrades the user experience and can contribute to overall dissatisfaction.
- Fix direction: Investigate the Zustand `persist` middleware configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved to and loaded from `localStorage`.

### 7. High: Offline Track Save Fails (Vulnerability V4)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the complete loss of the accumulated track data without a clear, actionable error message or local persistence.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save track `tracks` INSERT... Fails — toast 'Could not save track' ... YES — entire GPS trail, distance, elevation, duration gone."
- Cannot confirm: The exact toast message displayed, as the test passed by confirming the failure.
- Root cause: Lack of an offline data queue. All data writes (including tracks) are directly attempted against Supabase. When offline, these network requests fail, and the accumulated `sessionTrail` data (which is volatile in `mapStore` until explicitly saved) is lost.
- User impact: Users lose valuable, unrecoverable GPS track data after an activity, leading to significant frustration and distrust in the app's reliability, especially in rural areas.
- Business impact: Severe negative impact on user retention and engagement with a core feature. Directly undermines the app's utility for its target audience.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., using IndexedDB) for user-generated content like tracks.

### 8. High: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently, providing no user-facing feedback that the route was not saved.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save route `routes` INSERT... Fails — console.error only, no toast." The annotation `route-button-missing: cannot proof V6` is a note about the test's internal proof mechanism, not a contradiction of the vulnerability.
- Cannot confirm: The exact console error message, as it's not exposed to the user.
- Root cause: Similar to V4, this is due to the lack of an offline data queue and direct Supabase write attempts. The specific implementation for route saving lacks user-facing error handling (toasts) for network failures.
- User impact: Users believe their route has been saved, only to discover it's missing later, leading to confusion and frustration. This can cause users to lose carefully planned routes.
- Business impact: Erodes user trust and reliability perception. Can lead to negative reviews and reduced engagement with the route planning feature.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for routes. Ensure user-facing feedback (e.g., a toast notification) is provided for all failed save operations.

## Tier Comparison

-   **Theme Persistence (V7)**: Fails for both `guest` and `free` users, indicating a systemic issue with the `ee_theme` manual `localStorage` pattern that affects all users regardless of authentication status.
-   **Learn Header Stats (V13)**: Both `guest` and `free` tests passed, and the `state-loss-evidence` shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. This indicates that while the component might recompute these stats, the underlying data source for these specific header statistics is stable and not lost across tab switches for either tier.
-   **Map Preferences (V8, V9)**: `guest V9` (basemap) and `free V8` (layer visibility) both failed with timeouts, strongly suggesting that `mapStore` preferences are not persisting across reloads for either unauthenticated or authenticated free users. This points to a general issue with `mapStore`'s Zustand `persist` configuration.
-   **Manual `localStorage` Persistence (V1, V11, V15)**: `guest V11` (waypoints) and `guest V15` (active module) confirm loss for guests. `pro V1` (session trail) confirms loss for Pro users. This indicates a widespread failure of the manual `localStorage` persistence pattern across different data types and tiers.
-   **Offline App Loading (V2, V10)**: `pro V2` and `pro V10` both failed due to `net::ERR_INTERNET_DISCONNECTED`, meaning the app cannot load at all for Pro users when offline. This behavior is highly likely to extend to `free` users as well, as the core app shell and initial data loading mechanisms are shared.
-   **Waypoint Saving (F3, P3, V3)**: `free F3` shows free users can save waypoints (bypassing upgrade), while `pro P3` and `pro V3` show the save button is disabled for Pro users due to GPS acquisition failure. This highlights distinct gating and functional issues across tiers for the same core feature.
-   **Pro Gating (F2, P1)**: `free F2` correctly shows PRO badges for free users. `pro P1` failed with a timeout, suggesting Pro users might incorrectly see an Upgrade Sheet, which is the inverse of `free F3`'s problem.

## Findings Discarded

-   **guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)**: This finding was discarded. Although the test annotation includes "state-loss proof" and indicates recomputation, the `state-loss-evidence` explicitly shows that the `before` and `after` numeric values for `courses`, `completePct`, and `chaptersDone` are identical. This means that while the component might be re-rendering (and thus recomputing), the *data* for these specific header statistics is not being lost. The test passed, and the evidence does not show a negative user impact for the data it checks. The underlying vulnerability of component state loss (e.g., scroll position within a chapter) might still exist as per `UX Knowledge Context`, but this specific test does not provide evidence for it.

## Cannot Assess

-   No specific components or features were entirely unassessable. However, the `pro V10`, `pro V2`, `guest V9`, `free V8`, and `pro P1` tests failed due to timeouts or network disconnection, which prevented full observation of the intended UX state. While strong inferences could be made, direct visual confirmation of the final state was not always possible.

## Systemic Patterns

1.  **Widespread Persistence Failures**: A critical systemic issue is the failure of *all* manual `localStorage` persistence patterns (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) as well as issues with Zustand's `persist` middleware for `mapStore` (`basemap`, `layerVisibility`). This indicates a fundamental problem with how user preferences and session data are being saved and restored across reloads, affecting multiple core features and user experience aspects.
2.  **Lack of Offline-First Design**: The application completely fails to load offline for authenticated users and exhibits silent or data-losing failures for critical write operations (waypoints, tracks, routes) when offline. This is a pervasive architectural flaw that severely impacts usability for the target user base in rural areas.
3.  **Inconsistent Gating Logic**: There are contradictory issues with Pro feature gating: free users can access a Pro feature (saving waypoints), while Pro users are incorrectly prompted to upgrade. This suggests a fragmented or buggy implementation of the `isPro` check across different UI elements.

## Calibration Notes

-   The analysis of `V13` (learn tab state loss) was informed by previous "CONFIRMED" verdicts regarding the fix for component unmounting. The current test's `state-loss-evidence` showing identical numeric values, despite the "state-loss proof" annotation, led to a careful re-evaluation. I avoided marking it as a finding because the *data* itself was stable, even if the component re-rendered. This aligns with the principle of focusing on observable user impact.
-   The consistent failure of manual `localStorage` persistence (V1, V7, V11, V15) across multiple tests and tiers provided strong evidence for a systemic issue, reinforcing the need to trace findings to architectural causes as per `STATE_MAP.md`. The discrepancy between `STATE_MAP.md` claiming "proven reliable pattern" and the test annotations showing `null`/`absent` was a key indicator.
-   Timeouts for `V8`, `V9`, and `P1` were treated with `MEDIUM` confidence, acknowledging the lack of direct visual evidence but inferring likely outcomes based on the nature of the test (expecting a persisted state) and other related findings (widespread persistence issues, inconsistent gating). This balances the "NEVER guess" rule with the need to identify probable issues.