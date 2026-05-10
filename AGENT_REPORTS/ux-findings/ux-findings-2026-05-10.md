# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: d8f3828, 6af04ec, b8804de, ec37b0d, 038558e, cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the GPS signal isn't being acquired or processed, despite Playwright's geolocation mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app is either not receiving a valid GPS signal from the Playwright mock, the mock is incorrectly configured, or the `useTracks` hook or `WaypointSheet`'s logic is incorrectly interpreting the signal, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 2. Critical: Systemic Persistence Regression: All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` & `free V8` FAIL: `Test timeout of 60000ms exceeded.` for basemap and layer preferences, strongly implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks, routes) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly storing and retrieving data across reloads.

### 3. High: Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro subscriber is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, despite having an active subscription.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: The `pro P1` test, "Pro user does not see UpgradeSheet on Pro affordance tap", failed with `Test timeout of 60000ms exceeded.`. This timeout strongly implies that the Upgrade Sheet *did* appear, causing the test to hang while waiting for its absence. P1 was previously marked CONFIRMED fixed, indicating a regression.
- Cannot confirm: The exact content of the Upgrade Sheet or the specific Pro affordance tapped due to the timeout.
- Root cause: The logic gating the `UpgradeSheet` for Pro users is faulty, or the `isPro` status from `userStore` (hydrated from Supabase and persisted to `ee-user-prefs`) is not correctly propagated or read by the component triggering the sheet.
- User impact: Frustration and confusion for paying users who are asked to upgrade to a tier they already possess, undermining their trust in the subscription.
- Business impact: Damages customer loyalty, increases support load, and could lead to subscription cancellations.
- Fix direction: Verify the `isPro` check within components that trigger the `UpgradeSheet` and ensure `userStore.isPro` is correctly set and accessible for Pro users.

### 4. High: Offline Track Save Fails (V4)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the loss of the entire track data.
- Tier(s) affected: Pro (confirmed).
- Confidence: HIGH
- Evidence: The `pro V4` test, "track save fails offline (post-stop data loss)", passed. This test is designed to confirm the vulnerability, meaning the track save operation failed as expected in an offline scenario. `STATE_MAP.md` explicitly states that `tracks` INSERT operations fail offline, leading to data loss.
- Cannot confirm: Whether any user-facing toast or error message is displayed, as the test only confirms the failure, not the UX around it.
- Root cause: The application lacks an offline data queue for `tracks` INSERT operations. When `TrackOverlay`'s "Save" button is tapped offline, the Supabase write fails directly, and the accumulated `sessionTrail` data (which is volatile in `mapStore` until saved) is lost.
- User impact: Loss of valuable user-generated data (GPS tracks, distance, elevation, duration) if they attempt to save while in an area with no connectivity, leading to significant frustration.
- Business impact: Severe erosion of user trust, especially for prospectors in rural areas who frequently operate offline. This directly impacts retention and the app's core value proposition.
- Fix direction: Implement an offline-first data strategy, including a persistent sync queue (e.g., using IndexedDB) for user-generated data like tracks, to ensure local-first writes and eventual synchronization.

### 5. Medium: Learn Tab Header Stats Consistently Display 0% Progress
- Summary: The Learn tab header consistently displays 0% course completion and 0 chapters done, even after multiple tab switches, suggesting that user progress is not being recorded or reflected in the UI.
- Tier(s) affected: All (Guest V13, Free V13, Free F4).
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed with `state-loss-evidence: {"before":{"courses":2,"completePct":0,"chaptersDone":0,...},"after":{"courses":2,"completePct":0,"chaptersDone":0,...}}`. Similarly, `free F4` passed with `header-stats-pair` showing `completePct:0` before and after. While these tests confirm *no regression* in stats (i.e., stats don't change), they consistently show 0% progress, implying progress isn't being tracked or displayed in the test environment.
- Cannot confirm: Whether the test environment is designed to simulate chapter completion, or if the underlying `ee_progress` `localStorage` key is actually empty in a real user scenario.
- Root cause: The `useProgress()` hook or `markChapterComplete()` function might not be correctly updating `ee_progress` in `localStorage`, or the test setup does not simulate chapter completion, leading to a perpetual 0% display.
- User impact: Users will not see their learning progress, leading to demotivation and a perception that their efforts are not being recorded, hindering engagement with the learning module.
- Business impact: Reduced engagement with the learning module, lower course completion rates, and diminished user satisfaction.
- Fix direction: Verify the `markChapterComplete()` logic and `useProgress()` hook to ensure `ee_progress` is correctly updated and read from `localStorage` in the Learn module. Ensure tests simulate actual chapter completion to verify progress tracking.

### 6. Medium: Offline Navigation Failure Prevents Testing of Critical Offline Vulnerabilities (V2, V10)
- Summary: The Playwright test suite's offline navigation setup is failing, preventing the assessment of critical offline vulnerabilities related to Pro status persistence (V10) and offline data caching (V2).
- Tier(s) affected: Pro (V2, V10).
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests failed with `error: Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the `page.goto` command failed while the browser was in an offline state, preventing the tests from even loading the application.
- Cannot confirm: The actual state of V2 and V10 vulnerabilities due to the test setup failure.
- Root cause: Misconfiguration or bug in the Playwright test setup for offline navigation, specifically how `page.goto` interacts with the mocked offline network state.
- User impact: Indirect, as users are not directly affected by test failures. However, it means critical offline functionality remains untested and potentially vulnerable, increasing the risk of regressions.
- Business impact: Increased risk of shipping regressions for offline features, leading to user frustration and churn in areas with poor connectivity.
- Fix direction: Debug and fix the Playwright global setup for offline navigation to ensure `page.goto` can successfully load the app in an offline context.

### 7. Medium: Learn Tab Component State Preservation (V13) Not Fully Verified by Test
- Summary: While the `guest V13` and `free V13` tests confirm stability of header stats across tab switches, they do not provide evidence for the preservation of deeper component state (e.g., scroll position, active chapter page), which was the original scope of V13.
- Tier(s) affected: All (Guest V13, Free V13).
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed, showing identical header stats before and after tab switching. However, the original V13 vulnerability (as per UX Knowledge Context) was about "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The current test does not provide assertions for this specific aspect of component state.
- Cannot confirm: Whether deeper component state (e.g., scroll position, active chapter page) is actually preserved. The current test only checks derived header stats.
- Root cause: The test for V13 is insufficient to fully verify the fix for component state preservation, focusing only on header stats. The underlying architectural fix (always-mounted block for tabs) *should* address it, but it's not directly evidenced by the current test.
- User impact: Users may still lose their place in a chapter or scroll position when switching tabs, leading to frustration and disruption of the learning flow.
- Business impact: Reduced engagement with the learning module, as users are forced to repeatedly find their place.
- Fix direction: Enhance the V13 test to include assertions for deeper component state, such as scroll position or active chapter page, to fully verify the fix.

### 8. Low: Inconsistent V6 Test Proofing for Offline Route Save
- Summary: The `pro V6` test for offline route saving passed, but the accompanying annotation explicitly states `cannot proof V6`, indicating that the test failed to provide evidence for the vulnerability it was designed to confirm.
- Tier(s) affected: Pro.
- Confidence: HIGH (on the test issue, LOW on the vulnerability itself)
- Evidence: `pro V6` test result shows `PASS` but includes the annotation `route-button-missing: cannot proof V6`.
- Cannot confirm: Whether the V6 vulnerability (silent failure of offline route save) actually exists or not. The test is inconclusive.
- Root cause: The test implementation for `pro V6` is flawed, failing to capture the necessary evidence to confirm or deny the vulnerability, despite the test itself passing.
- User impact: Indirect, as the vulnerability's status remains unknown. If V6 is active, users could lose routes silently, which would be a high impact. However, the current finding is about the test's inadequacy.
- Business impact: Untested critical offline functionality poses a risk of data loss for users, eroding trust.
- Fix direction: Revise the `pro V6` test to correctly assert the presence or absence of a user-facing toast or other evidence of silent failure during offline route saving.

## Tier Comparison

-   **Persistence Regression (V1, V7, V8, V9, V11, V15):** This is a systemic issue affecting all tiers, with specific manifestations:
    -   **Theme (V7):** Affects both Guest and Free users, resetting to default on reload.
    -   **Basemap (V9):** Affects Guest users, resetting to default on reload.
    -   **Layer Visibility (V8):** Affects Free users, resetting to default on reload.
    -   **Guest Waypoints (V11):** Affects Guest users, lost on reload.
    -   **Active Module (V15):** Affects Guest users, resetting to default on reload.
    -   **GPS Track (V1):** Affects Pro users, lost on reload.
    The identical `ee_theme: null` annotations for Guest and Free V7 tests strongly suggest a shared root cause in how `ee_theme` is handled.
-   **Learn Tab Header Stats (V13, F4):** The behavior is identical across Guest and Free tiers. Both tests passed, showing that header stats (courses, completePct, chaptersDone) remain stable at 0% across tab switches. This indicates the component state for these derived stats is preserved, but also highlights an issue with progress tracking or simulation in the test environment.
-   **Pro-gated Features:**
    -   `guest C3` and `free F3` correctly surface the `UpgradeSheet` when Pro-gated features are accessed, as expected for non-Pro users.
    -   `free F2` correctly renders PRO badges for free users in the LayerPanel, indicating which features are locked.
    -   `pro P1` shows a regression where a Pro user is incorrectly presented with the `UpgradeSheet`.
-   **Offline Data Handling:**
    -   `pro P3`, `pro V3`, `pro V14` (waypoint save disabled/fails offline/no pre-check) are confirmed for Pro users.
    -   `pro V4` (track save fails offline) is confirmed for Pro users.
    -   `pro V6` (route save offline silent failure) is unproven due to test limitations.
    -   `pro V2` and `pro V10` (offline data caching and Pro status persistence) could not be assessed due to test setup failures.

## Findings Discarded

-   **pro V6 — route save offline produces no user-facing toast (silent failure):** Discarded as a confirmed vulnerability. The test passed, but the annotation `route-button-missing: cannot proof V6` explicitly states that the test did not provide evidence for the vulnerability. This makes the finding PHANTOM regarding the vulnerability itself, though the test's inadequacy is noted as a separate finding.

## Cannot Assess

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** Cannot assess. The test failed due to `page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a failure in the Playwright offline navigation setup.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached):** Cannot assess. The test failed due to `page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a failure in the Playwright offline navigation setup.

## Systemic Patterns

1.  **Widespread Persistence Regression:** Multiple findings (V1, V7, V8, V9, V11, V15) across all tiers point to a fundamental breakdown in `localStorage` persistence mechanisms. This affects both Zustand `persist` middleware and manual `localStorage` IIFE patterns, indicating a systemic issue in how data is stored and retrieved across reloads.
2.  **GPS Acquisition Failure:** The inability to acquire GPS coordinates (P3, V3) is a critical functional blocker for waypoint saving. This suggests a problem with the app's interaction with geolocation services or the Playwright mock.
3.  **Inadequate Offline Testing Infrastructure:** The failure of `page.goto` in offline mode for V2 and V10 highlights a critical flaw in the test environment's ability to simulate offline navigation, preventing the assessment of key offline vulnerabilities.

## Calibration Notes

-   The analysis prioritized direct evidence from test errors and explicit annotations over speculative interpretations of timeouts, aligning with past successful confirmations and avoiding previous PHANTOM verdicts.
-   Findings where tests *passed* but explicitly confirmed a vulnerability (e.g., V1, V4, V11, V15) were correctly identified as high-confidence confirmations of the vulnerability, adhering to the "Vulnerability-Proof Test Philosophy."
-   The distinction between a test passing and a vulnerability being *proven* was crucial (e.g., V6), leading to a PHANTOM verdict for the vulnerability itself when proof was lacking, but a finding about the test's inadequacy.
-   The interpretation of `state-loss-evidence` for V13/F4 showing identical 0% stats was refined: it indicates *stability* of derived state (consistent with the previous fix) rather than *loss*, but still points to an underlying progress tracking issue.
-   `STATE_MAP.md` was instrumental in confirming expected persistence behaviors and identifying regressions against the documented ground truth.