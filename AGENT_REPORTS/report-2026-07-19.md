# UX Agent Report — 2026-07-19

## Run Context
- Commits analysed: `2a6192c9d645fa5eff72a38aac7859ebe2d80c4e` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Systemic Failure of Manual `localStorage` Persistence (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    - `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes (task-008, task-002, task-013, task-006).
- User impact: Loss of critical session data (e.g., a recorded track) and user preferences, leading to frustration and a perception of an unreliable application.
- Business impact: Damages user trust, increases churn, reduces engagement with core features.
- Fix direction: Re-evaluate and debug the manual `localStorage` read/write patterns for all affected state keys.

### 4. High: Free Users Can Access Waypoint Sheet Instead of Upgrade Prompt (Vulnerability F3)
- Summary: Free tier users are able to tap the "Add Waypoint" button and open the `WaypointSheet` instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the save button within the WaypointSheet would be disabled or if an upgrade prompt would appear *on save*.
- Root cause: The gating logic for the "Add Waypoint" button (likely in `CornerControls` or `Map.jsx`) is incorrectly checking `isPro` or `subscriptionStatus`, allowing free users to bypass the upgrade prompt.
- User impact: Confusing user experience where a feature appears available but is not, leading to frustration when they eventually hit a paywall or cannot save.
- Business impact: Missed opportunity for conversion to Pro subscription, as the upgrade prompt is not presented at the point of intent.
- Fix direction: Correct the conditional rendering or routing logic for the "Add Waypoint" button to surface the `UpgradeSheet` for free users.

### 5. Medium: Basemap and Layer Visibility Preferences Reset on Reload (Vulnerability V8, V9)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, the consistent failure pattern for persistence tests suggests an underlying issue. `STATE_MAP.md` lists `basemap` and `layerVisibility` as persisted via `ee-map-prefs` Zustand middleware. Given the other persistence failures (V1, V7, V11, V15), it's highly probable these are also failing.
- Cannot confirm: Direct `localStorage` values for `ee-map-prefs` due to timeout.
- Root cause: Likely a failure in the Zustand `persist` middleware for `mapStore` or an issue with how `basemap` and `layerVisibility` are read/applied on app initialization, similar to the manual persistence issues.
- User impact: Users constantly have to re-select their preferred basemap and re-enable desired layers, leading to minor but repetitive frustration.
- Business impact: Degrades user experience, potentially leading to lower engagement with map features.
- Fix direction: Investigate `mapStore`'s Zustand `persist` configuration and initial state hydration for `basemap` and `layerVisibility`.

### 6. Medium: Offline Data Write Failures are Silent or Incomplete (Vulnerability V4, V6, V14)
- Summary: When offline, attempts to save tracks and routes fail, with route saves failing silently (no toast) and waypoint saves lacking a pre-save offline warning.
- Tier(s) affected: Pro (confirmed), inferred Free/Guest for relevant features.
- Confidence: MEDIUM
- Evidence:
    - `pro V4` (PASS): "track save fails offline (post-stop data loss)". This test *passed*, confirming the vulnerability (data loss on offline save).
    - `pro V6` (PASS): "route save offline produces no user-facing toast (silent failure)". This test *passed*, confirming the vulnerability (silent failure).
    - `pro V3` (FAIL, but annotation relevant): `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a pre-save warning for waypoints.
- Cannot confirm: The exact toast message for track save failure (V4) as the test passed, only that the data was lost.
- Root cause: The app lacks an offline-first data strategy. `STATE_MAP.md` explicitly states: "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". Supabase write failures are not gracefully handled with local queuing or robust user feedback.
- User impact: Users lose valuable data (tracks, routes, waypoints) when operating offline, leading to significant frustration and distrust. Silent failures are particularly insidious.
- Business impact: Severe damage to user trust and retention, especially for a field-based app where offline usage is critical.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) and provide clear, actionable feedback to users about offline save status and eventual sync.

### 7. Low: Learn Tab Header Stats Recompute on Tab Switch (Vulnerability V13 - re-evaluation)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) appear to recompute or refresh on every tab switch, even though the underlying component state *should* be preserved.
- Tier(s) affected: All
- Confidence: LOW
- Evidence: `guest V13` and `free V13` both passed with `state-loss-evidence` showing identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. The test description states "learn header stats are recomputed on every tab switch (state-loss proof)". While the *values* didn't change (because no progress was made in the test), the test *passed* because they were identical. The previous fix for V13 addressed component unmounting, but the header stats might be derived from `useProgress()` which reads `localStorage` on every render, or the component re-renders and re-calculates.
- Cannot confirm: If actual progress (e.g., `chaptersDone > 0`) would be lost or merely re-calculated. The test does not create progress.
- Root cause: The previous fix for V13 addressed component unmounting, but the header stats might be derived from `useProgress()` which reads `localStorage` on every render, or the component re-renders and re-calculates. This isn't a *loss* of data (as `ee_progress` is persisted), but a re-computation that might cause a flicker or perceived state loss if the calculation is slow.
- User impact: Minor visual flicker or perceived delay if stats are re-calculated on every tab switch, but no actual data loss if `ee_progress` is correctly persisted.
- Business impact: Minor degradation of perceived performance and polish.
- Fix direction: Optimize the Learn header stats calculation to memoize results or ensure it only re-renders when underlying `ee_progress` changes.

## Tier Comparison
- **Offline App Load (V2, V10):** Pro tier completely fails to load offline. This behavior is inferred for the Free tier as well, as it also relies on Supabase authentication. The Guest tier is not tested for this specific scenario, but would likely load as it has no Supabase session dependency.
- **GPS Acquisition Failure (P3, V3):** This issue affects the Pro tier, preventing waypoint saves. It is highly probable that Free and Guest users (if they were permitted to save waypoints) would experience the same GPS acquisition failure.
- **Manual `localStorage` Persistence (V1, V7, V11, V15):** The failures for theme (V7), active module (V15), guest waypoints (V11), and session trail (V1) are consistent across all tiers where these features are applicable. This indicates a systemic issue with the manual persistence pattern itself, rather than a tier-specific problem.
- **Basemap and Layer Visibility Reset (V8, V9):** Both `guest V9` and `free V8` tests failed with timeouts, suggesting a consistent issue with `mapStore` persistence across tiers.
- **Learn Tab Header Stats (V13):** The behavior of Learn tab header stats (recomputation without actual data loss in the test) is consistent across Guest and Free tiers.
- **Free User Waypoint Gate (F3):** This finding is specific to the Free tier, where the upgrade gate for waypoint saving is bypassed.

## Findings Discarded
None. All identified findings are included, as the total is 7, which is within the 8-finding limit.

## Cannot Assess
- **Pro User Upgrade Sheet Bypass (P1):** The `pro P1` test failed with a timeout, preventing assessment of whether Pro users correctly bypass upgrade prompts when tapping Pro-gated features.
- **Pro Status Reversion Offline (V10):** While `pro V10` confirmed the app fails to load offline, it could not confirm if a Pro user's `isPro` status would revert to 'free' *after* loading, as the app never reached a loaded state.

## Systemic Patterns
- **Persistence Regression:** A major systemic issue is the widespread failure of `localStorage` persistence, affecting both manual patterns (V1, V7, V11, V15) and potentially Zustand `persist` middleware (V8, V9). This suggests a recent regression or incomplete implementation of persistence mechanisms across the application.
- **Offline-First Deficiency:** The application fundamentally lacks offline-first capabilities, leading to complete failure to load offline (V2, V10) and data loss on offline writes (V4, V6, V14). This is a critical architectural gap for a field-use application where offline usage is a primary use case.
- **GPS Acquisition Issues:** A core dependency (GPS location) appears to be failing, blocking critical features like waypoint saving (P3, V3) across relevant tiers.

## Calibration Notes
- The interpretation of "PASS" for vulnerability tests (e.g., V1, V4, V6, V11, V15) was carefully considered. A "PASS" in these cases indicates that the test journey completed and *produced evidence confirming the vulnerability*, not that the vulnerability itself was fixed. This aligns with the "Vulnerability-Proof Test Philosophy".
- Timeouts (e.g., V8, V9, P1) were treated with lower confidence for specific assertions, but their consistent appearance in persistence-related tests suggests an underlying issue that warrants investigation.
- The re-evaluation of V13 highlighted the distinction between component unmounting (which was previously fixed) and the re-computation of derived state, ensuring the analysis focuses on observable UX impact.
- Critical offline loading and core feature blocking issues (GPS) were prioritized as highest impact, consistent with previous reports and the nature of the application.