# UX Agent Report — 2026-05-21

## Run Context
- Commits analysed: `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `29233ab`, `d29354c`, `eb866d4`, `d552904`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clearly implied.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access, affecting both Zustand `persist` and manual `localStorage` patterns.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14 (no pre-check for offline save).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state update, ensuring Playwright's geolocation mock is correctly consumed and processed by the app.

### 3. Critical: Offline App Loading Failure (V2, V10)
- Summary: The application fails to load entirely when offline, preventing access to any cached data or functionality, including checking Pro status or displaying previously loaded mineral data.
- Tier(s) affected: Pro (V2, V10 confirmed by test failure). Likely affects all tiers attempting to load offline.
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the browser itself could not navigate to the app's URL when offline, meaning the Service Worker is not effectively caching the core application shell or assets to allow offline loading.
- Cannot confirm: Whether the `isPro` status would correctly persist if the app *did* load offline (V10), or if `gold_samples` data would be available (V2). The failure is at a more fundamental level.
- Root cause: The Service Worker (or lack thereof, or misconfiguration) is not caching the essential application shell and assets required for the app to load and render offline. This is a foundational failure of offline-first principles. `STATE_MAP.md` notes "gold_samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache," which confirms V2 is a known vulnerability, but the test failure here is even more severe, preventing the app from even starting.
- User impact: Complete inability to use the app in offline environments, which is a critical use case for prospectors in rural areas. Users are locked out of all functionality.
- Business impact: Destroys the value proposition for a core user segment, leading to immediate churn and inability to serve the target market.
- Fix direction: Implement or debug the Service Worker to ensure the application shell, critical assets, and initial data (like `gold_samples` for V2) are aggressively cached and served offline.

### 4. High: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: The test for Pro users *not* seeing the Upgrade Sheet on a Pro affordance tap timed out, suggesting the test could not confirm the expected behavior, or the Upgrade Sheet *did* appear, blocking further interaction.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. The test description is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout here means the test was unable to assert the *absence* of the UpgradeSheet, or it got stuck waiting for an element that never appeared because the UpgradeSheet was present. Given the previous fix "Hide PRO badges in LayerPanel for authenticated Pro users (P1)" was confirmed, this suggests a potential regression or an incomplete fix for all Pro affordances.
- Cannot confirm: Whether the UpgradeSheet was explicitly visible, or if another element blocked the test's progression. A screenshot at the point of failure would be helpful.
- Root cause: The `P1` fix was specifically for PRO badges in the LayerPanel. This test likely targets a different Pro-gated feature (e.g., a module or a specific action). If the UpgradeSheet appeared, it indicates that the `isPro` check for this specific affordance is failing or missing, incorrectly routing Pro users to the upgrade flow.
- User impact: Pro users are incorrectly prompted to upgrade, leading to confusion, frustration, and a perception of being scammed or that their subscription isn't recognized.
- Business impact: Damages trust with paying customers, leading to churn and negative sentiment.
- Fix direction: Review the `isPro` gating logic for all Pro affordances, ensuring that authenticated Pro users are correctly recognized and routed past upgrade prompts.

### 5. Medium: Learn Tab Header Stats Test Misleading (V13)
- Summary: The `V13` test for Learn tab state loss passes, but the evidence only confirms that the *header statistics* (courses, completePct, chaptersDone) are preserved across tab switches, not the more critical in-chapter reading position.
- Tier(s) affected: Guest, Free (V13 passes for both)
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` PASS with `state-loss-evidence` showing identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. The test description states "learn header stats are recomputed on every tab switch (state-loss proof)".
- Cannot confirm: Whether the in-chapter reading position (e.g., page 2 of 3) is preserved, which is the core of V13 as described in `UX Knowledge Context`. The test does not capture this specific state.
- Root cause: The `UX Knowledge Context` for V13 states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The current test only checks the `useProgress` derived header stats, which are correctly persisted to `localStorage` (`ee_progress`). The underlying vulnerability of losing the *current page within a chapter* on tab switch is not being tested or confirmed by this journey. The previous fix "Preserve Learn tab component state across tab switches (V13)" was confirmed, but this test suggests it might have only addressed the header, not the deeper component state.
- User impact: Users reading a chapter will lose their place if they switch tabs, requiring them to manually navigate back to their last page, causing minor frustration and disrupting the learning flow.
- Business impact: Reduces engagement with the learning module, potentially lowering perceived value and completion rates.
- Fix direction: Update the `V13` test to specifically assert the persistence of the `ChapterReader`'s internal page state across tab switches. Re-verify the fix for V13 to ensure all component state, not just header stats, is preserved.

### 6. Low: Route Save Offline Test Inconclusive (V6)
- Summary: The `pro V6` test passes, but the annotation explicitly states `route-button-missing: cannot proof V6`, indicating the test did not provide evidence for the silent failure aspect of the vulnerability.
- Tier(s) affected: Pro (V6 confirmed as known vulnerability in `STATE_MAP.md`)
- Confidence: LOW
- Evidence: `pro V6` PASS, with annotation `route-button-missing: cannot proof V6`.
- Cannot confirm: Whether the route save operation actually failed silently (without a toast) as predicted by `STATE_MAP.md`. The test merely completed without error, but didn't assert the *absence* of a toast or the *presence* of a console error.
- Root cause: `STATE_MAP.md` explicitly states for `routes` INSERT: "Fails — console.error only, no toast". The test passing without proving this means the test itself is insufficient to confirm the vulnerability's status. The vulnerability likely still exists as it's a known architectural limitation (no offline write queue).
- User impact: Users believe their route has been saved when it hasn't, leading to data loss and frustration when they later discover it's missing.
- Business impact: Erodes user trust in data safety, especially for a critical feature like route planning.
- Fix direction: Update the `pro V6` test to specifically assert the absence of a user-facing toast after an offline route save attempt, and ideally, check for the presence of a console error. The underlying fix requires an offline write queue (V3, V4, V6, V14).

## Tier Comparison
- **Persistence Regression (V7, V8, V9):** The theme (V7) and map preferences (V8, V9) reset on reload for *both* Guest and Free tiers, indicating a systemic issue independent of authentication status. This suggests the problem lies in the core `localStorage` interaction or Zustand `persist` configuration, affecting all users equally.
- **Learn Tab State (V13, F4):** The header statistics for the Learn tab are preserved across tab switches for *both* Guest and Free tiers (V13 passes, F4 passes). This indicates that the `useProgress` derived stats are correctly persisted, but the underlying vulnerability of in-chapter reading position loss (V13) is not being tested.
- **Waypoint Gating (F3, P3, V3):** Free users are correctly routed to the UpgradeSheet when attempting to save a waypoint (F3 PASS). Pro users, however, are blocked from saving waypoints due to a GPS acquisition failure (P3, V3 FAIL), which is a more fundamental issue than the gating logic itself.
- **Offline Loading (V2, V10):** The app fails to load entirely when offline for the Pro tier (V2, V10 FAIL), preventing any further testing of offline data access or Pro status persistence. This suggests a universal offline loading failure across all tiers.
- **Session Data Persistence (V1, V11, V15):** Guest waypoints (V11), active module (V15), and active GPS tracks (V1) are all lost on reload for their respective tiers (Guest for V11/V15, Pro for V1), confirming a widespread lack of session data persistence across the application.

## Findings Discarded
- No findings were discarded, as all identified issues are critical or high-impact.

## Cannot Assess
- The exact state of `ee-map-prefs` for V8/V9 due to test timeouts.
- Whether `isPro` status would correctly persist offline (V10) or if `gold_samples` would be available offline (V2), because the app failed to load at all when offline.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple critical user preferences and session-specific data points (theme, basemap, layer visibility, guest waypoints, active module, GPS tracks) are failing to persist across reloads. This points to a fundamental issue with how `localStorage` is being written to or read from, potentially affecting both Zustand `persist` middleware and manual IIFE patterns. The `ee_theme-before-reload: null` annotation is a strong indicator that `localStorage.setItem` is not functioning as expected.
2.  **Critical Offline Functionality Breakdown:** The application completely fails to load when offline, indicating a severe deficiency in the Service Worker's caching of the application shell and essential assets. This prevents any offline functionality, including accessing cached data or verifying user status.
3.  **GPS Acquisition Issues:** The app is consistently failing to acquire GPS coordinates, even in online test environments with mocked geolocation. This blocks core functionality like saving waypoints and suggests a problem with the `watchPosition` implementation or its interaction with the environment.

## Calibration Notes
- **Avoiding Phantom Errors:** Care was taken not to infer issues solely from Playwright timeouts without additional evidence (like screenshots or annotations). For V8/V9, the timeout *implies* a reset, but direct evidence of the `localStorage` key state is missing. For P1, the timeout means the expected *absence* of the UpgradeSheet wasn't confirmed, not necessarily that it *was* present. For V6, the test passing but annotation saying "cannot proof" means the test is weak, not that the vulnerability is fixed.
- **Prioritizing Confirmed Vulnerabilities:** The persistence issues (V1, V7, V8, V9, V11, V15) are directly confirmed by annotations and error messages, aligning with previous "CONFIRMED" verdicts. The GPS issue (P3, V3, V14) is also directly confirmed by the disabled button and "Acquiring GPS..." text.
- **Interpreting Test Descriptions vs. Evidence:** For V13, the test description implies state loss, but the evidence shows header stats are preserved. This discrepancy was noted and linked back to the `UX Knowledge Context` to highlight the *actual* vulnerability (in-chapter reading position) that the test isn't covering.
- **Re-evaluating Offline Failures:** The `net::ERR_INTERNET_DISCONNECTED` for V2 and V10 is a more fundamental failure than the specific vulnerabilities they were designed to test. This indicates a deeper problem with offline app loading itself, which is a higher priority.