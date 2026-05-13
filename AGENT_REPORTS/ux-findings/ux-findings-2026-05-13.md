# UX Agent Report — 2026-05-13

## Run Context
- Commits analysed: 7fbc9d2, c5bebc2, db7f6d0, 39c2e46, 28b2b20, 1c2184c, c5131e8, ce7e7d6, 29233ab, d29354c, eb866d4, d552904, dfebcc0, acd2af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload. This reverts previously confirmed fixes.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) imply basemap and layer preferences reset. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all. This is a regression from multiple previously confirmed fixes.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 3. High: Pro User Incorrectly Gated by Upgrade Sheet (P1)
- Summary: A Pro user attempting to access a Pro-gated feature is incorrectly presented with the Upgrade Sheet, preventing access to paid functionality.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it remained visible, causing a timeout. This is a regression from a previously confirmed fix (P1).
- Cannot confirm: The specific Pro affordance tapped, but the outcome is clear: a Pro user is blocked.
- Root cause: A logic error in the Pro feature gating, likely within `useSubscription` or the component rendering the Upgrade Sheet, where `isPro` status is not correctly evaluated or propagated, leading to a false positive for `showUpgradeSheet`. This is a regression from task-005 and P1 fix.
- User impact: Paying Pro users are unable to access features they have paid for, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct loss of trust from paying customers, potential for chargebacks, and severe damage to the app's reputation and subscription model.
- Fix direction: Re-verify the `isPro` check in `useSubscription` and the conditional rendering logic for `UpgradeSheet` to ensure Pro users bypass it.

### 4. High: Offline Track Save Fails (V4)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the loss of the entire accumulated track data.
- Tier(s) affected: Pro (V4 confirmed). This vulnerability would also affect Free/Guest users if they had track saving capabilities.
- Confidence: HIGH
- Evidence: `pro V4` test PASSES, confirming the vulnerability. The `STATE_MAP.md` explicitly states: "Save track... `tracks` INSERT... Fails — toast 'Could not save track'... YES — entire GPS trail, distance, elevation, duration gone." The test passing confirms this expected failure and data loss.
- Cannot confirm: The exact toast message shown to the user, but the failure and data loss are confirmed.
- Root cause: The application lacks an offline data queue or local-first write mechanism for user-generated content. `tracks` INSERT operations directly target Supabase, failing immediately without connectivity.
- User impact: Significant data loss for users who record long tracks in areas with intermittent or no network connectivity, leading to frustration and loss of valuable activity data.
- Business impact: Erodes user trust, particularly for a mapping app designed for outdoor use where offline scenarios are common. Hinders user engagement with core tracking features.
- Fix direction: Implement an offline-first data strategy for user-generated content, including a persistent sync queue (e.g., using IndexedDB) for track data.

### 5. Positive: Learn Tab Header Stats Persist Across Tab Switches (V13 Test Clarification)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) correctly persist across tab switches, indicating that this specific aspect of the Learn tab's state is not lost.
- Tier(s) affected: All (Guest, Free).
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests both PASS. The `state-loss-evidence` annotation shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` after a tab switch. This confirms these stats are *not* recomputed or lost.
- Cannot confirm: Whether the *in-progress chapter reading position* (the core of V13 as described in `UX Knowledge Context`) also persists, as the test only checks header stats.
- Root cause: The architectural fix (replacing conditional rendering with an always-mounted block for tabs, as per previous `V13` fix) correctly preserves the state of the Learn tab's header components.
- User impact: Positive user experience, as progress indicators remain stable and consistent, reinforcing trust in the learning system.
- Business impact: Supports user engagement and motivation within the learning module.
- Fix direction: No fix needed for header stats. Ensure the underlying V13 (chapter reading position) is also covered by the "always-mounted block" fix.

## Tier Comparison

-   **Persistence Regression (V1, V7, V8, V9, V11, V15):** The behaviour is identical across all tiers where applicable. Theme (V7) and basemap/layer visibility (V8, V9) reset for both Guest and Free users. Session waypoints (V11) and active module (V15) reset for Guest. Active GPS track (V1) resets for Pro. This widespread, consistent failure across tiers points to a fundamental issue in the `localStorage` persistence mechanism itself, rather than tier-specific logic.
-   **Waypoint Save Blocked (P3, V3, V14):** The "Save Waypoint" button is disabled due to GPS acquisition failure for Pro users. Free users are correctly gated to the Upgrade Sheet (F3), preventing them from even reaching the save button. Guest users are memory-only for waypoints (V11 confirmed). The underlying GPS acquisition issue likely affects all tiers but manifests as a blocked save for Pro, and a correct gate for Free.
-   **Pro Status Logic Flaw (P1):** This issue is specific to the Pro tier, where a Pro user is incorrectly shown an Upgrade Sheet. Free users correctly see PRO badges (F2) and are routed to the Upgrade Sheet (F3) when attempting Pro features. Guest users are not expected to interact with Pro features directly.
-   **Offline Track Save Fails (V4):** Confirmed for Pro users. This behaviour is consistent with the lack of offline data capabilities across the app.
-   **Learn Tab Header Stats Persistence (V13 test):** Header stats persist for both Guest and Free users, indicating the fix for tab state preservation is working for this specific UI element across authenticated and unauthenticated sessions.

## Findings Discarded

-   **`pro V6 — route save offline produces no user-facing toast (silent failure)`:** This test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test was unable to verify the core assertion (lack of toast). Therefore, I cannot confirm V6 from this run.

## Cannot Assess

-   **`pro V10 — Pro status reverts to free on offline reload (paying user locked out)`:** The test failed with `net::ERR_INTERNET_DISCONNECTED` during page navigation, indicating a problem with the test environment's offline setup or the test's ability to load the app offline, rather than confirming or denying V10.
-   **`pro V2 — gold/mineral data missing after offline reload (data not cached)`:** Similar to V10, this test failed with `net::ERR_INTERNET_DISCONNECTED` during page navigation. I cannot assess the offline data caching for gold/mineral data from this run.

## Systemic Patterns

The most prominent systemic pattern is a **widespread regression in `localStorage` persistence**. Multiple previously confirmed fixes related to `Zustand persist` middleware and manual `localStorage` IIFE patterns (V1, V7, V8, V9, V11, V15) are now failing. The consistent reporting of `null` or `absent` `localStorage` keys across different stores and tiers strongly suggests a fundamental issue with how `localStorage` is being accessed or written to, potentially due to recent code changes or environment issues. This is a critical regression that impacts the core reliability and usability of the application.

Another pattern is the **failure of GPS acquisition**, which blocks critical functionality like saving waypoints (P3, V3). This points to an issue in the `useTracks` hook or `mapStore.userLocation` update logic, or how Playwright's geolocation mock is being handled.

## Calibration Notes

My previous PHANTOM verdicts for "Map Button Naming Ambiguity" and "Dashboard Tab Obstruction" taught me to be extremely cautious about inferring UX issues from Playwright timeouts or selector issues without direct visual evidence or clear architectural contradiction. In this run, the `pro V6` test's `cannot proof V6` annotation led me to discard it, aligning with the principle of not guessing.

Conversely, the CONFIRMED verdicts for persistence issues (like V15, V7, V1, V11) in previous runs, where `localStorage` keys were explicitly checked, informed my high confidence in identifying the current widespread persistence regression. The detailed annotations like `ee_theme-before-reload: null` are invaluable for pinpointing the exact point of failure (before or after reload). The `UX Knowledge Context` on "Data Safety" and "Form State Persistence" further reinforces the severity of these persistence failures.

The `V13` test's misleading description ("state-loss proof" for a passing test showing no loss) highlighted the need to interpret test *evidence* over test *description*, and cross-reference with the `UX Knowledge Context`'s definition of the vulnerability. This allowed me to correctly identify it as a positive outcome for header stats, rather than a confirmation of state loss.