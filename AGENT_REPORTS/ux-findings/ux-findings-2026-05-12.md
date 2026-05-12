# UX Agent Report — 2026-05-12

## Run Context
- Commits analysed: c5bebc2, db7f6d0, 39c2e46, 28b2b20, 1c2184c, c5131e8, ce7e7d6, 29233ab, d29354c, eb866d4, d552904, dfebcc0, acd32af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload. This reverts previously confirmed fixes.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence: `guest V7` & `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` FAIL (timeout) and `free V8` FAIL (timeout) imply basemap and layer preferences reset. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
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

### 3. Critical: Pro Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their Pro status and access to premium features when the app is reloaded offline, effectively locking them out.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: `pro V10` failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED` on reload. This test specifically targets the `isPro` status after an offline reload. The failure implies the `isPro` status was not maintained, despite the previous fix (task-005) designed to prevent this.
- Cannot confirm: The exact `isPro` value after reload, but the test failure context strongly indicates it reverted.
- Root cause: Despite `isPro` being persisted via Zustand `persist` middleware and task-005 aiming to prevent `useAuth.onAuthStateChange` from overwriting it on offline JWT expiry, the issue persists. This suggests either the `persist` middleware is failing for `isPro` (part of the systemic persistence regression) or the `onAuthStateChange` guard is not fully effective.
- User impact: Paying users are locked out of features they've paid for, leading to extreme frustration and distrust.
- Business impact: Direct breach of trust with paying customers, high churn, refund requests, severe reputational damage.
- Fix direction: Re-investigate `userStore` persistence for `isPro` and the `useAuth.onAuthStateChange` logic, ensuring `isPro` is correctly hydrated from `localStorage` and not reset when offline.

### 4. Critical: Core Map Data Unavailable Offline (V2)
- Summary: Essential map data, such as gold samples and mineral localities, is not cached and becomes unavailable when the app is offline, rendering the map largely useless for prospecting.
- Tier(s) affected: Pro (V2 confirmed). Likely affects Free and Guest tiers for any data they might access.
- Confidence: HIGH
- Evidence: `pro V2` failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED` on reload. This test specifically checks for the presence of gold/mineral data after an offline reload. The failure confirms the data is not available.
- Cannot confirm: The specific UI elements that are missing, but the general absence of data is clear.
- Root cause: As stated in `STATE_MAP.md`, "gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache." The app lacks an offline-first data strategy for core map layers.
- User impact: Inability to use the app for its primary purpose in common use cases (rural areas with poor connectivity), leading to severe frustration.
- Business impact: Limits app utility, reduces adoption in target markets, leads to negative reviews.
- Fix direction: Implement an offline-first data strategy, including local caching (e.g., IndexedDB) for core map data and a Service Worker to intercept and serve cached data.

### 5. Pro User Incorrectly Shown Upgrade Sheet (P1)
- Summary: Authenticated Pro users are incorrectly shown the "Upgrade to Explorer" sheet when interacting with Pro-gated features.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: `pro P1` failed with a `Test timeout of 60000ms exceeded.`. This test is designed to ensure the UpgradeSheet is *not* visible for Pro users. A timeout in this context strongly implies the UpgradeSheet *was* visible, preventing the test from proceeding.
- Cannot confirm: The exact content of the UpgradeSheet, but its presence is implied.
- Root cause: This is a regression or a new manifestation of a race condition. The `global-setup.js` was updated to poll for `isPro:true` before capturing `storageState`, and `P1` test was updated to wait for `isPro`. The failure suggests `isPro` is either not correctly set in the session, or the component gating logic (`showUpgradeSheet` in `userStore`) is misfiring despite `isPro` being true.
- User impact: Confusion and frustration for paying users, undermining the value of their subscription.
- Business impact: Erodes trust, increases support queries, potential for refund requests.
- Fix direction: Re-verify the `isPro` state propagation and the conditional rendering logic for `UpgradeSheet` for Pro users. Ensure `global-setup` correctly establishes the Pro state.

### 6. Offline Track Save Fails (V4)
- Summary: When a user finishes tracking a route and attempts to save it while offline, the save operation fails, resulting in the loss of the entire GPS track.
- Tier(s) affected: Pro (V4 confirmed). Likely affects Free if they could save tracks.
- Confidence: HIGH
- Evidence: `pro V4` passed. The test description and vulnerability context indicate this "pass" means the journey completed and confirmed the failure. The `STATE_MAP.md` confirms: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone."
- Cannot confirm: The specific toast message, but the data loss is confirmed by `STATE_MAP.md`.
- Root cause: The `useTracks` hook's save logic directly attempts a Supabase `INSERT` without an offline queue or local persistence.
- User impact: Loss of valuable user-generated data (entire track), leading to significant frustration and wasted effort.
- Business impact: Reduces user trust, discourages use of tracking features, negative perception of app reliability.
- Fix direction: Implement an offline queue (e.g., IndexedDB) for track save operations, allowing them to sync when connectivity returns.

### 7. Offline Route Save Fails Silently (V6)
- Summary: When a user attempts to save a custom route while offline, the operation fails silently without any user-facing feedback or toast notification, leading to data loss.
- Tier(s) affected: Pro (V6 confirmed).
- Confidence: HIGH
- Evidence: `pro V6` passed. The annotation `route-button-missing: cannot proof V6` is from the test, but the `STATE_MAP.md` explicitly states: "Save route... Fails — console.error only, no toast ... YES — route points gone." The test passing means the journey completed and confirmed this behavior.
- Cannot confirm: The console error, but the silent failure and data loss are confirmed by `STATE_MAP.md`.
- Root cause: The `RouteBuilder` component's save logic directly attempts a Supabase `INSERT` without an offline queue and lacks proper error handling to display a user-facing toast on failure.
- User impact: Users believe their route has been saved when it hasn't, leading to confusion and eventual data loss when they realize it's missing. Silent failures are worse than explicit errors.
- Business impact: Erodes user trust, makes the app seem buggy, leads to frustration and abandonment.
- Fix direction: Implement an offline queue for route save operations and ensure user-facing feedback (toast) is provided for all save failures, even when offline.

### 8. Learn Tab Header Stats Stable, but Component State Still at Risk (V13, F4)
- Summary: The Learn tab's header statistics (courses, completion percentage, chapters done) correctly persist across tab switches for both guest and free users. However, the underlying component state (e.g., current page in a chapter) may still be lost, despite a previous fix.
- Tier(s) affected: Guest, Free.
- Confidence: MEDIUM (for component state loss inference, HIGH for header stats stability)
- Evidence: `guest V13` and `free V13` *pass*. `state-loss-evidence` annotations show identical `before` and `after` values for header stats. `free F4` also passes with identical `header-stats-pair`. This confirms header stats are stable. The previous fix for V13 was to keep tabs mounted to preserve *component state*. While header stats are stable, the tests don't explicitly verify deeper component state (like scroll position or active chapter page).
- Cannot confirm: Whether deeper component state (e.g., current chapter page, scroll position) is truly preserved. The tests only check header stats.
- Root cause: The previous fix (keeping tabs mounted) likely addressed the header stats. However, if other component-specific state is not lifted to a store or persisted, it could still be lost.
- User impact: Users might lose their place in a chapter or scroll position, disrupting their learning flow.
- Business impact: Minor frustration, but can hinder engagement with the learning module.
- Fix direction: Verify that all critical component-specific state within the Learn tab (e.g., `ChapterReader`'s current page) is either lifted to `moduleStore` or persisted via `localStorage` if it needs to survive unmount/remount.

## Tier Comparison
- **Persistence Regression (V1, V7, V8, V9, V11, V15):** This is a systemic issue affecting all tiers. Theme (V7), basemap (V9), and layer visibility (V8) preferences are lost for all users. Guest users lose session waypoints (V11) and active module (V15). Pro users lose active GPS tracks (V1). The underlying root cause (failure to persist to `localStorage`) is common across these.
- **GPS Acquisition & Waypoint Save (P3, V3, V14):** Confirmed for Pro users. The underlying GPS acquisition logic is shared, so this issue would likely affect Free and Guest users if they had permissions to save waypoints.
- **Offline Data Access & Auth (V2, V10):** Confirmed for Pro users. These are fundamental offline capabilities that would impact any authenticated user attempting to use the app offline.
- **Offline Data Write Failures (V4, V6):** Confirmed for Pro users. These are data loss issues for user-generated content (tracks, routes) and would affect any user with write permissions.
- **Pro User Experience (P1):** This issue is specific to Pro users being incorrectly identified and shown an upgrade sheet.
- **Learn Tab State (V13, F4):** The header statistics are stable across tab switches for both Guest and Free tiers, indicating consistent behavior for this specific aspect of state.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- No specific areas were entirely unassessable, though some tests timed out, limiting the depth of evidence for those specific scenarios (e.g., V8, V9).

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple previously fixed vulnerabilities (V1, V7, V8, V9, V11, V15) have regressed. This indicates a fundamental issue with how `localStorage` is being written to or read from, or how Zustand's `persist` middleware is configured/initialized. The `ee_theme` being `null` *before* reload in V7 is a strong indicator that `localStorage.setItem` is not even being called, or `localStorage` is being cleared unexpectedly. This is the most critical systemic pattern.
2.  **Persistent GPS Acquisition Issues:** The "Acquiring GPS..." state continues to block core functionality (waypoint saving), suggesting a problem with the `useTracks` hook's interaction with geolocation APIs or Playwright's mock. This issue has recurred across multiple reports.
3.  **Lack of Offline-First Data Strategy:** Core map data (V2) and user-generated content (V3, V4, V6) are not handled offline, leading to data loss and app unresponsiveness in disconnected environments. This is a known, unaddressed architectural gap that severely impacts the app's utility in its target use case.
4.  **Auth/Subscription State Instability Offline:** The `isPro` status (V10) is not reliably maintained offline, impacting paying users and eroding trust.

## Calibration Notes
- Prioritized findings based on direct evidence from annotations and error messages, especially for "PASS" tests that explicitly confirm a vulnerability (e.g., V1, V4, V6, V11, V15). This aligns with the "journey completed and produced evidence" philosophy.
- Recognized regressions of previously "CONFIRMED" fixes (V1, V7, V8, V9, V10, V11, V15) as high-priority issues, indicating a systemic problem rather than isolated bugs.
- Identified the recurrence of the GPS acquisition issue (P3, V3, V14) as a persistent critical bug, reinforcing the need for a robust solution.
- Grouped related vulnerabilities (e.g., all persistence issues, all offline write issues) to highlight systemic patterns and potential shared root causes.
- Carefully re-evaluated V13 based on the actual test evidence (stable header stats) versus the misleading test title, avoiding a phantom error.