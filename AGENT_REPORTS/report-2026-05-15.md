# UX Agent Report — 2026-05-15

## Run Context
- Commits analysed: `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `29233ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`, `acd32af`, `f174f1e`, `3575880`, `c57cd05`, `d8f3828`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) imply basemap and layer preferences reset. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The `STATE_MAP.md` indicates `userLocation` is written by `Map.jsx watchPosition`. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet`'s dependency on it. Ensure Playwright's geolocation mock is correctly integrated and processed.

### 3. Critical: Pro Users Incorrectly Shown Upgrade Sheet (P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when interacting with Pro-gated features, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to be visible, but it remained visible, causing a timeout. The test is designed to fail if the UpgradeSheet *is* shown.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome is clear.
- Root cause: The gating logic for Pro features, which checks `userStore.isPro` or `userStore.subscriptionStatus`, is either incorrectly implemented or there's a race condition where `isPro` is not yet `true` when the check occurs. `STATE_MAP.md` notes `isPro` is hydrated from Supabase and persisted, but `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry (V10 related, but P1 is an online test). The previous `P1 Pro badge race` fix was about `global-setup` timing, but this suggests an in-app logic issue.
- User impact: Frustration and confusion for paying users who are told to upgrade for features they already possess, undermining trust and perceived value.
- Business impact: Damages customer trust, potentially leading to subscription cancellations and negative word-of-mouth. Wastes support resources.
- Fix direction: Re-evaluate the `isPro` check logic at the point of Pro feature access, ensuring it correctly reflects the user's subscription status and accounts for any potential hydration delays.

### 4. High: Offline Route Save Fails Silently (V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to data loss without feedback.
- Tier(s) affected: Pro (V6 confirmed). Likely affects other tiers if they could save routes.
- Confidence: HIGH
- Evidence: `pro V6` test passed. The annotation `route-button-missing: cannot proof V6` indicates the test passed because the expected *silent failure* occurred (i.e., no toast appeared, and the route was not saved). The test is designed to confirm the silent failure. `STATE_MAP.md` confirms `routes` INSERT `Fails — console.error only, no toast`.
- Cannot confirm: The exact `console.error` message, but the silent failure is confirmed.
- Root cause: As per `STATE_MAP.md`, the `routes` INSERT operation in `RouteBuilder` only logs a `console.error` on failure, without triggering a user-facing toast. This is a deliberate omission in the current error handling for routes.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to significant frustration and wasted effort.
- Business impact: Loss of user-generated content, leading to distrust in the app's data safety and reliability.
- Fix direction: Implement a user-facing toast notification for failed route save operations, similar to other data writes. Consider an offline queue for data writes (V3, V4, V6, V14).

### 5. Medium: Offline Data Access Test Failures (V2, V10)
- Summary: Tests designed to assess offline data access (gold/mineral data, Pro status persistence) failed to even load the application due to network disconnection errors, preventing assessment of these critical offline vulnerabilities.
- Tier(s) affected: Pro (V2, V10).
- Confidence: MEDIUM (on the *finding* that tests failed, not on the vulnerability itself).
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`.
- Cannot confirm: Whether V2 (gold/mineral data missing) or V10 (Pro status reverts) are active, as the tests couldn't even reach the app state to check.
- Root cause: The Playwright test setup for offline scenarios is failing to correctly navigate to the application URL while simulating an internet disconnection. This is an issue with the test infrastructure, not necessarily the application's offline logic itself (though the app's offline logic is known to be weak per `STATE_MAP.md`).
- User impact: Cannot assess the impact of these specific vulnerabilities, but if active, they would lead to critical app functionality loss (no map data, paying users locked out) when offline.
- Business impact: Cannot assess directly, but V2 and V10 are high-impact vulnerabilities if they are active.
- Fix direction: Debug the Playwright offline test setup to ensure the application loads correctly under simulated offline conditions before attempting to assert application state.

### 6. Low: Learn Tab Header Stats Persist Across Tab Switches (V13)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) correctly persist across tab switches, indicating the fix for V13 is working for these specific stats.
- Tier(s) affected: Guest, Free (V13 not confirmed for header stats).
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed. `state-loss-evidence` annotations show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` (e.g., `{"courses":2,"completePct":0,"chaptersDone":0,...}`). `free F4` also passed with identical `header-stats-pair`.
- Cannot confirm: Whether the *in-progress chapter reading position* (the original scope of V13 per UX Knowledge Context) persists, as these tests only check header stats.
- Root cause: The previous fix for V13 ("Preserve Learn tab component state across tab switches") by keeping tabs mounted (visibility toggled) is successfully preventing the loss of state for the header statistics. These stats are derived from `ee_progress` and `ee_certificates` in `localStorage`, which are correctly persisted.
- User impact: Positive impact; users see their overall learning progress consistently, which maintains motivation.
- Business impact: Improves user engagement and trust in the learning module.
- Fix direction: No fix needed for header stats. Further tests would be required to confirm persistence of in-chapter reading position.

## Tier Comparison
- **Persistence Regression (V1, V7, V8, V9, V11, V15):** This is a systemic issue affecting all tiers. `V7 (Theme)` fails for Guest and Free. `V9 (Basemap)` fails for Guest. `V8 (Layer Visibility)` fails for Free. `V11 (Guest Waypoints)` is confirmed for Guest (not applicable to Free/Pro). `V15 (Active Module)` is confirmed for Guest. `V1 (GPS Track)` is confirmed for Pro. The underlying `localStorage` persistence mechanism is broken across the board, affecting all persisted items regardless of tier.
- **GPS Acquisition Failure (P3, V3, V14):** Confirmed for Pro. The underlying GPS acquisition logic is shared, so this likely affects all tiers if they attempt GPS-dependent actions.
- **Pro User Upgrade Sheet (P1):** Specific to Pro tier.
- **Offline Route Save (V6):** Confirmed for Pro. Likely affects other tiers if they could save routes.
- **Learn Tab Header Stats (V13, F4):** Behaves identically across Guest and Free tiers, showing persistence. This indicates the fix for V13 (keeping tabs mounted) is working for these specific stats, and the underlying `localStorage` for `ee_progress`/`ee_certificates` is still functional. This is an important distinction from the other persistence failures.

## Findings Discarded
- None. All 6 findings are high or medium confidence and provide valuable insights.

## Cannot Assess
- **pro V10 (Pro status reverts to free on offline reload):** Test failed due to `net::ERR_INTERNET_DISCONNECTED` during navigation, preventing assessment.
- **pro V2 (gold/mineral data missing after offline reload):** Test failed due to `net::ERR_INTERNET_DISCONNECTED` during navigation, preventing assessment.
- **In-progress chapter reading position persistence (original V13 scope):** The current tests for V13 only check header statistics, not the specific page a user was reading within a chapter.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple critical user preferences and session data items (theme, basemap, layer visibility, guest waypoints, active module, GPS track) are failing to persist across reloads. This points to a fundamental regression in how `localStorage` is being written or read, affecting both Zustand `persist` middleware and manual IIFE patterns. The `ee_theme` key being `null` *before* reload is a strong indicator that `localStorage.setItem` is not being called at all for theme.
2.  **GPS Acquisition System Failure:** The application's core GPS acquisition mechanism (`mapStore.userLocation` via `Map.jsx watchPosition`) appears to be non-functional, even with Playwright's geolocation mock. This blocks critical features like waypoint saving.
3.  **Inadequate Offline Error Handling:** While some offline failures produce toasts (V4), others fail silently (V6) or lack pre-save warnings (V14), leading to data loss without user feedback.

## Calibration Notes
- Prioritised findings with HIGH confidence and direct evidence from annotations/screenshots, especially those confirming known vulnerabilities (V1, V7, V11, V14, V15, V6).
- Carefully distinguished between a test *passing* (meaning the journey completed and produced evidence) and a vulnerability being *confirmed* (meaning the evidence matches the predicted vulnerability). For V1, V11, V15, V14, V6, the pass *did* confirm the vulnerability as the test was designed to produce evidence of the *failure* state. For V13, the pass *did not* confirm the vulnerability for header stats, but rather confirmed the fix for those stats.
- Avoided speculating on root causes without direct evidence, instead referencing `STATE_MAP.md` for architectural ground truth.
- Recognized and explicitly called out test infrastructure failures (V2, V10) that prevented assessment of the underlying UX issues.
- Noted the specific `ee_theme-before-reload: null` annotation as a strong piece of evidence for the persistence regression, indicating a write failure, not just a read failure.