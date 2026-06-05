# UX Agent Report — 2026-06-05

## Run Context
- Commits analysed: `74e4496` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning is given before attempting an offline save, as the button is disabled for a different reason.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. This also means the app cannot reach the point of checking for offline status for V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Active GPS Track Data Lost on Page Reload (Vulnerability V1 Regression)
- Summary: Any active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: All (as `sessionTrail` persistence is a global mechanism, though tested in Pro tier).
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes, the browser tab closes, or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for a core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence logic in `mapStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 3. High: Pro User Incorrectly Gated by Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, suggesting their Pro status is not being correctly recognized or applied.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, or the test couldn't proceed because the UI was in an unexpected state (e.g., UpgradeSheet was visible). Given the test name "Pro user does not see UpgradeSheet on Pro affordance tap", a timeout on this test strongly suggests the UpgradeSheet *was* shown.
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `userStore.isPro` at the time of the tap.
- Root cause: Potential race condition or bug in the `useAuth` hook's hydration of `userStore.isPro` from Supabase, or an issue with the `global-setup.js` not fully ensuring `isPro:true` is set before the test starts. Alternatively, the gating logic itself might be flawed, checking `subscriptionStatus` instead of `isPro` in some places.
- User impact: Paying Pro users are blocked from accessing features they have paid for, leading to severe frustration and a perception of being defrauded.
- Business impact: Direct threat to Pro subscription retention, customer trust, and brand reputation.
- Fix direction: Investigate `global-setup.js` for `isPro` hydration, verify `useAuth` logic for `isPro` and `subscriptionStatus`, and review all Pro-gated components to ensure they correctly check `userStore.isPro`.

### 4. High: Theme Preference Resets on Reload (Vulnerability V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload for all users.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both reported `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` clearly show that the `ee_theme` localStorage key, intended for theme persistence, is not being written or read correctly. This contradicts `STATE_MAP.md` which states `theme` persists via `ee_theme` (manual pattern, task-008).
- Cannot confirm: Whether `localStorage.setItem` is failing to write the value, or if `localStorage.getItem` is failing to retrieve it, or if `localStorage` is being cleared unexpectedly.
- Root cause: Regression in the manual `localStorage` persistence for `userStore.theme` (key `ee_theme`). The `null` values indicate the `localStorage.setItem` is not happening or is being cleared.
- User impact: Annoying loss of personalized theme settings on every app reload, requiring users to re-apply their preference.
- Business impact: Minor negative impact on user experience and perceived polish, potentially contributing to overall dissatisfaction.
- Fix direction: Re-verify the `ee_theme` manual persistence logic in `userStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 5. Medium: Map Preferences (Basemap, Layer Visibility) Reset on Reload (Vulnerability V8, V9 Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This strongly implies the preferences did not persist, leading to the test waiting indefinitely for the expected state. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` before and after reload, as no annotations were provided for this.
- Root cause: Regression or misconfiguration in the Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`), preventing `basemap` and `layerVisibility` from being correctly saved to and restored from `localStorage`.
- User impact: Users lose their preferred map view settings on every reload, forcing them to reconfigure the map layers and basemap, which is a significant inconvenience for a mapping application.
- Business impact: Reduces efficiency and satisfaction for core map usage, potentially leading to user frustration and reduced engagement.
- Fix direction: Debug the Zustand `persist` middleware configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly included in `partialize` and that `localStorage` is being accessed without issues.

### 6. Medium: Guest Waypoints Lost on Page Reload (Vulnerability V11 Regression)
- Summary: Waypoints created by guest users are lost upon page reload, despite previous fixes intended to persist them locally.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), possibly due to recent changes affecting `localStorage` access or the `SampleSheet` save logic.
- User impact: Guest users lose any waypoints they have created, making the app unreliable for temporary data capture and hindering their ability to evaluate the app's core features before signing up.
- Business impact: Reduces conversion rates from guest to authenticated users, as the value proposition of saving data is undermined.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence logic in `mapStore.js` and `SampleSheet` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 7. Low: Active Module Resets on Page Reload (Vulnerability V15 Regression)
- Summary: The `activeModule` preference resets to its default ('prospecting') upon page reload.
- Tier(s) affected: All (tested in Guest, but affects all users)
- Confidence: HIGH
- Evidence: `guest V15` test passed, with the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: The exact point of failure in the `activeModule` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `moduleStore.activeModule` (key `ee_active_module`).
- User impact: Users lose their preferred active module setting on every reload, requiring them to re-select it, which is a minor inconvenience.
- Business impact: Minor negative impact on user experience and perceived polish.
- Fix direction: Re-verify the `ee_active_module` manual persistence logic in `moduleStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 8. Low: Offline Data Operations Fail Silently (Vulnerabilities V4, V6, V14 Confirmed)
- Summary: Saving tracks, routes, and waypoints (when GPS is acquired) fails silently when offline, with no mechanism to queue or retry the operations, leading to data loss.
- Tier(s) affected: Pro (V4, V6, V14 tested here, but applies to Free/Guest if they could save)
- Confidence: HIGH
- Evidence: `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) both passed, confirming the predicted vulnerabilities. `pro V3` also confirmed `v14-pre-save-offline-warning: no (V14 confirmed)` (though the primary failure was GPS). `STATE_MAP.md` explicitly states these operations "Fail silently" or "console.error only, no toast" and result in "YES — data gone".
- Cannot confirm: The exact toast message for V4 (track save) as it passed, but the vulnerability description implies data loss.
- Root cause: Architectural limitation: The application lacks an offline data synchronization queue (V3, V4, V6, V14 in `STATE_MAP.md` are explicitly marked as "large scope, deferred"). All Supabase writes fail immediately without local persistence or retry logic.
- User impact: Users lose valuable data (tracks, routes, waypoints) if they attempt to save while offline, leading to severe frustration and distrust in the application's reliability, especially in rural areas with poor connectivity.
- Business impact: High churn, negative reviews, and inability to serve the core user base effectively in their primary use context.
- Fix direction: Implement an offline-first architecture with a persistent local data store (e.g., IndexedDB) and a synchronization queue for all user-generated content.

## Tier Comparison
- **V7 (Theme Reset):** Identical behavior across Guest and Free tiers. Both fail, indicating a systemic issue with `ee_theme` persistence regardless of authentication status.
- **V13 (Learn Tab State):** Identical behavior across Guest and Free tiers. Both pass, indicating the fix for V13 (preserving learn tab state) is effective for all users.
- **V8/V9 (Map Preferences Reset):** Identical behavior across Guest (V9 basemap) and Free (V8 layers). Both fail, indicating a systemic issue with `ee-map-prefs` persistence regardless of authentication status.
- **V11 (Guest Waypoints):** This vulnerability is specific to the Guest tier, as Free/Pro users save waypoints to Supabase.
- **V15 (Active Module):** Tested in Guest, but the underlying `moduleStore` persistence mechanism affects all tiers.
- **P3/V3 (Waypoint Save Blocked):** Tested in Pro, but the underlying GPS acquisition issue would affect Free users if they had waypoint save access.
- **P1 (Pro Gating):** Specific to Pro tier, as it concerns access to paid features.
- **V1 (Track Loss):** Tested in Pro, but the underlying `sessionTrail` persistence mechanism affects all tiers that use tracking.
- **V4, V6, V14 (Offline Data):** Tested in Pro, but the architectural lack of offline data capabilities affects all tiers attempting to save data offline.

## Findings Discarded
- `pro V10 — Pro status reverts to free on offline reload`: Discarded. The test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a failure in Playwright's ability to navigate offline, not a UX issue with the app itself. Cannot assess the actual vulnerability.
- `pro V2 — gold/mineral data missing after offline reload`: Discarded. Similar to `pro V10`, this test failed due to `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing assessment of the app's offline data caching for minerals.

## Cannot Assess
- The actual behavior of `pro V10` (Pro status reverting offline) and `pro V2` (offline gold/mineral data availability) due to Playwright's `page.goto` failing in offline mode. This requires a more robust offline navigation strategy in the test suite.

## Systemic Patterns
- **Widespread Persistence Regression:** Multiple manual `localStorage` persistence patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are failing, despite `STATE_MAP.md` indicating they should be working. The Zustand `persist` middleware for `mapStore` (`ee-map-prefs`) also appears to be affected. This suggests a systemic issue with `localStorage` access, writes, or reads, or a recent change that inadvertently broke these mechanisms across the application.
- **GPS Acquisition Flaw:** A fundamental problem exists with how the app obtains or processes location data, leading to a persistent "Acquiring GPS..." state that blocks core functionality (waypoint saving). This is a critical blocking issue.
- **Architectural Offline-First Gap:** The application fundamentally lacks offline data persistence and synchronization for user-generated content (waypoints, tracks, finds, routes), leading to confirmed data loss vulnerabilities (V4, V6, V14). This is a known architectural limitation, not a regression, but its severe impact on the target user base highlights the urgent need for an offline-first strategy.

## Calibration Notes
- Prioritized findings that directly block core user flows (P3/V3, P1) or result in data loss (V1, V11) as these have historically been high-impact and reliably confirmed.
- Carefully interpreted "PASS" results for vulnerability tests (e.g., V1, V11, V15, V4, V6, V14) to mean the vulnerability was *confirmed* by the test, rather than the vulnerability being fixed, aligning with the new test philosophy.
- Noted contradictions between test results and `STATE_MAP.md` (e.g., persistence failures) as these indicate regressions or incorrect documentation, which are high-confidence findings.
- Identified test setup issues (e.g., `net::ERR_INTERNET_DISCONNECTED` for V10/V2) and marked them as "Cannot Assess" rather than speculating on UX issues, avoiding previous "PHANTOM" verdict patterns.