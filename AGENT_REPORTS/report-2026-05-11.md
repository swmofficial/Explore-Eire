# UX Agent Report — 2026-05-11

## Run Context
- Commits analysed: d29354c, eb866d4, d552904, dfebcc0, acd32af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d, 038558e, cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `userLocation` state in `mapStore` is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 2. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload. This reverts previously confirmed fixes.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap preference, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms V11 (guest waypoints lost).
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms V15 (active module lost).
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms V1 (GPS track lost).
    All these findings directly contradict the `STATE_MAP.md` which states these items are persisted, and revert previously confirmed fixes.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken. The `ee_theme` being `null` before reload is particularly concerning as it implies the `setItem` is not happening at all.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and unusable for its primary purpose.
- Business impact: High churn, negative reviews, and complete erosion of user trust in data safety and app reliability. Directly impacts retention and conversion.
- Fix direction: Thoroughly audit all `localStorage` read/write operations and Zustand `persist` middleware configurations. Verify `localStorage` is not being cleared prematurely and that `setItem` calls are correctly executed. Re-implement or debug the manual persistence patterns.

### 3. Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure in Pro status recognition or feature gating.
- Tier(s) affected: Pro (P1 confirmed).
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`, which in the context of the test title "Pro user does not see UpgradeSheet on Pro affordance tap" implies the UpgradeSheet *was* shown, causing the test to wait indefinitely for it *not* to be visible. This is a regression from a previously confirmed fix.
- Cannot confirm: The exact component or logic that failed to correctly gate the Pro feature, or if `userStore.isPro` is correctly `true` at the time of the tap.
- Root cause: The logic responsible for checking `userStore.isPro` before displaying the `UpgradeSheet` or routing to a Pro feature is either failing to correctly read the Pro status, or the `isPro` state itself is incorrect for authenticated Pro users. This could be related to the `useAuth.onAuthStateChange` logic or the `global-setup.js` timing for `isPro` hydration.
- User impact: Paying users are frustrated by being asked to upgrade for features they already pay for, undermining their trust and perceived value.
- Business impact: Damages trust with paying customers, potentially leading to subscription cancellations and negative word-of-mouth.
- Fix direction: Debug the `isPro` state hydration and the conditional rendering logic for the `UpgradeSheet` and Pro-gated features. Ensure `isPro` is correctly set and available before UI rendering.

### 4. Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: The app silently fails to save user-generated tracks and routes when offline, leading to complete data loss without adequate user notification or retry mechanisms.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free if they could save tracks/routes.
- Confidence: HIGH
- Evidence:
    - `pro V4` PASS: "track save fails offline (post-stop data loss)". This test passing confirms the vulnerability.
    - `pro V6` PASS: "route save offline produces no user-facing toast (silent failure)". Annotation `route-button-missing: cannot proof V6` suggests the test confirmed the *absence* of a toast, which aligns with the vulnerability.
    `STATE_MAP.md` confirms for `tracks` and `routes` that "Fails — toast 'Could not save track'" and "Fails — console.error only, no toast" respectively, and "YES — entire GPS trail... gone" / "YES — route points gone".
- Cannot confirm: The exact content of the `console.error` for route saving, or if any other subtle UI feedback is provided beyond a toast.
- Root cause: The app lacks an offline-first data strategy. Supabase write operations for `tracks` and `routes` are directly attempted without a local persistence layer or an offline queue (`useOfflineQueue` is present in the git changes but not reflected in the `STATE_MAP.md` or test outcomes for these specific vulnerabilities).
- User impact: Users lose valuable, often irreplaceable, activity data (GPS tracks, planned routes) after spending time creating it, leading to severe frustration and distrust.
- Business impact: High churn, especially for users in rural areas with unreliable connectivity, directly impacting the app's core value proposition for outdoor activities.
- Fix direction: Implement an offline-first data strategy using a persistent local queue (e.g., IndexedDB) for all user-generated content writes (V3, V4, V6, V14). Show clear "saved locally" vs "synced" status.

### 5. Learn Tab Component State Not Fully Preserved (V13 - Partial Fix)
- Summary: While the Learn tab's header statistics (courses, completion percentage) are correctly preserved across tab switches, the deeper component state, such as the user's reading position within a chapter, is still likely lost.
- Tier(s) affected: All (V13 confirmed as partially fixed for header stats).
- Confidence: MEDIUM (HIGH for header stats, MEDIUM for deeper state inference)
- Evidence: `guest V13` and `free V13` tests PASS with `state-loss-evidence` showing identical `before` and `after` values for `courses`, `completePct`, `chaptersDone`. This confirms the header stats are preserved. However, the UX Knowledge Context explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The tests do not cover this specific deeper state.
- Cannot confirm: Direct observation of a chapter's page position resetting in screenshots or annotations.
- Root cause: The fix for V13 (always-mounted tab content) successfully preserved the top-level state that influences header stats. However, individual components within the Learn tab (like `ChapterReader`) might still manage their internal state using `useState` without lifting it to a persistent store, leading to loss on re-render or unmount/remount cycles if the tab content is not truly kept alive in the DOM.
- User impact: Users lose their place when reading educational content, forcing them to manually navigate back to their last page, causing minor but frequent annoyance.
- Business impact: Reduces engagement with learning content, potentially impacting user skill development and long-term retention.
- Fix direction: Audit `ChapterReader` and other interactive components within the Learn tab to ensure their internal state (e.g., current page, scroll position) is either lifted to a Zustand store or managed in a way that survives DOM unmount/remount if the tab content is not truly kept alive.

### 6. Offline Data Loading Failures Prevent Critical Vulnerability Assessment (V2, V10)
- Summary: Playwright tests for offline data loading (V2) and Pro status persistence offline (V10) are failing due to `net::ERR_INTERNET_DISCONNECTED` errors, preventing the app from loading at all. This blocks assessment of these critical offline vulnerabilities.
- Tier(s) affected: Pro (V2, V10).
- Confidence: HIGH (for the test failure, not the app vulnerability itself)
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates a fundamental issue with the Playwright test environment's ability to simulate offline conditions while allowing the app to load from cache.
- Cannot confirm: Whether the app *would* correctly load cached data (V2) or retain Pro status (V10) if the test environment were stable.
- Root cause: The Playwright test setup for offline scenarios is not robust enough. The `page.goto` command is failing because the browser itself is losing network connectivity in a way that prevents even cached assets from loading, rather than simulating an offline state *after* initial load.
- User impact: No direct user impact, but it prevents the development team from verifying critical offline functionality, increasing the risk of shipping bugs that *will* impact users.
- Business impact: Delays in identifying and fixing severe offline bugs, potentially leading to negative user experiences in the field.
- Fix direction: Debug the Playwright test setup for offline scenarios. Ensure the Service Worker is correctly registered and caching assets, and that `page.goto` is configured to allow offline loading from cache, or use `page.setOffline(true)` *after* initial load.

## Tier Comparison
- **Persistence (V1, V7, V8, V9, V11, V15):** The regression in persistence affects all tiers where applicable. Theme (V7) affects Guest and Free. Basemap (V9) and Layer Visibility (V8) affect Guest and Free. Guest Waypoints (V11) and Active Module (V15) affect Guest. GPS Track (V1) affects Pro. This indicates a systemic issue in the underlying persistence mechanisms (Zustand `persist` middleware or manual `localStorage` patterns) that is not tier-specific.
- **Learn Tab Header Stats (V13, F4):** The preservation of header stats is consistent across Guest and Free tiers, confirming the fix for this specific aspect of V13.
- **Pro Gating (F2, F3, C3, P1):** Free users correctly see PRO badges (F2) and are routed to the UpgradeSheet when tapping a Pro-gated camera button (F3). Guest users are correctly routed to the UpgradeSheet when tapping a Pro-gated layer (C3). Pro users *incorrectly* appear to be routed to the UpgradeSheet (P1 failure), indicating a regression in Pro status recognition.
- **Waypoint Save (P3, V3):** The inability to save waypoints due to GPS acquisition failure is observed in the Pro tier (P3, V3). Given the shared GPS acquisition logic, it's highly probable this issue would affect Free/Guest if they were allowed to save waypoints.
- **Offline Data Loss (V4, V6):** Confirmed for Pro tier (tracks, routes). These features are Pro-gated, so the behaviour is tier-specific by design.
- **Offline Test Setup (V2, V10):** The `net::ERR_INTERNET_DISCONNECTED` error affects the Pro tier tests, preventing evaluation.

## Findings Discarded
- None. All identified issues are distinct and supported by evidence.

## Cannot Assess
- **V2 (Gold/Mineral data missing offline):** The test failed to load the page due to `net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether gold/mineral data is cached and available offline.
- **V10 (Pro status reverts to free offline):** The test failed to load the page due to `net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether Pro status persists offline.

## Systemic Patterns
1.  **Widespread Persistence Regression:** A major regression has occurred in the application's `localStorage` persistence mechanisms. Multiple previously confirmed fixes for `theme`, `basemap`, `layerVisibility`, `sessionWaypoints`, `sessionTrail`, and `activeModule` have been reverted or broken, leading to consistent data and preference loss across all tiers. This points to a fundamental issue in how Zustand `persist` middleware or manual `localStorage` writes are being handled, possibly due to an accidental `localStorage.clear()` or a broken hydration flow.
2.  **Lack of Robust Offline-First Strategy:** The app continues to exhibit critical offline data loss vulnerabilities (V3, V4, V6, V14) for user-generated content (waypoints, tracks, routes). Supabase write operations fail silently or with non-actionable toasts, without any local queuing or retry mechanisms. This is a foundational architectural gap for an outdoor mapping app.
3.  **GPS Acquisition Instability:** The `Acquiring GPS...` state and disabled save button (P3, V3) suggest an underlying issue with the app's GPS acquisition logic, potentially exacerbated by Playwright's geolocation mock. This impacts core functionality.
4.  **Test Environment Fragility:** The `net::ERR_INTERNET_DISCONNECTED` errors for offline tests (V2, V10) indicate that the Playwright test setup for simulating offline conditions is not robust, hindering the ability to verify critical offline-first features.

## Calibration Notes
- The previous "CONFIRMED" verdicts for persistence-related vulnerabilities (V1, V7, V11, V15) were crucial in identifying the current widespread regression. This highlights the value of vulnerability-proof tests that re-confirm known issues.
- The distinction between a test *passing* (meaning it confirmed the vulnerability) and a test *failing* (meaning it failed to assert a fix) was carefully applied, especially for V1, V11, V15, V4, V6.
- The `state-loss-evidence` annotation for V13 was key. Interpreting the *evidence* (identical before/after) over the *test title* (state-loss proof) prevented a misdiagnosis and correctly identified a partial fix.
- The `PHANTOM` verdicts from previous runs reinforce the need for direct evidence and architectural cross-referencing, preventing speculative findings.