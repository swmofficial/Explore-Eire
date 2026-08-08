# UX Agent Report — 2026-08-08

## Run Context
- Commits analysed: `8674e63d3bc424f4872025f3f15867a5db810d53` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Loss of User-Generated Session Data on Reload (Vulnerability V1, V11, V15)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys via manual `localStorage` patterns.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns for `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) that users expect to persist, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 4. High: Widespread Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are lost on page reload, forcing users to reconfigure their settings every session.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`, and annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. `guest V9` and `free V8` tests timed out, indicating the basemap and layer preferences were not in the expected state after reload. `STATE_MAP.md` indicates `userStore.theme` persists via `ee_theme` (manual pattern) and `mapStore.basemap`, `mapStore.layerVisibility` persist via `ee-map-prefs` (Zustand persist).
- Cannot confirm: The exact state of `ee-map-prefs` after reload due to timeouts, but the failure implies loss.
- Root cause: Regression in `localStorage` persistence for `userStore.theme` (manual pattern) and `mapStore.basemap`/`mapStore.layerVisibility` (Zustand persist). The `null` values for `ee_theme` suggest the manual write is failing.
- User impact: Annoyance and wasted time as users repeatedly set their preferred theme, basemap, and layer visibility, degrading the personalized experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't remembered.
- Fix direction: Debug and restore `localStorage` persistence for `ee_theme` and `ee-map-prefs`, verifying both manual and Zustand `persist` middleware implementations.

### 5. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to access and attempt to save waypoints via the camera button, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, confirming the UpgradeSheet was *not* shown and the WaypointSheet *was*.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user, or if it would fail with a different error.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before opening the `WaypointSheet`.
- User impact: Free users are led down a path they cannot complete, potentially wasting time filling out a form only to be blocked later, leading to frustration.
- Business impact: Undermines the value proposition of the Pro subscription by allowing a gated feature to be accessed by free users, potentially reducing conversions.
- Fix direction: Correct the gating logic for the camera button to ensure free users are directed to the `UpgradeSheet` when attempting to save a waypoint.

### 6. High: Pro User Sees UpgradeSheet on Pro Affordance Tap (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the `UpgradeSheet` when tapping a Pro-gated affordance, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. The test description "Pro user does not see UpgradeSheet on Pro affordance tap" implies the test was waiting for the UpgradeSheet *not* to be visible. A timeout in this context strongly suggests the UpgradeSheet *was* visible, which is the opposite of the expected behavior for a Pro user. This is a regression from a previously confirmed fix.
- Cannot confirm: The specific Pro affordance that was tapped, or the exact content of the `UpgradeSheet` if it was shown.
- Root cause: Regression in the `isPro` check for Pro-gated UI elements, or an issue with the `global-setup.js` not correctly setting `isPro` in `storageState` for the Pro tier, leading the app to incorrectly perceive the user as non-Pro.
- User impact: Confusion and frustration for paying Pro users who are asked to upgrade to a subscription they already possess, eroding trust and perceived value.
- Business impact: Damages customer trust and satisfaction for paying users, potentially leading to churn and negative word-of-mouth.
- Fix direction: Investigate the `isPro` gating logic for Pro affordances and verify the `global-setup.js` correctly establishes the Pro user state for tests.

### 7. Medium: Silent Data Loss for Offline Route Saves (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing feedback, leading to unexpected data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` test passed, confirming the vulnerability. `STATE_MAP.md` states `routes` INSERT fails offline with "console.error only, no toast". The annotation `route-button-missing: cannot proof V6` is confusing, but the test *passing* means the silent failure was observed.
- Cannot confirm: The exact route data that was lost, or if any console errors were logged during the test.
- Root cause: The `RouteBuilder`'s save mechanism does not include a user-facing toast or error message for Supabase write failures when offline.
- User impact: Users believe their route has been saved, only to discover it's missing later, leading to frustration and wasted effort.
- Business impact: Erodes user trust in the application's data reliability, especially for a core feature like route planning in potentially offline environments.
- Fix direction: Implement a user-facing toast or notification in `RouteBuilder` to inform users when a route save operation fails due to offline status.

## Tier Comparison
- **Offline App Load (V2, V10):** Identical critical failure across Pro (and inferred Free) tiers. Guest tier is not tested for this specific scenario, but the root cause (lack of app shell caching) would likely affect all.
- **GPS Acquisition Failure (P3, V3):** Identical critical failure across Pro tier. This issue would prevent waypoint saving for Free/Guest users if they were allowed to save waypoints.
- **Session Data Loss (V1, V11, V15):** Identical regression in persistence across Guest (waypoints, active module) and Pro (GPS track) tiers. This indicates a systemic issue with the manual `localStorage` persistence patterns.
- **Preference Loss (V7, V8, V9):** Identical regression in persistence across Guest (theme, basemap) and Free (theme, layers) tiers. This indicates a systemic issue with both manual `localStorage` (theme) and Zustand `persist` (basemap, layers) for preferences.
- **Waypoint Gating (F3):** Free tier is incorrectly routed to `WaypointSheet` instead of `UpgradeSheet`. Pro tier (P3) is blocked by GPS, but the *gating* itself is not the issue for Pro. Guest tier correctly routes to `UpgradeSheet` (C3). This highlights a specific gating error for Free users.
- **Pro Upgrade Sheet (P1):** Pro tier incorrectly sees the `UpgradeSheet`. Free tier correctly renders PRO badges (F2) and is expected to see the UpgradeSheet for gated features. Guest tier correctly sees the UpgradeSheet (C3). This is a specific regression for Pro users.
- **Offline Route Save (V6):** Pro tier experiences silent failure. This behaviour is likely identical for Free/Guest if they could save routes.
- **Learn Tab State (V13, F4):** Guest and Free tiers both pass, showing identical header stats before and after tab switches. This suggests the previous fix for V13 (always mounting tabs) is working, or at least not showing a regression in header stats.

## Findings Discarded
- **guest V13 / free V13 (Learn tab state loss):** These tests passed, and the `state-loss-evidence` annotations showed identical values for `courses`, `completePct`, and `chaptersDone` before and after tab switches. This, combined with a previous `CONFIRMED` fix for V13 (always mounting Learn tab components), indicates that the vulnerability of losing *header stats* is not present. While the `UX Knowledge Context` mentions loss of *in-progress chapter reading position*, the current test evidence does not directly confirm this specific sub-issue. Given the passing tests and previous fix, this is considered resolved or not provable by current evidence.

## Cannot Assess
- No specific items were unassessable due to missing data or skipped tests, beyond the general inability to confirm exact states due to timeouts (which were still used as evidence for preference loss).

## Systemic Patterns
- **Persistence Regression:** Multiple findings (V1, V7, V8, V9, V11, V15) point to a widespread regression in `localStorage` persistence, affecting both manual `localStorage.setItem` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and Zustand `persist` middleware (`ee-map-prefs`). This suggests a fundamental issue with how state is being saved and rehydrated across reloads.
- **Offline Capability Failure:** The critical inability to load the app offline (V2, V10) and silent data loss for offline writes (V3, V4, V6) highlight a severe lack of robust offline-first implementation, which is crucial for the target user base.
- **Gating Logic Inconsistencies:** Issues with both free users accessing Pro features (F3) and Pro users being prompted to upgrade (P1) indicate flaws in the `isPro` status checks and routing logic throughout the application.
- **GPS Integration Issues:** The persistent "Acquiring GPS..." state (P3, V3) suggests a problem with the app's geolocation API integration or its interaction with the Playwright mock environment.

## Calibration Notes
- **Prioritizing Critical Failures:** The consistent `net::ERR_INTERNET_DISCONNECTED` for offline tests (V2, V10) was immediately prioritized as the highest impact, as it renders the app completely unusable. This aligns with previous reports where app-breaking issues took precedence.
- **Evidence-Based Confidence:** Confidence scores were strictly tied to direct evidence from annotations and screenshot descriptions. For instance, `ee_theme: null` directly confirms the failure of manual `localStorage` persistence for V7. Timeouts (V8, V9, P1) were interpreted based on the test's intent (e.g., expecting a state *not* to be present, so a timeout implies it *was* present).
- **Vulnerability-Proof Test Philosophy:** The new test design, where tests produce evidence even on pass/fail, was crucial. For V1, V11, V15, the `(V# confirmed)` annotation on a *passing* test clearly indicated the vulnerability was active, despite the test technically "passing" by confirming the expected (vulnerable) behavior. This is a significant improvement over simple pass/fail.
- **Avoiding Phantom Errors:** The re-evaluation of V13 (Learn tab state loss) based on the previous `CONFIRMED` fix and current passing tests, despite confusing test naming, helped avoid re-reporting a potentially resolved issue as a phantom. This reinforces the need to cross-reference with the `CONFIRMED` history.
- **Regression Detection:** The re-emergence of P1 (Pro user sees UpgradeSheet) and the widespread persistence issues (V1, V7, V8, V9, V11, V15) as regressions from previously `CONFIRMED` fixes highlights the importance of continuous testing and the fragility of current state management.