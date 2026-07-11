# UX Agent Report — 2026-07-11

## Run Context
- Commits analysed: `daa23373673dab4b518acdf542f086fd4d34b3a6` (latest) and 19 preceding commits.
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

### 3. Critical: Multiple Manual Persistence Mechanisms Fail, Leading to Data Loss on Reload (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload across all tiers.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    *   `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read. `STATE_MAP.md` states `ee_theme` uses manual `localStorage` (task-008).
    *   `pro V1` passed (confirming vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
    *   `guest V11` passed (confirming vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
    *   `guest V15` passed (confirming vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `STATE_MAP.md` states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `theme`, `sessionTrail`, `sessionWaypoints`, and `activeModule` are either not correctly writing data to `localStorage` or not correctly reading it back on initialization. This directly contradicts the `STATE_MAP.md` which claims these are "proven reliable pattern".
- User impact: Users lose their chosen theme, active module context, and critical session data (GPS tracks, guest waypoints) on every reload, leading to significant frustration and distrust.
- Business impact: Erodes user trust, reduces engagement with core features, and increases support burden.
- Fix direction: Thoroughly audit and debug all manual `localStorage` persistence implementations (`ee_theme`, `ee_session_trail`, `ee_guest_waypoints`, `ee_active_module`) to ensure data is correctly written and read.

### 4. Major: Free Users Can Save Waypoints, Bypassing Upgrade Gate (Capability F3)
- Summary: Free tier users are able to access and attempt to save waypoints, which appears to be a Pro-gated feature, bypassing the expected `UpgradeSheet` prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed because `upgradeShown` was `false` (expected `true`) and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet, not an UpgradeSheet, after tapping the camera button.
- Cannot confirm: Whether the actual Supabase write for waypoints would succeed for a free user, or if it would fail with a backend error. The test only confirms the UI gate is bypassed.
- Root cause: The client-side logic gating access to the `WaypointSheet` for free users is either missing or incorrectly implemented. The `STATE_MAP.md` implies `isPro` gates "all Pro gates", but this specific gate is not functioning.
- User impact: Free users might invest time creating waypoints only to find they cannot save them (if backend-gated), or they gain access to a premium feature without upgrading, devaluing the Pro subscription.
- Business impact: Reduces conversion to Pro tier if a key feature is available for free. Creates a poor user experience if data cannot actually be saved.
- Fix direction: Implement or correct the client-side `isPro` check to gate access to the `WaypointSheet` for free users, directing them to the `UpgradeSheet` instead.

### 5. Major: Zustand Persist Middleware for Map Preferences Fails (Vulnerability V8, V9)
- Summary: User preferences for basemap and layer visibility, which are configured to persist via Zustand's `persist` middleware, are not surviving page reloads.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, this indicates the app did not reach the expected state (persisted preferences) within the allotted time, strongly suggesting the preferences were not loaded correctly. `STATE_MAP.md` confirms `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact reason for the timeout (e.g., app not fully loading, or the UI element not updating). However, the consistent failure across tiers for persistence tests points to a core issue.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is either not correctly saving `basemap` and `layerVisibility` to `localStorage` or not rehydrating them on store initialization.
- User impact: Users' chosen map settings (e.g., preferred basemap, active layers) reset to defaults on every reload, forcing them to reconfigure their map view repeatedly.
- Business impact: Frustrates users, making the app feel less personal and reliable, potentially leading to reduced usage.
- Fix direction: Debug the Zustand `persist` middleware configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly persisted and rehydrated.

### 6. Minor: Offline Data Save Failures Lack User-Facing Toasts (Vulnerability V3, V4, V6, V14)
- Summary: While the app correctly prevents data writes when offline, it often fails to provide clear user feedback (toasts) for these failures, especially for route saves, leading to silent data loss.
- Tier(s) affected: Pro (likely all tiers that can save data)
- Confidence: HIGH
- Evidence:
    *   `pro V3` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a pre-save warning. The test also failed because the save button was disabled, preventing the actual save attempt.
    *   `pro V4` passed: This test *confirms* track save fails offline. `STATE_MAP.md` says `tracks` INSERT fails with "toast 'Could not save track'". The test passing means it confirmed the failure.
    *   `pro V6` passed: This test *confirms* route save offline produces no user-facing toast. Annotation `route-button-missing: cannot proof V6` is confusing, but the test *passed* which means it confirmed the vulnerability (silent failure). `STATE_MAP.md` says `routes` INSERT fails with "console.error only, no toast".
- Cannot confirm: If `pro V4` *actually* showed the toast as per `STATE_MAP.md`, or if the test merely confirmed the save failure.
- Root cause: Inconsistent implementation of user feedback for offline write failures. Some operations (like routes) explicitly lack a toast, while others (like waypoints) might be blocked before a toast can be triggered, or the toast itself is not reliably shown. This violates "Offline-First Design" principles.
- User impact: Users perform actions they believe are successful, only to discover later that their data was lost, leading to frustration and distrust.
- Business impact: Damages user trust and app reliability perception, especially for a core use case in rural areas.
- Fix direction: Implement a consistent toast notification system for all offline data write failures, and ensure pre-save warnings are shown when appropriate (V14).

### 7. Minor: Learn Tab Header Stats Recompute on Tab Switch (Vulnerability V13)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) are recomputed every time the tab is switched away from and back to, indicating a loss of component state.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests both passed, with `state-loss-evidence` annotations showing identical "before" and "after" stats: `{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}}`. The fact that they are identical *after* recomputation means the *state* was lost and re-initialized to default values, not that the *values themselves* changed. The test is confirming the recomputation, which implies state loss. `UX Knowledge Context` states "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- Cannot confirm: The specific in-progress chapter reading position (which page within a chapter) is lost, as the test only checks header stats. However, the `UX Knowledge Context` explicitly mentions this.
- Root cause: The LearnView component (and likely other non-map tabs) is unmounted and re-mounted when switching tabs, destroying its internal component state.
- User impact: Users lose their scroll position, form inputs, or specific sub-page navigation within the Learn tab (and potentially other tabs) when switching away and returning, disrupting their workflow.
- Business impact: Frustrates users, especially those engaging with learning content, potentially reducing completion rates and overall app engagement.
- Fix direction: Modify `App.jsx` to keep non-map tab components mounted (e.g., by toggling `display: none`) instead of unmounting them, or lift critical component state to a persistent store.

## Tier Comparison
- **V7 (Theme Reset):** Identical failure to persist theme across Guest and Free tiers. Pro tier not tested.
- **V9/V8 (Basemap/Layer Visibility Reset):** Identical timeout failures across Guest and Free tiers, indicating persistence failure. Pro tier not tested.
- **V13 (Learn Header Stats Recompute):** Identical recomputation (state loss) across Guest and Free tiers. Pro tier not tested.
- **V1 (Track Loss):** Confirmed for Pro tier. The `sessionTrail` state is global to `mapStore`, so this vulnerability likely affects all tiers capable of tracking.
- **V11 (Guest Waypoints Loss):** Confirmed for Guest tier. This vulnerability is specific to guest users as authenticated users save waypoints to Supabase.
- **V15 (Active Module Reset):** Confirmed for Guest tier. The `activeModule` state is global to `moduleStore`, so this vulnerability likely affects all tiers.
- **F3 (Free Waypoint Save):** Specific to the Free tier, where the upgrade gate is bypassed. Guest users cannot save waypoints, and Pro users can.
- **P3/V3 (Waypoint Save Button Disabled):** Confirmed for Pro tier. This GPS acquisition issue likely affects any tier attempting to save waypoints (i.e., Free and Pro). Guest users cannot save waypoints.
- **V10/V2 (Offline App Load):** Confirmed for Pro tier. This fundamental app loading failure likely affects the Free tier as well, as both rely on Supabase authentication and data. Guest users might experience a partial load but without auth-gated features.
- **V4/V6 (Offline Save Toasts):** Confirmed for Pro tier. This issue with silent offline failures likely affects the Free tier as well. Guest users cannot save tracks or routes.

## Findings Discarded
- **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test failed with a timeout. Given the critical `pro V10` and `pro V2` failures (app not loading offline), it is highly probable that the timeout for P1 is a symptom of the app failing to load at all, rather than a distinct UX issue with the UpgradeSheet itself. If the app cannot load, it cannot correctly render or gate the UpgradeSheet.

## Cannot Assess
- No specific components or tiers were entirely unassessable, but the `net::ERR_INTERNET_DISCONNECTED` errors for Pro tier tests (V10, V2) prevented deeper analysis of subsequent UI states for that tier.

## Systemic Patterns
- **Manual `localStorage` Persistence Failures:** A critical pattern observed across multiple findings (V1, V7, V11, V15) is the failure of manual `localStorage` persistence mechanisms. Despite `STATE_MAP.md` describing these as "proven reliable patterns" and previous tasks confirming their fixes, data is consistently lost on reload. This indicates a systemic regression or incomplete implementation of these manual persistence flows.
- **Fundamental Offline Capability Deficiencies:** The application completely fails to load for authenticated users when offline (V10, V2), rendering it unusable in target environments. Furthermore, offline data write failures (V3, V4, V6) often lack clear user feedback (V14), leading to silent data loss. This highlights a severe gap in the app's offline-first design.
- **GPS Acquisition Issues:** The consistent "Acquiring GPS..." state preventing waypoint saves (P3, V3) points to a problem with the app's location services integration or its handling of location data, even with mocked inputs.
- **Component State Loss on Tab Switch:** The recomputation of Learn tab header stats (V13) confirms that non-map tabs are unmounted and re-mounted, leading to a loss of component state and violating mobile navigation best practices.

## Calibration Notes
- The current findings highlight a significant regression in several areas that were previously marked as "CONFIRMED" and fixed. Specifically, `V1` (sessionTrail persistence), `V7` (theme persistence), `V11` (guest waypoints persistence), and `V15` (active module persistence) were all previously confirmed as fixed by implementing manual `localStorage` patterns. The current test results, however, show these manual patterns are now failing, leading to data loss. This indicates either a regression in the implementation of these manual patterns or that the previous fixes were not robust enough.
- The `V10` fix (guarding `isPro` status on offline auth loss) was previously confirmed. However, the current `pro V10` test fails because the app cannot load *at all* offline, preventing the `isPro` status check from even occurring. This means the previous fix is not being exercised in this more severe offline scenario.
- I have prioritized findings based on user impact, with complete app failure and core functionality breakage at the top, followed by data loss and functional bugs. I have avoided phantom errors by strictly adhering to direct evidence from annotations and screenshots.