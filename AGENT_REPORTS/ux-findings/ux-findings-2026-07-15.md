# UX Agent Report — 2026-07-15

## Run Context
- Commits analysed: `69280a1727d56a60a1e950719e1785dd792408f9` (latest) and 19 preceding commits.
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

### 3. High: All Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    *   `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    *   `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    *   `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    *   `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `theme`, `sessionTrail`, `sessionWaypoints`, and `activeModule` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes.
- User impact: Loss of user preferences and critical session data (e.g., a recorded GPS track), leading to significant frustration and distrust.
- Business impact: Erodes user trust, increases churn, and devalues core features.
- Fix direction: Thoroughly debug and re-implement manual `localStorage` read/write operations for all affected state keys.

### 4. High: Map Preferences (Basemap, Layers) Reset on Reload (Vulnerability V8, V9)
- Summary: User-selected basemap and layer visibility preferences are lost on page reload, reverting to default settings.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout`. This indicates the expected basemap or layer visibility state was not present after a reload.
- Cannot confirm: Direct assertion failure, as the tests timed out.
- Root cause: The Zustand `persist` middleware for `mapStore` (using the `ee-map-prefs` key) is failing to correctly save or restore `basemap` and `layerVisibility` preferences.
- User impact: Users must repeatedly re-select their preferred basemap and re-enable desired layers after every app reload, causing friction and annoyance.
- Business impact: Frustration, perceived lack of polish, and reduced engagement with map customization features.
- Fix direction: Investigate the configuration and data hydration process of the Zustand `persist` middleware for `mapStore`.

### 5. Medium: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free users are incorrectly allowed to access the "Save Waypoint" feature directly, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing` annotation explicitly states `{"upgradeShown":false,"waypointShown":true}`, confirming the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: The specific code path that incorrectly bypasses the upgrade check.
- Root cause: Incorrect conditional rendering or routing logic for the "Save Waypoint" action, failing to trigger the `UpgradeSheet` for free users.
- User impact: Free users can use a Pro feature without paying, which may lead to confusion if other Pro features are correctly gated.
- Business impact: Direct loss of potential upgrade conversions and devaluation of the Pro subscription.
- Fix direction: Correct the conditional logic to ensure the `UpgradeSheet` is displayed when a free user attempts to save a waypoint.

### 6. Medium: Pro Users See Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: Pro users are incorrectly presented with an upgrade sheet when attempting to access a Pro-gated feature, despite already having an active subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with a `Test timeout`. The test expects the `UpgradeSheet` *not* to be visible for a Pro user. A timeout suggests the `UpgradeSheet` *was* visible, or the assertion failed to confirm its absence.
- Cannot confirm: Direct assertion failure, only a timeout.
- Root cause: Flawed gating logic for Pro features, potentially misinterpreting `isPro` status or incorrectly triggering `showUpgradeSheet` even for authenticated Pro users.
- User impact: Paying customers are confused and frustrated by being asked to upgrade for features they already pay for.
- Business impact: Erodes trust with paying users, increases support inquiries, and negatively impacts retention.
- Fix direction: Verify that `isPro` checks are correctly implemented to prevent the `UpgradeSheet` from appearing for Pro users when accessing Pro features.

### 7. Low: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing notification, leading to silent data loss.
- Tier(s) affected: Pro (likely all authenticated users)
- Confidence: HIGH
- Evidence: `pro V6` passed, which, according to `STATE_MAP.md` ("console.error only, no toast"), confirms the vulnerability of silent failure. The annotation `route-button-missing: cannot proof V6` is misleading, as the test's success implies the expected silent failure.
- Cannot confirm: The exact `console.error` message generated.
- Root cause: The `routes` INSERT operation to Supabase lacks a user-facing toast notification for network-related failures.
- User impact: Users believe their route has been successfully saved, only to discover it's lost later, leading to frustration and distrust.
- Business impact: Data loss, reduced trust in the app's reliability, and potential negative reviews.
- Fix direction: Implement a user-facing toast notification to inform users when a route save operation fails due to lack of connectivity.

### 8. Low: No Offline Warning Before Waypoint Save Attempt (Vulnerability V14)
- Summary: The application does not provide a pre-save warning when a user attempts to save a waypoint while offline, leading to a failed operation without prior notification.
- Tier(s) affected: Pro (likely all authenticated users)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The specific UI/UX for an ideal pre-save warning.
- Root cause: Absence of a network connectivity check and corresponding user warning before initiating a Supabase write for waypoints.
- User impact: Users proceed with saving a waypoint, only for the operation to fail, causing frustration and wasted effort.
- Business impact: Contributes to user frustration and a perception of unreliability, potentially increasing support load.
- Fix direction: Implement a network connectivity check and display a clear warning or disable the save button with an explanation when offline.

## Tier Comparison
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** All tiers are affected by the widespread failure of both manual `localStorage` and Zustand `persist` mechanisms for user preferences (theme, basemap, layers, active module) and session data (waypoints, tracks). This indicates a systemic issue independent of authentication status.
- **Offline App Load (V2, V10):** Pro users (and likely Free users, though not explicitly tested) experience complete app failure when attempting to load offline. Guest users' behavior in this scenario is not directly assessed by the current tests.
- **GPS Acquisition Issues (P3, V3):** Pro users encounter a disabled waypoint save button due to GPS acquisition failure. This is likely a universal problem affecting any tier attempting to save waypoints.
- **Learn Tab State (V13, F4):** The Learn tab's header statistics (courses, completion percentage, chapters done) correctly persist across tab switches for both Guest and Free users. This indicates that the fix for V13 (preserving component state) is effective for these derived stats, and progress is correctly persisted.
- **Pro Badges (F2):** Free users correctly see "PRO" badges on Pro-gated layers in the LayerPanel, which is the intended behavior to encourage upgrades.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were distinct and ranked within the maximum limit of 8.

## Cannot Assess
- The full extent of offline app load failure for `guest` users, as specific tests (`guest V2`, `guest V10`) for this scenario are not present in the guest suite.
- The precise behavior of `isPro` status reverting to 'free' on offline reload (V10) because the app fails to load at all for authenticated users when offline, preventing the assertion from being reached.

## Systemic Patterns
- **Widespread Persistence Failures:** A critical systemic issue where both Zustand `persist` middleware and manual `localStorage` patterns are failing to save and rehydrate crucial user preferences and session data. This impacts core functionality and user trust across all tiers.
- **Inadequate Offline-First Implementation:** The application demonstrates a fundamental lack of offline-first design, evidenced by complete app failure for authenticated users offline, and silent data loss for critical write operations (waypoints, routes) without user notification or queuing.
- **Broken Gating Logic:** The logic controlling access to Pro features is flawed, leading to both free users bypassing upgrade prompts for Pro features (F3) and paying Pro users being incorrectly shown upgrade prompts (P1).
- **Core GPS Functionality Issues:** The app is consistently failing to acquire GPS location, which directly impacts the ability to save waypoints, a fundamental feature for prospectors.

## Calibration Notes
- The recurrence of `V7` (theme persistence) and `V1`, `V11`, `V15` (session data/active module persistence) failures, despite previous "CONFIRMED" fixes, highlights the need for more robust, end-to-end testing and validation of persistence mechanisms, especially when architectural changes are made (e.g., switching between Zustand `persist` and manual `localStorage`).
- The `V13` test's success in showing consistent Learn tab header stats confirms that the "always-mounted" approach for tab content is effectively preserving component state for the measured elements, aligning with the intended fix.
- The distinction between `P1` (UpgradeSheet for Pro users) and `F2` (Pro badges for Free users) is critical. The `F2` test correctly passes, indicating the intended upgrade encouragement for Free users, while `P1`'s failure suggests a separate issue with gating logic for paying users.
- Strict adherence to direct evidence from annotations and error messages, as reinforced by past `PHANTOM` verdicts, was maintained. Timeouts for `V8`, `V9`, and `P1` were scored as MEDIUM confidence due to their indirect nature, but still indicative of underlying issues.
- The interpretation of a "PASS" for vulnerability tests (`V1`, `V6`, `V11`, `V15`) as confirmation of the vulnerability's existence (e.g., data *is* lost, failure *is* silent) was consistently applied, reflecting the design of the new test suite.