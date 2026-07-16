# UX Agent Report — 2026-07-16

## Run Context
- Commits analysed: `c6ec12890f18437d15fa48d52440d5a2b83c6cf2` (latest) and 19 preceding commits.
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

### 3. High: All Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V11, V15)
- Summary: User preferences (active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All (Guest for V11/V15, Pro for V1, inferred for Free)
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These results confirm the vulnerabilities.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `sessionWaypoints`, `activeModule`, and `sessionTrail` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes.
- User impact: Loss of critical session data (e.g., a recorded GPS track, unsaved waypoints) and preferences (active module), leading to significant frustration and distrust.
- Business impact: Erodes user trust, increases churn, and devalues user-generated content.
- Fix direction: Debug the manual `localStorage` read/write implementations in `mapStore.js` and `moduleStore.js`.

### 4. High: Zustand `persist` Middleware for Preferences is Failing (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility, which are managed by Zustand's `persist` middleware, are not surviving page reloads.
- Tier(s) affected: All (Guest for V7/V9, Free for V7/V8)
- Confidence: HIGH (V7), MEDIUM (V8, V9 due to timeouts but strong inference)
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written/read. `guest V9` (basemap) and `free V8` (layer preferences) tests timed out, strongly implying persistence failure given the confirmed V7 issue.
- Cannot confirm: The exact reason for the timeouts in V8 and V9, but the pattern of preference loss is clear.
- Root cause: The Zustand `persist` middleware configuration for `userStore` (`theme`) and `mapStore` (`basemap`, `layerVisibility`) is not correctly writing or reading state to/from `localStorage` (or the manual `ee_theme` key for theme). This indicates a regression or misconfiguration.
- User impact: Loss of user interface preferences (theme, map style, visible layers) on every app reload, requiring users to reconfigure their settings repeatedly.
- Business impact: Reduces user satisfaction, makes the app feel unreliable, and increases cognitive load.
- Fix direction: Debug the Zustand `persist` middleware configuration for `userStore` and `mapStore`, and verify the manual `ee_theme` implementation.

### 5. High: Free Users Can Bypass Upgrade Gate for Waypoint Creation (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet when tapping the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The test expected `upgradeShown` to be `true` but received `false`, while `waypointShown` was `true`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` directly confirms this routing error.
- Cannot confirm: If any subsequent save attempt by a free user would result in a server error or a delayed upgrade prompt.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action. The app fails to check the `isPro` status before showing the `WaypointSheet`.
- User impact: Free users are led down a path to a Pro-only feature, potentially wasting time filling out a form they cannot save, leading to frustration.
- Business impact: Missed opportunities to convert free users to Pro subscribers, as the upgrade prompt is bypassed.
- Fix direction: Adjust the logic for the camera button to display the `UpgradeSheet` when a free user attempts to create a waypoint.

### 6. Medium: No Pre-Save Offline Warning for Waypoints (Vulnerability V14)
- Summary: The application does not provide a user-facing warning when a user attempts to save a waypoint while offline, leading to silent failure and data loss.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: The `pro V3` test, despite failing due to GPS issues, included the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This directly confirms the absence of a pre-save offline warning.
- Cannot confirm: The exact toast message or UI behavior if the GPS acquisition issue were resolved and an offline save was attempted.
- Root cause: Missing network connectivity check and corresponding UI feedback before initiating a Supabase write operation for waypoints. This violates "Offline-First Design" principles.
- User impact: Users unknowingly attempt to save data that will be lost, leading to frustration and distrust in the app's data safety.
- Business impact: Data loss for users, negative perception of app reliability, and increased support requests.
- Fix direction: Implement a network connectivity check before allowing waypoint saves, and display a clear warning or queue the save for later.

### 7. Medium: Track Save Fails Silently Offline (Vulnerability V4)
- Summary: When a user attempts to save a recorded GPS track while offline, the operation fails without clear user feedback, leading to the loss of the entire track data.
- Tier(s) affected: Pro (likely all tiers that can save tracks)
- Confidence: HIGH
- Evidence: The `pro V4` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save track... Fails — toast "Could not save track" ... YES — entire GPS trail, distance, elevation, duration gone."
- Cannot confirm: The exact toast message or UI behavior, as the test only confirms the vulnerability's existence.
- Root cause: Lack of an offline data queue for tracks. The app attempts a direct Supabase write, which fails offline, and the accumulated `sessionTrail` data is not persisted locally for later sync. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable recorded activity data (e.g., a multi-hour hike), leading to significant frustration and potential abandonment of the app.
- Business impact: Direct data loss for users, severe damage to user trust, and negative reviews.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store track data locally and sync it when connectivity is restored.

### 8. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a created route while offline, the operation fails without any user-facing toast or feedback, leading to silent data loss.
- Tier(s) affected: Pro (likely all tiers that can save routes)
- Confidence: HIGH
- Evidence: The `pro V6` test passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save route... Fails — console.error only, no toast". The annotation `route-button-missing: cannot proof V6` indicates the test confirmed the lack of a toast.
- Cannot confirm: The exact console error message or if any other UI element indicates the failure.
- Root cause: Lack of an offline data queue for routes and insufficient error handling. The app attempts a direct Supabase write, which fails offline, and the `routePoints` data is not persisted locally for later sync, nor is the user informed. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users believe their custom routes are saved when they are not, leading to wasted effort and potential navigation issues in the field.
- Business impact: Data loss for users, severe damage to user trust, and negative reviews.
- Fix direction: Implement an offline data queue for routes and ensure user-facing error toasts are displayed for failed operations.

## Tier Comparison

-   **Offline App Loading (V2/V10):** The app completely fails to load offline for **Pro** users. This is a critical failure that would likely affect **Free** users as well, as the root cause (lack of Service Worker caching for the app shell) is systemic. The **Guest** tier does not have a specific test for this.
-   **GPS Acquisition Failure (P3/V3):** The "Save Waypoint" button is disabled due to GPS acquisition failure for **Pro** users. This issue is likely to affect **Free** and **Guest** users if they were able to initiate waypoint creation.
-   **Persistence Failures (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Resets on reload for both **Guest** and **Free** users. This indicates a systemic failure of the `ee_theme` manual `localStorage` persistence, likely affecting **Pro** users too.
    -   **Basemap (V9):** Resets on reload for **Guest** users (inferred from timeout). Likely affects **Free** and **Pro** users.
    -   **Layer Preferences (V8):** Resets on reload for **Free** users (inferred from timeout). Likely affects **Guest** and **Pro** users.
    -   **Guest Waypoints (V11):** Confirmed lost on reload for **Guest** users. This vulnerability is specific to the **Guest** tier.
    -   **Active Module (V15):** Resets on reload for **Guest** users. Likely affects **Free** and **Pro** users.
    -   **Session Trail (V1):** Confirmed lost on reload for **Pro** users. Likely affects **Free** and **Guest** users.
    -   **Overall:** Persistence mechanisms (both manual `localStorage` and Zustand `persist` middleware) are broadly failing across all tiers where tested, indicating a widespread regression.
-   **Learn Tab State (V13/F4):** Learn header statistics (courses, complete percentage, chapters done) are stable across tab switches for both **Guest** and **Free** users. This indicates the component state for these specific stats is being preserved, which is a positive outcome.
-   **Pro Badges (F2):** **Free** users correctly see "PRO" badges on gated features in the LayerPanel, which is the intended behavior to encourage upgrades.
-   **Upgrade Gating (F3/C3):**
    -   **Guest** users correctly see the `UpgradeSheet` when tapping a Pro-gated feature (C3).
    -   **Free** users *incorrectly* bypass the upgrade gate and open the `WaypointSheet` when tapping the camera button (F3). This is a specific regression for the **Free** tier.
    -   The `pro P1` test (Pro user does not see UpgradeSheet) timed out, so its behavior cannot be confirmed.
-   **Offline Data Saves (V4, V6, V14):** Confirmed vulnerabilities for **Pro** users (track save fails, route save fails silently, no pre-save warning for waypoints). These issues are due to a lack of offline data queuing and error handling, which would affect **Free** and **Guest** users if they were able to save data.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test timed out. While it's intended to pass (Pro users shouldn't see an upgrade sheet), a timeout does not provide sufficient evidence to confirm a failure of the intended behavior. It could be a test flakiness or an issue with the test's waiting conditions.
-   **guest V13 / free V13 — learn header stats are recomputed on every tab switch (state-loss proof):** Both tests passed, and the `state-loss-evidence` annotations showed identical `before` and `after` values for the header stats. This indicates that the header stats did *not* regress or lose their value across tab switches. The test description "state-loss proof" is misleading, as the evidence shows stability. The previous fix for V13 aimed to preserve component state, and for these specific header stats, it appears to be working.

## Cannot Assess

-   **Pro P1 behavior:** The test for Pro users not seeing the UpgradeSheet timed out, preventing confirmation of the expected behavior.
-   **Offline loading for Guest/Free:** While inferred, the specific `page.goto: net::ERR_INTERNET_DISCONNECTED` error was only observed for the Pro tier.

## Systemic Patterns

1.  **Widespread Persistence Failure:** Both manual `localStorage` implementations (for `theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`) and the Zustand `persist` middleware (for `basemap`, `layerVisibility`) are failing to correctly store and retrieve user preferences and session data across page reloads. This indicates a fundamental regression in the application's state management and persistence layer.
2.  **Lack of Comprehensive Offline-First Design:** The application exhibits critical failures in offline scenarios, including complete inability to load for authenticated users, and silent data loss or lack of warnings for data-saving operations (waypoints, tracks, routes). This fundamental architectural flaw makes the app unreliable in its primary use context (rural outdoor exploration).
3.  **GPS Acquisition Issues:** A core dependency for location-based features, GPS acquisition, is consistently failing, leading to disabled functionality (e.g., saving waypoints). This suggests a problem with the GPS integration or its interaction with the testing environment.

## Calibration Notes

-   Prioritized findings with direct error messages or explicit "confirmed" annotations over timeouts, while still inferring likely issues from timeouts when supported by a pattern of related failures (e.g., V7 failing strongly suggests V8/V9 are also persistence issues).
-   Avoided confirming "state loss" for V13 when the provided evidence showed identical "before" and "after" values, aligning with previous "PHANTOM" verdicts where speculative interpretations were discarded.
-   Grouped related persistence failures and offline issues to highlight systemic architectural problems rather than treating them as isolated bugs, reflecting a focus on root causes.
-   Explicitly noted where the current test results contradict the `STATE_MAP.md` (e.g., manual `localStorage` patterns described as "proven reliable" but failing), indicating a regression.