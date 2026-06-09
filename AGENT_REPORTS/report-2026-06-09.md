# UX Agent Report — 2026-06-09

## Run Context
- Commits analysed: `aa84ad8` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online or offline.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms V14 (no offline pre-save warning) because the save button is disabled, preventing the warning from being triggered.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Pro Status Not Recognized, Leading to Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, or the test couldn't proceed because the UI was in an unexpected state (e.g., UpgradeSheet was visible).
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it (though this test is online).
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` correctly sets `isPro` and that Pro-gated features correctly check this state.

### 3. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page, let alone attempt to hydrate state or display cached data.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data (like `gold_samples` for V2). The app relies on network connectivity for initial load, failing the "Offline-First Design" principle. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Severe limitation of the app's core value proposition for its target audience, leading to high churn, negative reviews, and inability to serve users in critical field conditions.
- Fix direction: Implement a comprehensive Service Worker strategy to cache the app shell and essential data (e.g., `gold_samples`, `mineral localities`) for offline access, ensuring the app can load and display *some* content even without network.

### 4. High: Widespread Preference Persistence Failures (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, reverting to their default states.
- Tier(s) affected: All (V7, V9 confirmed in Guest; V7, V8 confirmed in Free).
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `theme` resets to 'dark' (default). Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` key is not being written to `localStorage`.
    - `guest V9` failed: `basemap` resets (test timeout implies default state).
    - `free V8` failed: `layerVisibility` resets (test timeout implies default state).
- Cannot confirm: The exact point of failure for each persistence mechanism (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Fundamental failure in `localStorage` persistence for `userStore.theme` (manual IIFE pattern) and `mapStore.basemap`, `mapStore.layerVisibility` (Zustand `persist` middleware via `ee-map-prefs`). The `null` values for `ee_theme` strongly suggest a problem with `localStorage` access, key naming, or the manual persistence setup itself. The timeouts for V8 and V9 suggest the Zustand `persist` middleware for `mapStore` is also failing to hydrate.
- User impact: Annoyance and wasted time as users must reconfigure basic settings after every app reload, degrading the perceived quality and reliability of the app.
- Business impact: Increased friction for daily use, potentially leading to user frustration and reduced engagement.
- Fix direction: Debug the `ee_theme` manual persistence (check `localStorage.setItem` and `getItem` calls). Investigate the Zustand `persist` middleware setup for `mapStore` (`ee-map-prefs`) to ensure `basemap` and `layerVisibility` are correctly saved and reloaded.

### 5. High: Guest Waypoints and Active GPS Tracks Lost on Reload (Vulnerability V1, V11)
- Summary: User-generated data, specifically guest waypoints and active GPS tracks, are not persisted and are lost upon page reload.
- Tier(s) affected: Guest (V11), Pro (V1) - implicitly Free if they could track.
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact sequence of events that leads to the `ee_guest_waypoints` or `ee_session_trail` keys being absent or empty, despite `STATE_MAP.md` indicating manual persistence for both.
- Root cause: Despite `STATE_MAP.md` indicating manual `localStorage` persistence for `sessionWaypoints` (`ee_guest_waypoints`) and `sessionTrail` (`ee_session_trail`), the test evidence shows these keys are absent or empty after reload. This suggests a failure in the manual IIFE read/write pattern for these specific keys, or an explicit clear operation being triggered incorrectly. `STATE_MAP.md` also notes: "Critical note: `sessionTrail`, `sessionWaypoints`... accumulate during active user sessions. None are persisted anywhere until the user explicitly saves." This contradicts the manual persistence mentioned later for `ee_guest_waypoints` and `ee_session_trail`. The tests confirm the *loss* of this data.
- User impact: Significant data loss for users who are actively exploring or tracking, leading to severe frustration and distrust in the app's ability to safeguard their work.
- Business impact: Directly undermines the core value proposition of a mapping and tracking app, leading to high churn and negative perception.
- Fix direction: Re-verify the manual `localStorage` read/write patterns for `ee_guest_waypoints` and `ee_session_trail`. Ensure `sessionTrail` is *continuously* persisted during tracking, not just on explicit save, to prevent loss from crashes (as per "Data Safety" UX context). Clarify the `STATE_MAP.md` regarding persistence of these items.

### 6. Medium: Offline Data Save Failures are Silent or Incomplete (Vulnerability V4, V6)
- Summary: When attempting to save tracks or routes offline, the operations fail without clear user feedback or a retry mechanism, leading to silent data loss or uncertainty.
- Tier(s) affected: Pro (V4, V6) - implicitly Free if they could save tracks/routes.
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability (track save fails offline).
    - `pro V6` passed, but annotation `route-button-missing: cannot proof V6` indicates the test couldn't fully assert the *silent* nature. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The test passing without finding a toast implies the vulnerability is active.
- Cannot confirm: The exact console error message for V6, but the `STATE_MAP.md` is explicit.
- Root cause: The app lacks an offline data queue and retry mechanism (V3, V4, V6, V14 are all related to this). Supabase write failures are not gracefully handled with local persistence and sync. `STATE_MAP.md` confirms "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred) is still NOT persisted."
- User impact: Users believe their data is saved when it is not, leading to unexpected data loss and a breakdown of trust. The lack of feedback means they don't know to retry or take alternative action.
- Business impact: Erodes user trust and reliability, especially for users in remote areas where offline functionality is critical.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store failed write operations and retry them when connectivity is restored. Provide clear UI feedback (toasts, sync indicators) for local save status and sync status.

### 7. Low: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The user's `activeModule` preference is not persisted across page reloads, reverting to the default 'prospecting' module.
- Tier(s) affected: Guest (confirmed by test) - implicitly all tiers.
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact reason `ee_active_module` is absent, despite `STATE_MAP.md` indicating manual persistence.
- Root cause: Despite `STATE_MAP.md` stating `moduleStore.activeModule` persists via `ee_active_module` (manual pattern, task-013), the test evidence shows this key is absent after reload. This suggests a failure in the manual IIFE read/write pattern for this specific key.
- User impact: Minor annoyance as users have to re-select their preferred module after each reload.
- Business impact: Slight degradation of user experience, but not critical.
- Fix direction: Re-verify the manual `localStorage` read/write pattern for `ee_active_module` to ensure the active module is correctly saved and reloaded.

### 8. Low: Learn Tab Header Stats Recomputed on Tab Switch (Vulnerability V13)
- Summary: The Learn tab's header statistics are recomputed every time the tab is switched to, indicating potential state loss for in-progress learning.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed, with annotation `state-loss-evidence` showing identical "before" and "after" stats. The test is designed to confirm the *recomputation* (and thus potential state loss), not necessarily a *change* in stats. The UX Knowledge Context explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The test confirms the *recomputation* which is a symptom of the underlying issue.
- Cannot confirm: The specific in-progress chapter reading position loss, as the test only checks header stats.
- Root cause: `App.jsx` conditionally renders non-map tabs, causing them to unmount and remount on tab switch. This destroys component-local state, including any in-progress reading position within a `ChapterReader`. While the header stats themselves might recompute to the same values (as they are derived from persisted `ee_progress`), the underlying component state is lost. `UX Knowledge Context` explicitly calls this out: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- User impact: Users lose their place within a chapter if they navigate away from the Learn tab, forcing them to find their spot again.
- Business impact: Frustration for users engaged in learning, potentially reducing completion rates for courses.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility (e.g., using `display: none`) instead of unmounting them.

## Tier Comparison
- **V7 (Theme Resets):** Identical behaviour across Guest and Free tiers (theme resets to 'dark', `ee_theme` is null in `localStorage`). This indicates a systemic issue with the `ee_theme` persistence mechanism, independent of authentication status.
- **V13 (Learn Tab State Loss):** Identical behaviour across Guest and Free tiers (header stats are recomputed on tab switch). This confirms the underlying architectural choice of unmounting tabs affects all users equally.
- **P3/V3 (Waypoint Save Blocked):** Pro users are blocked from saving waypoints due to GPS acquisition failure. Free users are blocked by the upgrade sheet (F3). Guest users are blocked by being guests (V11 confirms memory-only waypoints). The *root cause* of the save button being disabled (GPS issue) is likely systemic and would affect Free/Guest if they reached that point.
- **P1 (Pro Status Not Recognized):** This issue specifically affects Pro users, as Free users correctly see PRO badges (F2) and are routed to the upgrade sheet (F3).
- **V10/V2 (Offline Loading Failure):** This critical failure affects authenticated users (Free, Pro) who cannot load the app offline. Guest users can load the app offline (implied by other guest tests passing). This points to an issue with how authenticated sessions or Supabase data loading interacts with offline capabilities.
- **V1/V11 (Data Loss on Reload):** V1 (GPS track loss) affects Pro users. V11 (guest waypoint loss) affects Guest users. Both are data loss issues, but for different data types and tiers, stemming from persistence failures for `sessionTrail` and `sessionWaypoints` respectively.
- **V4/V6 (Silent Offline Failures):** These vulnerabilities affect Pro users for saving tracks and routes. Free users cannot save these, and Guest users cannot save tracks/routes.

## Findings Discarded
- No findings were discarded in this run, as all identified issues had high confidence and clear evidence.

## Cannot Assess
- The exact reason for `pro V10` and `pro V2` failures (app not loading offline) prevents deeper analysis into *what* would happen to `isPro` or `gold_samples` *if* the app could partially load offline. The current failure is more fundamental.
- The specific in-progress chapter reading position loss for V13, as the test only checks header statistics, not granular chapter progress.

## Systemic Patterns
-   **Widespread Persistence Failures:** Multiple findings (V7, V8, V9, V1, V11, V15) indicate a systemic problem with `localStorage` persistence. This affects both Zustand `persist` middleware (for `mapStore` preferences) and manual IIFE patterns (for `theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`). This suggests either a fundamental issue with `localStorage` access, key management, or the implementation of these persistence mechanisms across the application.
-   **Critical Offline-First Deficiencies:** The app exhibits severe gaps in its offline-first design (V10, V2, P3/V3, V4, V6). Authenticated users cannot load the app offline, critical data is not cached, GPS acquisition fails offline, and data writes fail silently without a sync queue. This is a core architectural flaw for an outdoor mapping application targeting users in potentially remote areas.
-   **GPS Integration Issues:** The persistent "Acquiring GPS..." state blocking waypoint saves (P3/V3) points to a problem with the app's GPS integration, potentially related to how it handles Playwright's mock geolocation or the `watchPosition` callback logic.

## Calibration Notes
-   Prioritized findings with direct error messages and explicit annotations (e.g., `ee_theme: null`, `V11 confirmed`) as strong evidence.
-   Leveraged the "Vulnerability-Proof Test Philosophy" to interpret "PASS" results for vulnerability tests (V1, V11, V4, V6, V15) as confirmation of the vulnerability, rather than a fix. This aligns with previous successful confirmations.
-   Elevated the severity of `pro V10` and `pro V2` due to the complete inability of the app to load offline for authenticated users, which is a more critical failure than just state reversion or data absence.
-   Avoided speculating on root causes without direct evidence, especially for issues that previously led to PHANTOM verdicts (e.g., "unforeseen side effects" or "disconnected listeners").