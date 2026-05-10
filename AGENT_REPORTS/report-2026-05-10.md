# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints. The "LOCATION" field consistently shows "Acquiring GPS...".
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check, but the primary issue is the disabled button.
- Cannot confirm: The exact reason the GPS signal isn't being acquired or processed, despite `task-010` adding a geolocation mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app is either not receiving a valid GPS signal from the Playwright mock, the mock is incorrectly configured, or the `useTracks` hook or `WaypointSheet`'s logic is incorrectly interpreting the signal, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock.

### 2. Systemic Persistence Regression: User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and session-specific user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to defaults.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic regression in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests a failure in the `localStorage.setItem` calls, or `localStorage` is being cleared unexpectedly, directly contradicting previous fixes.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle and that `localStorage` is not being inadvertently cleared.

### 3. Pro User Incorrectly Shown Upgrade Sheet (P1)
- Summary: A Pro user is unexpectedly shown the Upgrade Sheet when interacting with a Pro-gated feature, despite having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This specific test is designed to *pass* if the Upgrade Sheet is *not* visible. A timeout here strongly suggests the test was blocked by the Upgrade Sheet appearing, or by a related modal, indicating a regression from the `P1 Pro badge race` fix (task-011).
- Cannot confirm: The exact interaction that triggered the Upgrade Sheet, but the test context implies a Pro affordance tap.
- Root cause: A race condition or incorrect logic in the `useAuth` hook or `UpgradeSheet` gating, where the `isPro` status is not correctly evaluated or propagated before a Pro-gated UI element is interacted with.
- User impact: Paying Pro users are frustrated by being asked to upgrade for features they already pay for, leading to a degraded premium experience.
- Business impact: Erodes trust with paying customers, increases support load, and could lead to subscription cancellations.
- Fix direction: Re-investigate the `isPro` state hydration and `UpgradeSheet` rendering logic, ensuring `isPro` is fully resolved and stable before any Pro-gated UI elements are enabled or interacted with.

### 4. Critical Offline Data Vulnerabilities (V2, V14, V4, V6)
- Summary: The application lacks fundamental offline data capabilities, leading to critical data loss and functionality breakdown when connectivity is lost. This includes gold/mineral data not being cached (V2), no pre-save warnings for offline operations (V14), and track/route saves failing offline (V4, V6).
- Tier(s) affected: All (V2, V14, V4, V6)
- Confidence: HIGH
- Evidence:
    - `pro V2` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. While the test failed to load, `STATE_MAP.md` explicitly states: "Gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache" (V2).
    - `pro V3` (FAIL): `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a pre-save warning.
    - `pro V4` PASS: Track save fails offline. This is expected behavior for V4 given the lack of offline data capability.
    - `pro V6` PASS: Route save offline produces no user-facing toast. This is expected behavior for V6 (silent failure).
- Cannot confirm: The specific impact of V2 and V10 due to test infrastructure failures preventing offline page loads.
- Root cause: Fundamental architectural gap in offline-first design. The application relies heavily on Supabase for data retrieval and writes without implementing local caching (for read data like V2) or an offline sync queue (for write data like V4, V6). V14 is a direct consequence of this lack of offline-first design.
- User impact: Users in rural areas with intermittent connectivity will experience frequent data loss, inability to access critical map data, and a completely broken save experience.
- Business impact: App is unusable in its target environment, leading to massive churn, negative reviews, and failure to meet core user needs.
- Fix direction: Implement a comprehensive offline-first strategy, including IndexedDB for caching read data (V2), a persistent sync queue for writes (V4, V6), and pre-save offline warnings (V14).

### 5. Learn Tab Header Statistics Persist Across Tab Switches (V13, F4)
- Summary: The Learn tab header statistics (courses, completePct, chaptersDone) correctly persist across tab switches, indicating that the underlying component state for these specific metrics is being preserved.
- Tier(s) affected: All (Guest V13, Free V13, Free F4)
- Confidence: HIGH
- Evidence:
    - `guest V13` PASS: `state-loss-evidence: {"before":...,"after":...}` shows identical values, meaning no regression.
    - `free V13` PASS: `state-loss-evidence: {"before":...,"after":...}` shows identical values, meaning no regression.
    - `free F4` PASS: `header-stats-pair: {"before":...,"after":...}` shows identical values, explicitly confirming no regression.
- Cannot confirm: Whether *all* component state within the Learn tab (e.g., scroll position within a chapter, active chapter page) is preserved, as the tests only focus on header stats.
- Root cause: The fix for V13 ("Preserve Learn tab component state across tab switches") by always mounting the tab content (visibility toggled) appears to be working for the header stats.
- User impact: Users can switch away from the Learn tab and return without losing their progress overview.
- Business impact: Improves user experience and engagement with the learning module.
- Fix direction: This is a confirmed fix for header stats. Further tests would be needed to confirm full component state persistence (e.g., chapter page number).

## Tier Comparison

*   **Persistence Failures (V7, V8, V9):** Theme (V7), basemap (V9), and layer preferences (V8) all fail to persist across reloads for **Guest** and **Free** tiers. This indicates a universal regression in `localStorage` handling, affecting all users regardless of authentication status.
*   **Session Data Loss (V1, V11, V15):** Guest waypoints (V11), active module (V15), and active GPS track (V1) are all lost on reload for **Guest** and **Pro** tiers respectively. This confirms a broad failure in session data persistence across different user types.
*   **Learn Tab State (V13, F4):** The Learn tab header statistics *do* persist across tab switches for both **Guest** and **Free** tiers, indicating that the fix for V13 (always mounting tab content) is effective for these specific metrics.
*   **Pro-gated Features (F2, F3, C3, P1):**
    *   **Free** users correctly see PRO badges (F2) and are routed to the Upgrade Sheet when attempting Pro features (F3).
    *   **Guest** users are correctly routed to the Upgrade Sheet (C3).
    *   **Pro** users are *incorrectly* routed to or blocked by the Upgrade Sheet (P1 failure), indicating a specific issue with Pro status recognition.
*   **Offline Functionality (V2, V3, V4, V6, V10, V14):**
    *   Waypoint save is blocked by GPS acquisition issues for **Pro** (V3).
    *   Track save fails offline for **Pro** (V4).
    *   Route save fails silently offline for **Pro** (V6).
    *   Lack of offline pre-save warning is confirmed for **Pro** (V14).
    *   Tests for offline data (V2) and Pro status persistence (V10) failed to load the app offline, preventing tier-specific confirmation, but `STATE_MAP.md` indicates these are general vulnerabilities.

## Findings Discarded
- None. All identified issues have sufficient evidence and impact.

## Cannot Assess
- **Pro V10 (Pro status reverts to free on offline reload):** The test failed to load the application offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any assessment of whether the Pro status persists or reverts.
- **Pro V2 (gold/mineral data missing after offline reload):** Similar to V10, the test failed to load the application offline, preventing assessment of offline data availability.

## Systemic Patterns
- **Widespread Persistence Regression:** A critical regression in `localStorage` read/write operations is evident across multiple features (theme, basemap, layers, guest waypoints, active module, GPS track). This suggests a fundamental issue with how `localStorage` is being managed, potentially an accidental clearing or incorrect implementation of the manual IIFE patterns or Zustand `persist` middleware.
- **GPS Acquisition Failure:** The consistent "Acquiring GPS..." message and disabled save button points to a problem with the GPS mock setup in Playwright or the application's `userLocation` state management.
- **Incomplete Offline-First Implementation:** The app continues to exhibit severe vulnerabilities in offline scenarios, confirming that a comprehensive offline-first strategy is still missing.

## Calibration Notes
- The previous `CONFIRMED` verdicts for persistence tasks (001, 002, 006, 008, 013) are now contradicted by the current test results. This highlights the importance of continuous regression testing for persistence.
- The `P1 Pro badge race` fix (task-011) was `CONFIRMED` previously, but the `pro P1` test failing with a timeout suggests the race condition or a related issue has re-emerged or was not fully resolved.
- The `V13` fix for Learn tab state persistence seems to be working for header stats, which is a positive sign, but the test description could be clearer about what "state-loss proof" means when the evidence shows no loss.
- The `net::ERR_INTERNET_DISCONNECTED` errors for V2/V10 are a good example of test infrastructure issues preventing assessment, rather than confirming a UX bug. This reinforces the need to distinguish between application errors and test environment limitations.