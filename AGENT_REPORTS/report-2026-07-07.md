# UX Agent Report — 2026-07-07

## Run Context
- Commits analysed: `4a3adf4` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` due to a failure in GPS acquisition, preventing users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1 - Regression)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature.
- Fix direction: Debug and re-implement the manual persistence for `sessionTrail` to ensure `ee_session_trail` is correctly updated in localStorage during tracking.

### 4. Critical Data Loss: Track Save Fails Offline (Vulnerability V4)
- Summary: When attempting to save a GPS track offline, the operation fails, resulting in the complete loss of the accumulated track data.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the track save failed offline. `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast "Could not save track".
- Cannot confirm: The exact toast message or its visibility in the provided screenshots, but the test passing confirms the failure.
- Root cause: Lack of an offline data queue for `tracks` INSERT operations. The app attempts a direct Supabase write which fails without connectivity. This violates "Offline-First Design" principles.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if they attempt to save it while offline, leading to extreme frustration.
- Business impact: Severe damage to user trust and retention, especially for a core feature used in remote areas.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store track data locally and sync it when connectivity is restored.

### 5. Critical Data Loss: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When attempting to save a route offline, the operation fails silently, providing no user feedback that the route was not saved, leading to data loss.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, indicating the journey completed without a visible toast. `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The annotation `route-button-missing: cannot proof V6` indicates the test itself couldn't *prove* the lack of toast, but the `STATE_MAP.md` confirms the silent failure.
- Cannot confirm: Direct visual evidence of the lack of toast from the test run, but the architectural ground truth is clear.
- Root cause: Lack of an offline data queue for `routes` INSERT operations and insufficient error handling/user feedback for offline failures.
- User impact: Users believe their route is saved, only to find it missing later, leading to confusion and frustration.
- Business impact: Erodes trust in the app's reliability and data integrity.
- Fix direction: Implement an offline data queue for routes and provide clear user feedback (e.g., a toast) when an offline save fails.

### 6. Free Users Misled: Camera Button Shows Waypoint Sheet Instead of Upgrade Prompt (Capability F3)
- Summary: Free users attempting to save a waypoint via the camera button are incorrectly shown the `WaypointSheet` instead of the `UpgradeSheet`, leading to confusion and a missed upgrade opportunity.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was not shown, but the waypoint sheet was.
- Cannot confirm: Visuals of the `WaypointSheet` being shown to a free user, but the annotation is clear.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action. Free users should be directed to an upgrade prompt when attempting a Pro-gated feature.
- User impact: Frustration for free users who are led to believe they can save waypoints, only to find they cannot. Missed opportunity for conversion.
- Business impact: Direct loss of potential Pro subscriptions and negative user experience for free users.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` for free users.

### 7. Preference Loss: Theme Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, regardless of authentication status.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being correctly used.
- Cannot confirm: The exact code line causing the `ee_theme` key to be `null`, but the effect is clear.
- Root cause: The manual `IIFE + write` pattern for `userStore.theme` (task-008) is not correctly persisting or hydrating the `ee_theme` localStorage key.
- User impact: Minor annoyance, app feels less personalised and reliable.
- Business impact: Small negative impact on user satisfaction and perceived quality.
- Fix direction: Debug and correct the manual persistence logic for `userStore.theme` to ensure the `ee_theme` localStorage key is correctly written and read.

### 8. Data Loss: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are not persisted to local storage and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the loss of guest waypoints.
- Cannot confirm: The exact point of failure in the `mapStore`'s manual persistence implementation for `sessionWaypoints`.
- Root cause: The manual `IIFE + write` pattern for `sessionWaypoints` (task-002) is not functioning correctly, or `ee_guest_waypoints` is not being written to or read from correctly.
- User impact: Guests lose any waypoints they create, making the guest experience frustrating and preventing them from experiencing a core feature.
- Business impact: Prevents guest users from experiencing core functionality, hindering conversion to authenticated users.
- Fix direction: Debug and re-implement the manual persistence for `sessionWaypoints` to ensure `ee_guest_waypoints` is correctly updated in localStorage.

## Tier Comparison

- **V13 (Learn Tab State Loss):** The `guest V13` and `free V13` tests both passed, and their `state-loss-evidence` annotations show identical "before" and "after" header stats. This indicates that the Learn tab state (specifically, header stats) *persisted* correctly across tab switches for both guest and free users, meaning V13 is currently *fixed*.
- **V7 (Theme Resets):** The `guest V7` and `free V7` tests both failed, showing the theme resetting to 'dark' after reload. This identical behavior across both tiers indicates the root cause of theme preference loss is independent of authentication status.
- **Offline App Loading (V10, V2):** The app completely failed to load offline for the Pro tier. This is a fundamental issue likely affecting the Free tier as well, as it pertains to the core application shell and initial data loading, not specific Pro features.
- **Waypoint Save Button Disabled (P3, V3, V14):** This issue was observed in the Pro tier. Given it's a GPS acquisition problem, it is highly probable to affect all tiers capable of saving waypoints.
- **GPS Track Loss (V1), Track Save Offline (V4), Route Save Offline (V6):** These data loss vulnerabilities were confirmed for the Pro tier. As they relate to core tracking and routing features, they are highly likely to affect all tiers that use these features.
- **Free Users Misled by Camera Button (F3):** This issue is specific to the Free tier, as it involves the gating logic for a Pro-only feature.
- **Guest Waypoints Lost (V11):** This issue is specific to the Guest tier, as it concerns the persistence of waypoints for unauthenticated users.
- **Active Module Resets (V15):** This issue was confirmed for the Guest tier. As `activeModule` is a core `moduleStore` state, it is likely to affect all tiers.

## Findings Discarded

- **`guest V9` (Basemap resets to satellite on reload) and `free V8` (Layer preferences reset to defaults on reload):** These findings were discarded due to lower confidence (both failed with a `Test timeout` rather than a direct assertion failure) and lower user impact compared to the confirmed data loss issues. While likely real preference loss, they are less critical than losing user-generated data.
- **`guest V15` (activeModule defaults to prospecting on reload):** This finding was confirmed but discarded from the top 8 due to its relatively low user impact (minor annoyance of re-selecting a module) compared to critical data loss and app functionality issues.
- **`pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap):** This test failed with a timeout, making the evidence ambiguous. It's unclear if the UpgradeSheet *was* shown (a bug) or if the test simply got stuck. Given the ambiguity and higher priority of other issues, it was discarded.
- **`free F2` (LayerPanel renders PRO badges for free user):** This test passed and confirmed the expected behavior for free users (seeing PRO badges to encourage upgrade). This is not a UX issue but a feature working as intended.

## Cannot Assess

- The exact visual evidence for the *lack* of a user-facing toast for `pro V6` (route save offline) could not be directly assessed from the test annotations, although `STATE_MAP.md` confirms the silent failure.

## Systemic Patterns

-   **Pervasive Persistence Failures:** A significant number of state and preference fields (GPS track, guest waypoints, theme, active module, and likely basemap/layer visibility) are failing to persist across reloads. This points to a systemic issue with either the implementation of Zustand's `persist` middleware or the manual `localStorage` patterns across `userStore`, `mapStore`, and `moduleStore`.
-   **Critical Offline-First Deficiencies:** The application fundamentally fails to operate offline, from initial app load to saving user-generated data (waypoints, tracks, routes). This indicates a complete absence of an offline-first strategy, including robust Service Worker caching for the app shell and critical data, and local data queues for writes.
-   **GPS Acquisition Instability:** The consistent "Acquiring GPS..." state preventing waypoint saves suggests a core issue with the app's GPS integration or how it handles location data, potentially exacerbated by the Playwright mock environment.

## Calibration Notes

-   This run reinforced the importance of distinguishing between a test "passing" and a "vulnerability being confirmed." For V1, V11, V15, and V4, the tests passed *because* they successfully demonstrated the vulnerability (e.g., data was lost as expected). Conversely, for V13, the test passed because the state *did not* regress, indicating a fix.
-   Prioritized critical app loading failures and confirmed data loss issues (V1, V4, V6, V11) over preference loss (V7) and ambiguous timeouts (V9, V8).
-   Leveraged `STATE_MAP.md` as the definitive source of truth for silent failures (V6) when test annotations were inconclusive about the *absence* of a UI element (like a toast).
-   Recognized that `ERR_INTERNET_DISCONNECTED` during `page.goto` signifies a higher-level failure (app not loading) rather than a specific feature bug, placing it at the top of the priority list.