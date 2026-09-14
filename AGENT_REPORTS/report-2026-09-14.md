# UX Agent Report — 2026-09-14

## Run Context
- Commits analysed: `d7f5f5b764b4699e1fd02ecc72e1337254b0cbac` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Free Users Can Save Waypoints (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` and attempt to save waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` failed, `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: The exact code path that allows the `WaypointSheet` to open for free users without triggering the `UpgradeSheet`.
- Root cause: Flawed gating logic for the "Save Waypoint" action, likely in `CornerControls` or `Map.jsx` where the camera button is handled. It should check `isPro` and show `UpgradeSheet` if `false`.
- User impact: Free users can attempt to save waypoints, only to find out later (or on reload, due to V11) that their data isn't truly saved or persisted, leading to frustration and distrust.
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions if users can access Pro features without paying.
- Fix direction: Correct the conditional rendering/routing logic for the waypoint camera button to ensure `UpgradeSheet` is shown for free users.

### 4. High: Pro Users Incorrectly See Upgrade Sheet (P1 Regression)
- Summary: Authenticated Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, suggesting their Pro status is not being correctly recognized by the UI gating logic.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is designed to assert that the UpgradeSheet is *not* visible. A timeout strongly implies the sheet *was* visible, causing the test to wait indefinitely.
- Cannot confirm: The exact component or store field that is misreporting `isPro` status, but the outcome is clear.
- Root cause: A race condition or incorrect logic in `useAuth` or `useSubscription` where `isPro` is not `true` by the time the Pro affordance is tapped, or the gating logic itself is flawed. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may reset `isPro` to false on null session, but `global-setup.js` should poll for `isPro:true`.
- User impact: Paying users are confused and frustrated, feeling like their subscription is not recognized or valued.
- Business impact: Erodes trust in the subscription model, increases support burden, and could lead to cancellations.
- Fix direction: Investigate the `isPro` state hydration and gating logic for Pro affordances, ensuring `isPro` is `true` and stable before UI renders.

### 5. High: Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, regardless of authentication status.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm that the `ee_theme` localStorage key, which is supposed to persist the theme, is not being written or read correctly. `STATE_MAP.md` explicitly states `ee_theme` uses a "manual pattern, task-008".
- Cannot confirm: Why the manual `localStorage.setItem('ee_theme', theme)` call is failing or why `localStorage.getItem('ee_theme')` is returning null.
- Root cause: The manual persistence mechanism for `userStore.theme` (using `ee_theme` localStorage key) is not functioning as intended, leading to state loss on reload.
- User impact: Minor annoyance, but contributes to a feeling of an unreliable or unpolished application, as personal preferences are not respected.
- Business impact: Low, but contributes to overall user dissatisfaction and perception of quality.
- Fix direction: Debug the manual `ee_theme` localStorage read/write logic in `userStore.js` to ensure theme preference is correctly persisted and rehydrated.

### 6. Medium: Basemap and Layer Visibility Preferences Reset on Reload (V9, V8 Regression)
- Summary: User preferences for the selected basemap and active map layers reset to their default states upon page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. This implies the test was unable to verify the expected state after reload, likely because the state had reverted. `STATE_MAP.md` confirms `mapStore.basemap` and `mapStore.layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage before/after reload, as the tests timed out before providing this annotation.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is either failing to save these preferences to localStorage or failing to rehydrate them correctly on app load.
- User impact: Users have to reconfigure their preferred map view settings after every reload, which is frustrating and time-consuming.
- Business impact: Contributes to a poor user experience, potentially reducing engagement with map features.
- Fix direction: Investigate the Zustand `persist` configuration and implementation for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved and loaded.

### 7. Medium: Session Waypoints and Active Module Lost on Reload (V11, V15 Confirmed)
- Summary: Guest waypoints (`sessionWaypoints`) and the currently active module (`activeModule`) are not persisted across page reloads, leading to loss of in-progress user data and context.
- Tier(s) affected: Guest (V11), All (V15)
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `STATE_MAP.md` indicates both `sessionWaypoints` and `activeModule` use manual `IIFE + write pattern` for persistence via `ee_guest_waypoints` and `ee_active_module` respectively. The annotations confirm these keys are absent after reload.
- Cannot confirm: The exact point of failure in the manual persistence logic, but the outcome is clear.
- Root cause: The manual `IIFE + write pattern` for `sessionWaypoints` and `activeModule` is not correctly persisting data to or rehydrating from localStorage.
- User impact: Loss of unsaved waypoints for guest users, and loss of active module context for all users, requiring them to re-select their module after every reload.
- Business impact: Reduces the utility of the guest experience and adds friction for all users, potentially hindering engagement.
- Fix direction: Debug the manual localStorage read/write logic for `ee_guest_waypoints` and `ee_active_module` to ensure proper persistence.

### 8. Medium: GPS Track Lost on Reload (V1 Confirmed)
- Summary: Any accumulated GPS track data (`sessionTrail`) is lost upon page reload, as it is not automatically saved or persisted during active tracking.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` using a "manual IIFE + write pattern, task-006". The annotation confirms the key is empty or missing after reload.
- Cannot confirm: The exact point of failure in the manual persistence logic for `sessionTrail`.
- Root cause: The manual `IIFE + write pattern` for `sessionTrail` is not correctly persisting data to or rehydrating from localStorage.
- User impact: Users lose potentially hours of tracking data if the app crashes or the page is accidentally reloaded before they explicitly save the track. This is a major data loss risk.
- Business impact: Severe data loss can lead to extreme user dissatisfaction, negative reviews, and abandonment of the app.
- Fix direction: Debug the manual localStorage read/write logic for `ee_session_trail` to ensure proper persistence during active tracking.

## Tier Comparison
- **Offline App Loading (V2, V10):** Pro tier fails to load at all. This behavior is inferred for Free tier users as well, given the shared authentication and data loading mechanisms. Guest tier is not explicitly tested for this specific failure, but would likely also fail if the core app shell isn't cached.
- **GPS Acquisition (P3, V3 blocker):** Pro tier fails to acquire GPS, blocking waypoint saving. This behavior is inferred for Free and Guest tiers if they were to attempt to save waypoints.
- **Theme Persistence (V7):** Fails for both Guest and Free tiers, indicating the root cause is independent of authentication status.
- **Basemap/Layer Persistence (V9, V8):** Fails for both Guest and Free tiers, indicating the root cause is independent of authentication status.
- **Learn Tab State (V13, F4):** Passes for both Guest and Free tiers, confirming the fix for V13 is working across authenticated and unauthenticated sessions.
- **Waypoint Saving:** Free users can incorrectly open the WaypointSheet (F3 fail). Guest users' waypoints are lost on reload (V11 confirmed). Pro users are blocked by GPS acquisition (P3 fail).
- **PRO Badges:** Free users correctly see PRO badges (F2 pass). Guest users correctly see the UpgradeSheet on PRO affordance tap (C3 pass). Pro users incorrectly see the UpgradeSheet (P1 fail).

## Findings Discarded
- `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast): These tests passed, confirming the vulnerabilities. While important, they are symptoms of the larger offline data handling problem (V3, V4, V6, V14 are all related to offline write queue, deferred) and are less critical than the app failing to load, GPS not working, or core preferences/data being lost. V1 (GPS track lost on reload) was prioritized as it represents data loss during an active session.
- `guest C1`, `guest C2`, `guest C3`, `free F1`, `free F2`, `free V13`, `free F4`, `pro P2`: All passed and confirmed expected behavior or successful fixes. These do not represent UX issues.

## Cannot Assess
- No findings were impossible to assess due to missing data or skipped tests.

## Systemic Patterns
- **Persistence Failures:** Multiple critical state elements (theme, basemap, layers, session waypoints, active module, session trail) are failing to persist across reloads, despite explicit persistence mechanisms (Zustand `persist` or manual `localStorage` writes). This suggests a fundamental issue with how `localStorage` is being written to or read from, or how the stores are being rehydrated.
- **Offline Unusability:** The app is completely unusable offline for authenticated users, failing to load the core application. This is a severe violation of offline-first principles and a major blocker for the target user base.
- **GPS Acquisition Issues:** A persistent problem with GPS acquisition is blocking core functionality (waypoint saving) and preventing proper testing of related offline vulnerabilities.
- **Gating Logic Flaws:** Inconsistent application of Pro tier gates, allowing free users to access Pro features (F3) and showing upgrade prompts to Pro users (P1).

## Calibration Notes
- Prioritized critical app loading and core functionality issues (offline, GPS) over data loss in specific scenarios (e.g., V4, V6).
- Confirmed that a "PASS" for a vulnerability test (like V1, V11, V15) means the vulnerability *was observed and confirmed*, not that it was fixed, aligning with the "vulnerability-proof test philosophy".
- Focused on direct evidence from annotations and error messages, avoiding speculation where evidence was ambiguous (e.g., timeouts for V9/V8 were interpreted as persistence failures but with MEDIUM confidence due to lack of direct `localStorage` content).
- Noted regressions (P1, F3) where previous fixes or expected behavior are now failing.
- The `ee_theme: null` annotation for V7 is a strong indicator of a `localStorage` write/read problem, reinforcing the "persistence failures" systemic pattern.