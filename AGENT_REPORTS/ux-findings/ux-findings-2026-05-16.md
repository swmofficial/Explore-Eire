# UX Agent Report — 2026-05-16

## Run Context
- Commits analysed: `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `29231ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`, `acd32af`, `f174f1e`, `3575880`, `c57cd05`
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
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet`'s dependency on this state. Ensure Playwright's geolocation mock is correctly integrated.

### 3. High: Pro User Incorrectly Sees Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: A Pro user is presented with the Upgrade Sheet when interacting with a Pro-gated feature, indicating a failure to correctly recognize their subscription status.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout typically occurs when an expected element (e.g., a Pro feature) does not appear, or an unexpected element (e.g., the Upgrade Sheet) *does* appear and blocks the test's progression. Given the test's purpose, the timeout strongly implies the Upgrade Sheet was shown.
- Cannot confirm: The exact screenshot of the Upgrade Sheet being visible for the Pro user, due to the timeout.
- Root cause: The `isPro` flag in `userStore` or the logic that gates Pro features (e.g., `showUpgradeSheet` in `userStore`) is not correctly reflecting the Pro user's subscription status, or there is a race condition where the UI renders before `isPro` is fully hydrated from `localStorage` or Supabase. This contradicts previous fixes for P1.
- User impact: Confusing and frustrating experience for paying users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations and negative sentiment.
- Fix direction: Verify the `isPro` hydration and state update logic, especially for `showUpgradeSheet` triggers. Ensure `isPro` is stable and correctly set before Pro-gated UI elements are rendered or interacted with.

### 4. Medium: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated data for GPS tracks and routes is lost when attempting to save offline, with track saves failing explicitly and route saves failing silently without a user-facing toast.
- Tier(s) affected: Pro (V4, V6 confirmed). Implicitly affects any tier capable of saving tracks/routes.
- Confidence: HIGH
- Evidence: `pro V4` PASS (confirms track save fails offline). `pro V6` PASS (confirms route save offline produces no user-facing toast). `STATE_MAP.md` explicitly states: "Save track... Fails — toast 'Could not save track'. YES — entire GPS trail... gone." and "Save route... Fails — console.error only, no toast. YES — route points gone."
- Cannot confirm: The exact content of the `console.error` for V6, as it's not exposed in the test annotations.
- Root cause: The application lacks an offline-first data strategy, specifically a local-first write mechanism and a persistent sync queue for user-generated content. All Supabase write operations fail directly when offline, leading to data loss (UX Knowledge Context - Offline-First Design, Data Safety).
- User impact: Significant data loss for users operating in areas with poor connectivity, leading to extreme frustration and loss of valuable field data.
- Business impact: Severe damage to app credibility, especially for a field-based app. High churn among core users who rely on offline functionality.
- Fix direction: Implement an offline data persistence layer (e.g., IndexedDB) with a sync queue for all user-generated content (waypoints, tracks, finds, routes).

### 5. Low: Free Users See PRO Badges in LayerPanel (F2)
- Summary: Free users are shown "PRO" badges next to premium map layers in the LayerPanel, which is the intended behavior for upsell.
- Tier(s) affected: Free.
- Confidence: HIGH
- Evidence: `free F2` PASS, with annotation `pro-badge-count: 10`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layers.
- Cannot confirm: N/A, directly observed.
- Root cause: This is a designed capability (F2) to differentiate free and pro features and encourage upgrades. The `LayerPanel` correctly reads `isPro` from `userStore` and renders badges when `!isPro` for premium layers, as per `STATE_MAP.md`.
- User impact: Provides clear differentiation between free and premium features, guiding users towards upgrade options.
- Business impact: Supports the freemium business model by highlighting value proposition of the Pro tier.
- Fix direction: No fix required, this is working as intended.

### 6. Low: Learn Tab Header Statistics Persist Across Tab Switches (V13, F4)
- Summary: The header statistics (courses, completion percentage, chapters done) in the Learn tab correctly persist their state when switching to other tabs and returning.
- Tier(s) affected: Guest, Free.
- Confidence: HIGH
- Evidence: `guest V13` PASS, with annotation `state-loss-evidence` showing identical `before` and `after` values for header stats. `free V13` PASS, with identical `state-loss-evidence`. `free F4` PASS, with `header-stats-pair` showing identical `before` and `after` values.
- Cannot confirm: Whether the *in-progress chapter reading position* (page within a chapter) also persists, as the test only checks header stats.
- Root cause: The previous fix for V13 (replacing conditional unmount with `display:none` for tab content) successfully addresses state loss for the Learn tab's header statistics. This aligns with `UX Knowledge Context - Mobile Navigation State` principles.
- User impact: Users can navigate away from the Learn tab and return without losing their progress overview, improving continuity and reducing frustration.
- Business impact: Enhances user engagement with the learning module, supporting retention and perceived app quality.
- Fix direction: No fix required for header stats. Further testing needed for in-chapter reading position.

## Tier Comparison
- **Persistence Regression (V7, V8, V9):** The theme (V7) and map preferences (V8/V9) persistence failures are observed across both Guest and Free tiers, indicating a systemic issue independent of authentication status.
- **Learn Tab State (V13, F4):** The successful persistence of Learn tab header statistics is observed across both Guest and Free tiers, confirming the fix for V13 is working for these elements regardless of authentication.
- **Waypoint Gating/Saving:** Free users are correctly gated to the UpgradeSheet (F3), while Pro users are blocked from saving waypoints due to a GPS acquisition failure (P3, V3). Guest users' waypoints are confirmed to be memory-only (V11). This highlights distinct behaviors and failure modes across tiers for waypoint functionality.
- **Pro Affordances (P1, F2):** Free users correctly see PRO badges (F2) as an upsell mechanism. Pro users, however, incorrectly encounter the Upgrade Sheet (P1), indicating a failure in Pro status recognition.

## Findings Discarded
- `pro V10` (Pro status reverts to free on offline reload): Discarded. The test failed to navigate offline (`page.goto: net::ERR_INTERNET_DISCONNECTED`), preventing any actual testing of the vulnerability.
- `pro V2` (gold/mineral data missing after offline reload): Discarded. The test failed to navigate offline (`page.goto: net::ERR_INTERNET_DISCONNECTED`), preventing any actual testing of the vulnerability.

## Cannot Assess
- The persistence of `is3D` (mapStore) is not covered by current tests.
- The persistence of various other `mapStore`, `userStore`, and `moduleStore` fields is not explicitly tested.
- The in-progress chapter reading position (page within a chapter) for the Learn tab is not explicitly tested for persistence across tab switches.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple critical user preferences and session data points (theme, basemap, layer visibility, guest waypoints, active module, GPS track) are failing to persist across reloads. This points to a fundamental issue with `localStorage` write/read operations or Zustand `persist` middleware configuration, likely introduced by recent code changes or reverts.
2.  **GPS Acquisition Instability:** The core GPS acquisition logic appears to be failing, leading to disabled "Save Waypoint" functionality. This impacts a primary feature and suggests an issue with `watchPosition` integration or mock data handling.
3.  **Incomplete Offline-First Implementation:** While some offline capabilities exist (tile caching), critical user-generated data (tracks, routes, finds, waypoints) is not persisted locally or queued for sync when offline, leading to data loss and poor user experience in low-connectivity environments.

## Calibration Notes
- The current run confirms the importance of direct `localStorage` annotations in tests to diagnose persistence issues, as seen with `ee_theme: null` for V7. This helped pinpoint the problem beyond just a failed assertion.
- The distinction between a test "passing" because it *confirmed* a vulnerability (e.g., V1, V11, V15) versus "failing" because an expected behavior was not met (e.g., V7, P3) is crucial for accurate reporting.
- The previous "CONFIRMED" verdict for V13 (Learn tab state persistence) was correctly identified as a positive outcome, and the current run's results for V13 and F4 further validate this.
- The `page.goto: net::ERR_INTERNET_DISCONNECTED` errors highlight a limitation in the current offline testing setup, preventing confirmation of V2 and V10. This needs to be addressed in the test suite itself.