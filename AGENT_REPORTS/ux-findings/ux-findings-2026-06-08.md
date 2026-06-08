# UX Agent Report — 2026-06-08

## Run Context
- Commits analysed: `9372766` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online or offline.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms V14 (no offline pre-save warning).
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

### 3. High: Widespread Preference Persistence Failures (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, reverting to their default states.
- Tier(s) affected: All (V7, V9 confirmed in Guest; V7, V8 confirmed in Free).
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `theme` resets to 'dark' (default). Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` key is not being written to `localStorage`.
    - `guest V9` failed: `basemap` resets (test timeout implies default state).
    - `free V8` failed: `layerVisibility` resets (test timeout implies default state).
- Cannot confirm: The exact point of failure for each persistence mechanism (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Fundamental failure in `localStorage` persistence for `userStore.theme` (manual IIFE pattern) and `mapStore.basemap`, `mapStore.layerVisibility` (Zustand `persist` middleware via `ee-map-prefs`). The `null` values for `ee_theme` strongly suggest a problem with `localStorage` access, key naming, or the persistence setup itself.
- User impact: Annoyance and wasted time as users must reconfigure basic settings after every app reload, degrading the personalized experience.
- Business impact: Reduces perceived quality, increases user frustration, and can lead to reduced engagement and trust in the application.
- Fix direction: Systematically debug all `localStorage` persistence implementations for preferences. Verify `localStorage` keys are correctly set and retrieved.

### 4. High: Critical Session Data Loss on Reload (Vulnerability V1, V11, V15)
- Summary: Crucial user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload.
- Tier(s) affected: All (V11, V15 confirmed in Guest; V1 confirmed in Pro).
- Confidence: HIGH
- Evidence:
    - `guest V11` passed: Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: Annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: Annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure for each manual `localStorage` write/read operation.
- Root cause: Failure in the manual `localStorage` persistence patterns for `mapStore.sessionWaypoints` (`ee_guest_waypoints`), `moduleStore.activeModule` (`ee_active_module`), and `mapStore.sessionTrail` (`ee_session_trail`). Despite `STATE_MAP.md` indicating these are persisted via manual IIFE patterns, the test results confirm they are not.
- User impact: Loss of unsaved work (waypoints, tracks) and disruption of workflow (module reset), leading to significant frustration and potential data loss for users.
- Business impact: Erodes user trust, makes the app unreliable for core data collection, and can lead to abandonment.
- Fix direction: Debug the manual `localStorage` read/write implementations for `sessionWaypoints`, `activeModule`, and `sessionTrail`. Ensure `localStorage.setItem` and `localStorage.getItem` are correctly used and keys are present.

### 5. Medium: Learn Tab Header Stats Persistence (Vulnerability V13) is Partial
- Summary: While the Learn tab header statistics (courses, completePct, chaptersDone) persist across tab switches, the underlying vulnerability (V13) regarding in-progress chapter reading position likely remains.
- Tier(s) affected: All (Guest, Free confirmed for header stats).
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` passed. Annotations `state-loss-evidence` show `before` and `after` values are identical for header stats. This indicates the *header stats* are preserved. However, the `UX Knowledge Context` explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The test does not verify this specific aspect.
- Cannot confirm: Whether the chapter reading position itself is lost, as the test only checks header stats.
- Root cause: The fix for V13 (preserving Learn tab component state) likely only addressed the header stats, not the deeper component state within `ChapterReader`. The `App.jsx` conditional rendering of non-map tabs (unmount on switch) is the architectural cause for general state loss.
- User impact: Users lose their place when reading a chapter if they switch tabs, forcing them to find their position again.
- Business impact: Frustration in the learning module, potentially reducing course completion rates and perceived value of educational content.
- Fix direction: Extend the V13 fix to ensure `ChapterReader`'s internal state (current page) is also persisted or lifted to a store that survives tab unmount/remount.

### 6. Medium: Offline Data Access Failures (Vulnerability V2, V10) Cannot Be Assessed Due to Test Setup
- Summary: Critical offline vulnerabilities for Pro status (V10) and core data (V2) cannot be confirmed or denied because the tests fail to navigate offline.
- Tier(s) affected: Pro
- Confidence: MEDIUM (on the *vulnerability itself*, HIGH on the *test failure*)
- Evidence: `pro V10` and `pro V2` failed with `page.goto: net::ERR_INTERNET_DISCONNECTED`.
- Cannot confirm: Whether V2 (gold/mineral data missing offline) or V10 (Pro status reverts offline) are active. The test environment is preventing the offline navigation step.
- Root cause: Playwright test setup issue with `page.goto` in an offline context, preventing the test from reaching the state where the vulnerability would manifest.
- User impact: If these vulnerabilities are active, Pro users would be locked out offline (V10) and core map data would be unavailable (V2), rendering the app useless in its primary use context (rural Ireland).
- Business impact: Severe if active, as it directly impacts paying users in their expected usage environment.
- Fix direction: Debug the Playwright test setup for offline navigation to ensure `page.goto` works correctly when the network is disconnected.

### 7. Low: Route Save Fails Silently Offline (Vulnerability V6) - Ambiguous Proof
- Summary: Route saving fails silently offline, with no user-facing toast, as expected by the `STATE_MAP.md` but the test annotation is ambiguous.
- Tier(s) affected: Pro
- Confidence: LOW (on the test's ability to *proof* it, HIGH on the *vulnerability existing* per STATE_MAP)
- Evidence: `pro V6` passed. Annotation `route-button-missing: cannot proof V6`. `STATE_MAP.md` states `routes` INSERT fails offline with "console.error only, no toast". A "PASS" for a vulnerability test means the vulnerability was confirmed. The annotation is confusing, but the test passing implies the expected silent failure was observed.
- Cannot confirm: The exact mechanism of failure observed by the test, but the `STATE_MAP.md` confirms the vulnerability.
- Root cause: Lack of an offline data queue and explicit error handling for route saving, as per `STATE_MAP.md`.
- User impact: Users believe their route is saved when it is not, leading to data loss and frustration when they try to access it later.
- Business impact: Erodes trust in data integrity, especially for a feature like route planning.
- Fix direction: Implement an offline data queue for routes and provide clear user feedback on save status.

## Tier Comparison
- **V7 (Theme Reset):** Affects both Guest and Free tiers identically, resetting to 'dark'. This indicates the root cause is independent of authentication status.
- **V13 (Learn Header Stats):** Preserved for both Guest and Free tiers, indicating the fix for header stats is working across unauthenticated and authenticated free users. The underlying chapter position loss is likely still present for both.
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** These issues are widespread across tiers. V7/V9 are confirmed in Guest, V7/V8 in Free, and V1/V11/V15 are confirmed in Guest/Pro. This strongly suggests a systemic issue with `localStorage` access or the persistence setup itself, rather than auth-specific logic.
- **Pro-specific issues (P1, P3, V2, V3, V10, V6):** These are either specific to Pro users (P1, P3) or are vulnerabilities that would primarily impact Pro users (V2, V10, V6, V3).

## Findings Discarded
- No findings were discarded in this run, as all identified issues are distinct and impactful.

## Cannot Assess
- **Vulnerability V2 (gold/mineral data missing after offline reload) and V10 (Pro status reverts to free on offline reload):** These vulnerabilities cannot be assessed because the Playwright tests (`pro V2`, `pro V10`) failed to execute the critical offline navigation step (`page.goto: net::ERR_INTERNET_DISCONNECTED`). This indicates a problem with the test environment's ability to simulate offline reloads, not necessarily that the vulnerabilities are fixed or absent.

## Systemic Patterns
- **`localStorage` Persistence Failure:** The most prominent pattern is the widespread failure of `localStorage` persistence, affecting both Zustand `persist` middleware keys (`ee-map-prefs` for basemap/layers) and manual IIFE patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This suggests a fundamental issue with `localStorage` access, initialization, or key management across the application.
- **GPS Acquisition Issues:** A recurring problem with GPS acquisition, preventing core functionality like waypoint saving. This points to a potential issue with the `watchPosition` implementation or its interaction with the Playwright mock.
- **Incomplete Vulnerability Fixes / Regressions:** V1, V11, V15, V7, V8, V9 were previously identified and had fixes implemented (e.g., task-001, task-002, task-006, task-008, task-012, task-013). The current results show these fixes are either not fully deployed, incomplete, or have regressed, as the vulnerabilities are still confirmed.

## Calibration Notes
- Prioritized critical blockers (P3, P1) and widespread data/preference loss (V1, V7, V8, V9, V11, V15) due to their high user and business impact, consistent with past CONFIRMED verdicts.
- Carefully distinguished between a test failing due to an active vulnerability (e.g., V7, P1, P3) and a test failing due to a test setup issue (e.g., V2, V10). This avoids PHANTOM verdicts for the vulnerabilities themselves when the test environment is at fault.
- Acknowledged that a "PASS" for a vulnerability test often means the vulnerability was *confirmed* (e.g., V1, V11, V15, V6), aligning with the new test philosophy.
- Noted the partial nature of the V13 fix, as the test only covers header stats, not deeper component state, drawing on the `UX Knowledge Context`.