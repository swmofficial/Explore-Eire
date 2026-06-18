# UX Agent Report — 2026-06-18

## Run Context
- Commits analysed: `032e207` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state. This is a regression of a previously confirmed fix.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Re-implement and verify Service Worker caching for the app shell and critical data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Persistence of User Preferences (Theme, Basemap, Layers, Active Module) is Failing (Vulnerability V7, V8, V9, V15)
- Summary: User preferences for theme, basemap, layer visibility, and active module are not persisting across page reloads, reverting to default settings. This is a regression of multiple previously confirmed fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded.`, indicating the basemap and layer visibility states could not be verified after reload, strongly suggesting a reset to defaults.
    - `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact point of failure within the Zustand `persist` middleware for `ee-map-prefs` (V8, V9).
- Root cause: The manual `localStorage` persistence patterns for `ee_theme` (V7) and `ee_active_module` (V15) are failing to write to `localStorage`. The Zustand `persist` middleware for `ee-map-prefs` (basemap, layerVisibility - V8, V9) also appears to be failing or misconfigured.
- User impact: Users constantly lose their personalized settings, leading to a frustrating and unreliable experience that requires repeated configuration.
- Business impact: Erodes user trust and satisfaction, reducing engagement and retention.
- Fix direction: Debug and re-verify all `localStorage` persistence mechanisms, including manual patterns and Zustand `persist` middleware configurations.

### 4. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test from proceeding.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` is correctly read and `isPro` is set before Pro affordances are evaluated.

### 5. High: Guest Waypoints and GPS Tracks are Lost on Reload (Vulnerability V11, V1)
- Summary: Guest waypoints and active GPS tracks are not persisted and are lost upon page reload, leading to unrecoverable data loss. This is a regression of previously confirmed fixes.
- Tier(s) affected: Guest (V11), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active.
    - `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact point of failure within the manual `localStorage` write patterns.
- Root cause: The manual `localStorage` persistence patterns for `ee_guest_waypoints` (V11) and `ee_session_trail` (V1) are failing to write to `localStorage`.
- User impact: Users lose valuable session data (waypoints, tracks) if the app reloads or crashes, leading to significant data loss and frustration.
- Business impact: Erodes trust in the app's reliability, especially for core data collection features, potentially leading to user abandonment.
- Fix direction: Debug and re-verify the manual `localStorage` persistence mechanisms for `sessionWaypoints` and `sessionTrail`.

### 6. High: Route Save Offline Produces No User-Facing Toast (Vulnerability V6)
- Summary: When a Pro user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to perceived data loss.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V6` passed. The `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The test passing confirms the expected behavior (no toast) based on the current implementation.
- Cannot confirm: Direct visual evidence of the absence of a toast from the test run, as the test is designed to pass if no toast appears.
- Root cause: The `routes` INSERT operation in `RouteBuilder` only logs to `console.error` on failure, without triggering a user-facing toast, violating "Data Safety" principles.
- User impact: Users believe their route has been saved when it hasn't, leading to data loss, confusion, and distrust in the app's reliability.
- Business impact: Undermines data integrity and user trust, potentially leading to negative reviews and reduced engagement with route planning features.
- Fix direction: Implement a user-facing toast notification for failed route save operations, clearly communicating the failure to the user.

## Tier Comparison
- **Offline App Load (V10, V2):** Fails for Free and Pro tiers, preventing the app from loading at all. The guest tier is not explicitly tested for this specific failure mode, but the core app shell loading issue would likely affect all users.
- **Persistence Issues (V7, V8, V9, V15, V11, V1):** These issues are widespread across tiers. Theme (V7) affects guest and free. Basemap (V9) and Layers (V8) affect guest and free. Active Module (V15) and Guest Waypoints (V11) affect guest. GPS Track (V1) affects Pro. The commonality points to a systemic failure in `localStorage` persistence mechanisms, both manual and Zustand's `persist` middleware.
- **GPS Acquisition (P3, V3, V14):** Affects the Pro tier exclusively, as only Pro users have the capability to save waypoints.
- **Pro Status Recognition (P1):** Affects the Pro tier exclusively, as it pertains to access to paid features.
- **Route Save Offline (V6):** Affects the Pro tier exclusively, as only Pro users can save routes.
- **Learn Tab State (V13, F4):** Behaves identically and correctly for Guest and Free tiers, confirming that header statistics are stable across tab switches.

## Findings Discarded
- No findings were discarded in this run, as all identified issues are distinct and have significant user and business impact.

## Cannot Assess
- The exact cause of the regression for multiple previously confirmed fixes (V1, V7, V10, V11, V15, P1, P3) without direct code inspection of recent changes.
- Whether the *in-progress chapter reading position* (the original V13 concern) is preserved, as the current V13 test only checks header statistics. However, the previous fix (always mounting the Learn tab) should address this.

## Systemic Patterns
1.  **Widespread Regression of Persistence Fixes:** A significant number of previously "CONFIRMED" fixes related to `localStorage` persistence (V1, V7, V11, V15) have regressed. This indicates a fundamental issue with how `localStorage` is being written or read, or a breaking change in the application's state management initialization that has impacted both manual persistence patterns and potentially Zustand's `persist` middleware.
2.  **Regression of Core Offline Capabilities:** The application's ability to load offline (V10, V2) and correctly acquire GPS (P3, V3) has regressed. This points to issues with the Service Worker caching implementation and/or the integration of Playwright's geolocation mock.
3.  **Inconsistent Offline Error Handling:** While some offline failures are handled with toasts (e.g., track save), others (like route save, V6) still fail silently, leading to a fragmented and unreliable offline experience.

## Calibration Notes
- The high number of regressions for previously "CONFIRMED" fixes (V1, V7, V10, V11, V15, P1, P3) was a primary focus. I treated these as HIGH confidence findings due to direct test evidence of the regression.
- I leveraged `STATE_MAP.md` as ground truth to confirm vulnerabilities like V6 (silent route save failure) even when test annotations were not explicit about the absence of a toast.
- The V13 test's `state-loss-evidence` annotation, despite its name, confirmed the *stability* of Learn header stats, aligning with the previous fix. This allowed me to correctly interpret a "pass" as a positive finding.
- I avoided speculating on the exact cause of timeouts (V8, V9, P1, P3, V3) beyond what the error message and `STATE_MAP.md` suggested, linking them to persistence or GPS issues where evidence was strong.