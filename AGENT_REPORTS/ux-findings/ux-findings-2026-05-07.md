# UX Agent Report — 2026-05-07

## Run Context
- Commits analysed: f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f, fb6d01c, 7e0bddd (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Widespread Persistence Failure for User Preferences and Session Data (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and session-specific user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
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
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items (both Zustand `persist` middleware and manual `localStorage` IIFE patterns), the `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, `ee-map-prefs`) are reported as `null`, `absent`, or `empty/missing` after reload. This suggests the `localStorage.setItem` calls are either not happening, failing silently, or `localStorage` is being cleared unexpectedly, directly contradicting previous task resolutions (task-001, task-002, task-006, task-008, task-013).
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle and that `localStorage` is not being inadvertently cleared.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints. The "LOCATION" field consistently shows "Acquiring GPS...".
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check, but the primary issue is the disabled button.
- Cannot confirm: Whether the `task-010` geolocation mock is correctly configured or if the app's `useTracks` hook is failing to acquire/process the mocked GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). Despite `task-010` adding a geolocation mock and `playwright.config.js` having `geolocation: { latitude: 53.2734, longitude: -7.7783 }`, the app is either not receiving a valid GPS signal, the mock is not correctly configured, or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Verify the Playwright geolocation mock is correctly integrated and providing a valid position that the app can consume.

### 3. Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro user, who has an active Stripe subscription, is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance (e.g., a Pro layer toggle).
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout occurred while waiting for the UpgradeSheet to *not* be visible, strongly implying it *was* visible. The test's purpose is to confirm a Pro user *doesn't* see the upgrade sheet.
- Cannot confirm: The exact screenshot of the UpgradeSheet being visible for the Pro user, as the test timed out before capturing a specific "failed" state screenshot for this assertion.
- Root cause: The `isPro` flag in `userStore` or the logic gating the `UpgradeSheet` (`showUpgradeSheet` in `userStore`) is likely misconfigured or experiencing a race condition. Despite `STATE_MAP.md` indicating `isPro` is persisted and `task-005` addressing offline `isPro` resets, the app is failing to correctly identify the user as Pro when checking Pro affordances, leading to the `UpgradeSheet` being triggered. This contradicts the `P1 Pro badge race: fix global-setup storageState timing` fix.
- User impact: Annoyance and confusion for paying users who are asked to upgrade to a tier they already possess, undermining their trust in the subscription.
- Business impact: Damages customer loyalty and trust, potentially leading to subscription cancellations and negative word-of-mouth.
- Fix direction: Review the logic that sets and reads the `isPro` flag, particularly how it interacts with `useAuth` and `useSubscription`. Ensure the `UpgradeSheet`'s visibility is correctly gated by the `isPro` status, and investigate any potential race conditions during app initialization or state hydration.

### 4. Critical Offline Data Vulnerabilities Unconfirmed Due to Test Setup Issues (V2, V10)
- Summary: Two critical offline vulnerabilities, `V2` (gold/mineral data missing offline) and `V10` (Pro status reverting to free offline), could not be confirmed or disproven because the Playwright tests failed to navigate the application into an offline state.
- Tier(s) affected: Pro (V2, V10), potentially Free/Guest for V2 (data loading).
- Confidence: MEDIUM (in the existence of the vulnerability, HIGH in the test setup issue)
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the `page.goto` command itself failed due to network disconnection, preventing the app from loading in an offline context.
- Cannot confirm: Whether V2 and V10 are active or resolved, as the tests did not execute the relevant application logic.
- Root cause: The Playwright test setup for offline scenarios is flawed. The `page.goto` command is failing when the network is disconnected, preventing the application from loading. This could be due to how the network emulation is applied or how the `page.goto` is configured in the test.
- User impact: If V2 is active, users in offline areas will see empty maps for critical data. If V10 is active, paying Pro users will be locked out of Pro features when offline, severely impacting usability in rural areas.
- Business impact: Significant loss of trust and utility for users in target environments, leading to churn and negative reviews.
- Fix direction: Debug the Playwright test setup for offline scenarios. Ensure the `page.goto` command can successfully load the application while network emulation is active, allowing the app's offline behavior to be tested.

### 5. Offline Gold/Mineral Data Not Cached (V2)
- Summary: The application does not cache critical gold and mineral locality data locally, meaning this information is unavailable when the user is offline. The test for this vulnerability failed to execute due to network issues, but the architectural ground truth confirms the vulnerability.
- Tier(s) affected: All (as data is loaded from Supabase on every mount).
- Confidence: HIGH (based on `STATE_MAP.md`)
- Evidence: `pro V2` test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing direct confirmation. However, `STATE_MAP.md` explicitly states: "gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache."
- Cannot confirm: Direct visual evidence of missing data from the test run.
- Root cause: The application's data loading mechanism for `gold_samples` and `mineral_localities` relies solely on Supabase fetches on mount, without implementing any local caching strategy (e.g., IndexedDB or `localStorage` for large datasets).
- User impact: Users in rural areas with poor connectivity will be unable to view essential prospecting data, severely limiting the app's utility in its primary use case.
- Business impact: Major impediment to app adoption and retention for the target audience, as the core value proposition is diminished offline.
- Fix direction: Implement an offline caching strategy for `gold_samples` and `mineral_localities` data, likely using IndexedDB, and ensure the app attempts to load from cache first before fetching from Supabase.

### 6. Route Save Fails Silently Offline (V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to data loss without feedback.
- Tier(s) affected: Pro (V6 confirmed), likely Free/Guest if they could save routes.
- Confidence: HIGH
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test couldn't explicitly assert the *absence* of a toast. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". This confirms the vulnerability exists architecturally. The test passing means it didn't *detect* a toast, which is consistent with the vulnerability.
- Cannot confirm: Direct visual evidence of the lack of toast from the test run, but the architectural ground truth is clear.
- Root cause: The `routes` INSERT operation in `RouteBuilder` lacks proper error handling for offline scenarios, specifically failing to trigger a user-facing toast notification when the Supabase write fails. It only logs to the console.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to frustration and loss of effort.
- Business impact: Erodes user trust in data safety and app reliability, especially for a core feature like route planning.
- Fix direction: Implement robust error handling in the `RouteBuilder` component for route save operations, ensuring a user-facing toast notification is displayed when the Supabase write fails due to offline conditions.

### 7. No Offline Pre-Check for Waypoint Saves (V14)
- Summary: The application does not provide a pre-save warning or indication of offline status when a user attempts to save a waypoint while offline, leading to a failed save operation without proactive user guidance.
- Tier(s) affected: Pro (V14 confirmed), likely Free/Guest if they could save waypoints.
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the absence of a pre-check.
- Cannot confirm: Visual evidence of the absence of the warning, but the annotation is explicit.
- Root cause: The `WaypointSheet` component or its underlying save logic (`mapStore` / `useWaypoints`) does not perform a connectivity check before initiating a Supabase write for waypoints. This violates offline-first principles by not informing the user about potential failure *before* they commit to the action.
- User impact: Users are surprised by a failed save after filling out a form, leading to frustration and wasted effort.
- Business impact: Negative user experience, reduced trust in the app's offline capabilities, and increased support queries.
- Fix direction: Implement an online/offline status check in `WaypointSheet` to display a warning or disable the save button with an explanation when the user is offline, *before* they attempt to save.

### 8. Learn Tab Header Stats Test Misaligned with Vulnerability (V13)
- Summary: The `guest V13` and `free V13` tests, intended to confirm state loss in the Learn tab, actually show no state loss for the *header statistics* (`courses`, `completePct`, `chaptersDone`). This test is misaligned with the actual `V13` vulnerability, which concerns the loss of *in-progress chapter reading position* across tab switches.
- Tier(s) affected: Guest, Free
- Confidence: HIGH (in the misalignment, MEDIUM in the actual state of the vulnerability)
- Evidence: `guest V13` and `free V13` both passed. Their `state-loss-evidence` annotations show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. The `UX Knowledge Context` for V13 explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch."
- Cannot confirm: Whether the *in-progress chapter reading position* is actually lost, as the test does not measure this specific state.
- Root cause: The test `guest V13` and `free V13` are asserting against the Learn tab's header statistics, which are likely derived from persisted `localStorage` data (`ee_progress`, `ee_certificates`) and thus *should* persist. The actual vulnerability `V13` (loss of in-progress chapter *page number*) is a component-level state issue that is not being tested. The previous fix for V13 (always-mounted tabs) should have resolved the *component state* loss, but this test doesn't verify it.
- User impact: The true state of the V13 vulnerability (loss of reading progress) remains unconfirmed, potentially leaving a frustrating UX issue unaddressed.
- Business impact: Incomplete test coverage for a known UX issue, risking user frustration in the learning module.
- Fix direction: Update the `guest V13` and `free V13` tests to specifically assert the persistence of the *in-progress chapter reading page number* (e.g., by navigating to page 2 of a chapter, switching tabs, and verifying the page number upon return).

## Tier Comparison
- **Persistence Failures (V1, V7, V8, V9, V11, V15):** The pattern of preference and session data loss on reload is consistent across all tiers where tested (Guest, Free, Pro). This strongly suggests a fundamental issue with the `localStorage` read/write mechanisms or unexpected `localStorage` clearing, rather than a tier-specific authentication or data hydration problem.
- **Waypoint Save Button Disabled (P3, V3):** This issue affects Pro users online and offline. Given the `userLocation` dependency, it's highly probable this affects Free and Guest users as well if they were able to access the WaypointSheet.
- **Learn Tab State (V13, F4):** Both Guest and Free tiers show no state loss for header statistics, indicating consistent behavior across unauthenticated and authenticated free users. This supports the idea that the underlying tab rendering (always-mounted) is working for these stats, but the test doesn't cover the specific vulnerability.
- **Pro-gated features:** Free users correctly see PRO badges and are routed to the UpgradeSheet (F2, F3). Pro users are *incorrectly* routed to the UpgradeSheet (P1 failure), highlighting a specific issue with `isPro` recognition for paying users.

## Findings Discarded
- No findings were discarded as PHANTOM. The issues identified are either directly confirmed by test evidence or strongly supported by the `STATE_MAP.md` architectural ground truth.

## Cannot Assess
- The actual state of `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed due to Playwright test setup failures preventing the application from loading in an offline context.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** The most prominent systemic issue is the failure of multiple `localStorage` persistence mechanisms (both Zustand `persist` and manual IIFE patterns) to retain data across reloads. This affects user preferences (theme, basemap, layers) and critical session data (guest waypoints, active module, GPS track). This indicates a fundamental problem with how `localStorage` is being written to or read from, or an unexpected clearing of `localStorage` during the app lifecycle.
2.  **GPS Acquisition/Mocking Issues:** The consistent "Acquiring GPS..." message and disabled save button for waypoints points to a problem with the `useTracks` hook's ability to acquire a valid `userLocation` or with the Playwright geolocation mock setup.
3.  **Incomplete Offline Strategy:** While some offline failures are expected (V4, V6), the lack of proactive warnings (V14) and the absence of local caching for critical data (V2) highlight that the app is not truly "offline-first" as per `UX Knowledge Context`. The inability of tests to even load offline (V2, V10) further complicates this.

## Calibration Notes
- **Persistence (V1, V7, V8, V9, V11, V15):** This run confirms a severe regression in persistence, directly contradicting previous `CONFIRMED` verdicts for tasks like `task-001`, `task-002`, `task-006`, `task-008`, `task-013`. The `ee_theme-before-reload: null` and `ee_theme-after-reload: null` annotations for V7 are crucial evidence that the `localStorage.setItem` for `ee_theme` is not happening or is immediately cleared, despite `STATE_MAP.md` stating it's a manual `localStorage` pattern. This indicates a deeper issue than just a Zustand `persist` configuration.
- **GPS Mocking (P3, V3):** The `PHANTOM` verdict for "Playwright geolocation permission + mock location" in a previous run was due to a lack of evidence. This run provides clear evidence (`Acquiring GPS...` and disabled button) that the GPS acquisition is failing, even with a mock. This is a strong `CONFIRMED` finding.
- **V13 (Learn Tab State):** The previous `CONFIRMED` verdict for "Preserve Learn tab component state across tab switches (V13)" was based on changing the rendering strategy. The current test's evidence (identical header stats) is consistent with the fix for *header stats*, but the test itself doesn't cover the *specific* vulnerability of in-progress chapter page loss. This highlights the importance of precise test alignment with vulnerability descriptions.
- **Offline Test Failures (V2, V10):** The `net::ERR_INTERNET_DISCONNECTED` error is a clear test setup problem, preventing actual UX vulnerability testing. This reinforces the need to distinguish between test failures and application failures, while still acknowledging architectural vulnerabilities from `STATE_MAP.md`.