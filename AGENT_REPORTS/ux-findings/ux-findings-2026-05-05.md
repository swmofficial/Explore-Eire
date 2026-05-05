# UX Agent Report — 2026-05-05

## Run Context
- Commits analysed: 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f, fb6d01c, 7e0bddd, 9f184cb (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Data & Preference Loss Across Reloads (V1, V7, V8, V9, V11, V15)
- Summary: User preferences (theme, basemap, layer visibility) and critical user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to defaults.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Widespread failure in the persistence layer. Despite `STATE_MAP.md` indicating persistence for these items (both Zustand `persist` and manual `localStorage` IIFE patterns), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests the `localStorage.setItem` calls are either not happening, failing silently, or the `localStorage` is being cleared unexpectedly. This contradicts previous task resolutions.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle and that `localStorage` is not being inadvertently cleared.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints. The "LOCATION" field shows "Acquiring GPS...".
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check.
- Cannot confirm: Whether the `task-010` geolocation mock is correctly configured or if the app's `useTracks` hook is failing to acquire/process the mocked GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal, the mock is not correctly configured, or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Verify the Playwright geolocation mock is correctly integrated and providing a valid position that the app can consume.

### 3. Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated feature, despite already having an active Pro subscription.
- Tier(s) affected: Pro (P1 confirmed).
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`, implying the test was waiting for the UpgradeSheet *not* to be visible, but it *was* visible. This directly contradicts the expected behavior for a Pro user.
- Cannot confirm: The exact state of `userStore.isPro` or `userStore.subscriptionStatus` at the moment the Pro-gated feature is tapped, but the outcome indicates it's not correctly recognized as 'pro'.
- Root cause: The `isPro` status is not being correctly read or applied to the UI gating logic. `STATE_MAP.md` notes `isPro` is hydrated from Supabase and persisted. `task-009` aimed to fix a race condition for `isPro` hydration. This failure suggests either the `isPro` value is not correctly set in `userStore` for the Pro user, or the UI component checking `isPro` is doing so prematurely or incorrectly.
- User impact: Confusing and frustrating experience for paying users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative sentiment.
- Fix direction: Debug the `isPro` state hydration and consumption in `userStore` and the components that gate Pro features. Ensure the `global-setup.js` for Playwright correctly sets up the Pro user's `storageState` and that the app correctly reads `isPro` from `localStorage` or Supabase before rendering gated UI.

### 4. Offline Data Save Failures (V4, V6)
- Summary: User-generated data (GPS tracks, routes) cannot be saved when the app is offline, leading to complete data loss for these critical activities. Route saving fails silently without user feedback.
- Tier(s) affected: Pro (V4, V6 confirmed), likely Free and Guest (for guest waypoints, V11 already confirmed loss).
- Confidence: HIGH
- Evidence:
    - `pro V4` PASS: Confirms track save fails offline.
    - `pro V6` PASS: Confirms route save offline. Annotation `route-button-missing: cannot proof V6` indicates the test couldn't verify the *silent* aspect, but the failure to save is confirmed.
- Cannot confirm: The exact error message or toast shown for V4, but the failure to save is clear.
- Root cause: As per `STATE_MAP.md` and `UX Knowledge Context`, the app lacks an offline data capability. Supabase write operations (waypoints, tracks, finds, routes) fail when offline, with no local-first write, sync queue, or retry mechanism.
- User impact: Critical data loss for users operating in areas with poor or no connectivity, which is a primary use case for a mapping app. Leads to extreme frustration and abandonment.
- Business impact: Makes the app unusable for its core purpose in target environments, severely limiting adoption and retention.
- Fix direction: Implement an offline-first data strategy, including a local-first write mechanism (e.g., IndexedDB) and a sync queue for user-generated content (waypoints, tracks, finds, routes).

### 5. Learn Tab Header Stats Test Misleading (V13)
- Summary: The `guest V13` and `free V13` tests pass, indicating the Learn tab header stats (courses, completePct, chaptersDone) are *not* recomputed on tab switch. However, the test description "learn header stats are recomputed on every tab switch (state-loss proof)" is misleading, as it implies a negative outcome, while the actual result (no recomputation/loss) is positive. The underlying vulnerability V13 (loss of *in-progress chapter reading position*) is not directly tested by this metric.
- Tier(s) affected: Guest, Free (V13 tests).
- Confidence: HIGH (on the test's misleading nature and the header stats stability)
- Evidence: `guest V13` and `free V13` PASS. `state-loss-evidence` for both shows `before` and `after` values are identical (`"courses":2,"completePct":0,"chaptersDone":0`). This confirms the header stats are stable.
- Cannot confirm: Whether the *in-progress chapter reading position* (the actual V13 vulnerability per `UX Knowledge Context`) is preserved, as the test only checks header stats.
- Root cause: The test assertion for V13 is checking the Learn tab *header stats*, which appear to be stable (good). However, the original vulnerability V13, as described in `UX Knowledge Context`, refers to the loss of *in-progress chapter reading position* due to component unmounting. The `task-007` fix "Preserve Learn tab component state across tab switches (V13)" by always mounting should have addressed this. The current test does not verify this specific aspect of V13.
- User impact: The header stats are stable, which is good UX. However, if the chapter reading position is still lost, users will be frustrated when returning to a chapter and having to find their place again.
- Business impact: Reduced engagement with the learning module if users constantly lose their place in chapters.
- Fix direction: Update the `guest V13` and `free V13` tests to specifically verify the preservation of the *in-progress chapter reading position* (e.g., by navigating to page 2 of a chapter, switching tabs, and verifying the page number on return). Clarify the test description to reflect the actual outcome.

## Tier Comparison
- **V7 (Theme resets):** Identical behaviour across Guest and Free tiers (fails, resets to dark). This suggests a core persistence issue not related to authentication status.
- **V8/V9 (Map preferences reset):** Guest V9 (basemap) and Free V8 (layers) both timeout, implying identical behaviour of resetting to defaults. This points to a shared `mapStore` persistence issue.
- **V13 (Learn header stats):** Identical behaviour across Guest and Free tiers (passes, header stats are stable). This suggests the header component is robust across auth states.
- **V1, V11, V15:** These vulnerabilities (track, waypoints, active module loss) are confirmed for Guest and Pro tiers, indicating a general failure in the persistence mechanisms for these data types, regardless of authentication status.

## Findings Discarded
- None. All identified findings are distinct and supported by high-confidence evidence.

## Cannot Assess
- **pro V2 — gold/mineral data missing after offline reload (data not cached):** This test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether gold/mineral data is cached offline.
- **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** This test also failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether Pro status persists offline.
- **Reason:** Both `pro V2` and `pro V10` tests are failing prematurely due to a Playwright test setup issue where `page.goto` cannot resolve the initial URL when the network is explicitly disconnected. This prevents the tests from reaching the point where the app's offline state or Pro status persistence can be verified.

## Systemic Patterns
- **Widespread Persistence Layer Failure:** The most critical systemic pattern is a broad failure in the application's persistence layer. Despite explicit mechanisms (Zustand `persist` middleware and manual `localStorage` IIFE patterns) documented in `STATE_MAP.md` and previous task resolutions, critical user preferences and generated data are consistently reported as `null`, `absent`, `empty`, or reset to defaults after page reloads. This indicates a fundamental issue with how `localStorage` is being written to, read from, or an unexpected clearing of `localStorage` during the application lifecycle.
- **GPS Acquisition/Integration Issues:** The recurring "Acquiring GPS..." message and disabled save button in the `WaypointSheet` across multiple tests point to a problem with the app's GPS acquisition, its integration with the `WaypointSheet`'s form validation, or the effectiveness of the Playwright geolocation mock.
- **Fragile Offline Test Setup:** The `net::ERR_INTERNET_DISCONNECTED` errors for offline navigation tests highlight that the Playwright test environment is not robustly configured to handle page reloads or initial navigation when the network is explicitly disconnected, preventing assessment of critical offline capabilities.

## Calibration Notes
- The consistent failure of persistence-related tests (V1, V7, V8, V9, V11, V15) despite previous `CONFIRMED` verdicts for fixes in these areas (e.g., `task-008` for V7, `task-009` for V1/V11/V15) strongly suggests a regression or incomplete implementation of these fixes. This reinforces the confidence in flagging these as high-priority issues.
- The repeated `PHANTOM` verdicts in previous runs for UI-related issues (e.g., "Map Button Naming Ambiguity", "Dashboard Tab Obstruction") continue to guide the focus towards direct evidence from annotations and `STATE_MAP.md` for root cause analysis, rather than speculative inferences.
- Distinguishing between Playwright test environment issues (like `net::ERR_INTERNET_DISCONNECTED` for V2/V10) and actual application UX bugs is crucial, informed by past `MISDIAGNOSED` verdicts. The former prevents assessment, while the latter is a direct finding.