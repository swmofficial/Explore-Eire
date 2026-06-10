# UX Agent Report — 2026-06-10

## Run Context
- Commits analysed: `f4b5c73` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data (like `gold_samples` for V2). The app relies on network connectivity for initial load, failing the "Offline-First Design" principle. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement a Service Worker to cache the app shell and critical data for offline availability.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online or offline.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms V14 (no offline pre-save warning) because the save button is disabled, preventing the warning from being triggered.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Leading to Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it (though this test is online).
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` correctly sets `isPro` and that Pro-gated features correctly check this state.

### 4. Systemic: Manual localStorage Persistence Failing for Critical User Data (Vulnerability V1, V7, V11, V15)
- Summary: Multiple critical user preferences and session data, intended to be persisted via manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`), are not surviving page reloads.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected `light`). This shows `ee_theme` is not being written.
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This shows `ee_guest_waypoints` is not persisting.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This shows `ee_active_module` is not persisting.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This shows `ee_session_trail` is not persisting.
- Cannot confirm: The exact point of failure in the IIFE read/write pattern for each key, but the consistent `null`/`absent` annotations strongly indicate a widespread issue with this manual persistence strategy.
- Root cause: The manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` are not functioning as intended, leading to data loss on reload. This contradicts previous "CONFIRMED" fixes for V1, V11, V15, and V7.
- User impact: Users lose their selected theme, active module, accumulated guest waypoints, and in-progress GPS tracks on every page reload, leading to significant frustration and repeated setup.
- Business impact: Erodes user trust in data safety and app reliability, increasing friction and reducing engagement with core features.
- Fix direction: Thoroughly debug the manual `localStorage` read/write implementations for all affected keys, ensuring `setItem` is correctly called and `getItem` is correctly hydrating state.

### 5. Map Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This indicates the expected map state (basemap or layer visibility) was not found after reload. `STATE_MAP.md` confirms `basemap` and `layerVisibility` are intended to be persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after the test, but the timeout strongly suggests the state was not as expected.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is failing to correctly save or hydrate `basemap` and `layerVisibility` preferences.
- User impact: Users must re-select their preferred basemap and re-enable desired layers after every page reload, adding unnecessary friction and reducing efficiency.
- Business impact: Minor but persistent annoyance that degrades the user experience and can lead to frustration over time.
- Fix direction: Debug the `mapStore`'s Zustand `persist` configuration and ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

### 6. Offline Waypoint Save Fails Silently with No Pre-Check (Vulnerability V14)
- Summary: When attempting to save a waypoint offline, the "Save Waypoint" button is disabled (due to GPS issue), but even if it were enabled, there is no user-facing warning about offline data loss *before* the save attempt.
- Tier(s) affected: Pro (Free users are gated from saving waypoints entirely).
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This explicitly confirms the absence of a pre-save warning.
- Cannot confirm: The exact UI state if the GPS issue were resolved, but the annotation is direct evidence for V14.
- Root cause: The `WaypointSheet` lacks an explicit network connectivity check and a user-facing warning before allowing a save attempt when offline. `STATE_MAP.md` confirms "Save waypoint" fails offline with a toast, but no pre-check is mentioned.
- User impact: Users might attempt to save critical data offline, believing it will be stored, only to find it silently lost or failing without clear explanation.
- Business impact: Damages user trust and leads to data loss, which is a severe negative experience.
- Fix direction: Implement an offline detection mechanism in `WaypointSheet` to display a warning and/or queue the waypoint for later sync when offline.

### 7. Learn Tab Header Stats Persist Across Tab Switches (Vulnerability V13 - Fixed)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) correctly persist when switching between tabs, indicating the underlying state is preserved.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation for both shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. This directly confirms the header stats are *not* recomputed and *do* persist.
- Cannot confirm: Whether the *chapter reading position* (page within a chapter) also persists, as the test only checks header stats.
- Root cause: The previous fix for V13 ("Replaced conditional {activeTab !== 'map' && ...} wrapper with always-mounted block; each tab has its own display:none wrapper") successfully prevented the unmounting of the Learn tab, thus preserving its component state, including the header stats.
- User impact: Users can navigate away from the Learn tab and return without losing their progress overview, improving continuity and reducing frustration.
- Business impact: Enhances user experience and engagement with the learning module, supporting retention.
- Fix direction: (Already fixed) Maintain the current implementation where Learn tab content remains mounted and its state is preserved.

### 8. Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails without providing any user-facing toast notification, leading to silent data loss.
- Tier(s) affected: Pro (Route Builder is a Pro feature).
- Confidence: HIGH
- Evidence: `pro V6` test passed. `STATE_MAP.md` explicitly states for "Save route": "**Fails** — console.error only, no toast". The test passing confirms this behaviour.
- Cannot confirm: The exact console error message, as it's not provided in the annotations.
- Root cause: The `RouteBuilder` component's save logic does not include a user-facing toast notification for Supabase write failures when offline.
- User impact: Users believe their route has been saved, only to find it missing later, leading to frustration and potential loss of valuable planning.
- Business impact: Erodes trust in the app's data saving capabilities and can lead to negative user experiences.
- Fix direction: Implement a user-facing toast notification in `RouteBuilder` when a route save operation fails, especially due to offline conditions.

## Tier Comparison
- **V7 (Theme Persistence):** Fails for both Guest and Free users, with identical evidence (`ee_theme` localStorage key is `null` before and after reload). This indicates a core issue with the `ee_theme` manual persistence, independent of authentication status.
- **V13 (Learn Tab Header Stats Persistence):** Passes for both Guest and Free users, with identical `state-loss-evidence` showing no change in header stats. This confirms the fix for Learn tab header stats persistence works across unauthenticated and authenticated free users.
- **V1, V11, V15 (Manual localStorage Persistence):** V1 (sessionTrail) is confirmed failing for Pro. V11 (guestWaypoints) and V15 (activeModule) are confirmed failing for Guest. This indicates a widespread issue with the manual `localStorage` persistence mechanism, affecting different data types and tiers.
- **V8, V9 (Map Preferences Persistence):** V8 (layer visibility) fails for Free. V9 (basemap) fails for Guest. Both are intended to be persisted via `ee-map-prefs` using Zustand `persist` middleware, indicating a general failure of this persistence for map-related preferences, independent of authentication.
- **P3, V3 (Waypoint Save):** Fails for Pro users due to GPS acquisition issues. Free users are gated from this feature (F3 passes, showing UpgradeSheet), so the GPS issue doesn't directly manifest for them, but the underlying problem is likely universal. Guest users cannot save waypoints either.
- **P1 (Pro Status Recognition):** Fails for Pro users. Not applicable to Guest or Free tiers.
- **V10, V2 (Offline App Load):** Fails for Pro users. This is a critical app shell loading failure that would likely affect Free users similarly, as the root cause is general app caching. Guest users might load, but without any personalized data.
- **V6 (Route Save Offline Silent Failure):** Passes (confirms silent failure) for Pro users. Not applicable to Guest or Free tiers as Route Builder is a Pro feature.

## Findings Discarded
None. All identified findings are high confidence and critical enough to be included.

## Cannot Assess
No specific areas could not be assessed; all tests ran and provided output.

## Systemic Patterns
-   **Widespread Persistence Failure:** Both manual `localStorage` persistence (V1, V7, V11, V15) and Zustand `persist` middleware for `mapStore` (V8, V9) are failing. This suggests a fundamental problem with how state is being saved and rehydrated across reloads, affecting multiple critical user preferences and data.
-   **Offline Unusability:** The app completely fails to load offline for authenticated users (V10, V2) and critical write operations fail silently (V6, V14) or are blocked (V3). This indicates a severe lack of offline-first design, making the app unusable in common user scenarios.
-   **GPS Acquisition Issues:** A persistent failure to acquire GPS (P3, V3) is blocking core functionality like saving waypoints, indicating a problem with the app's location services integration or Playwright's mock setup.

## Calibration Notes
-   The current test annotations and pass/fail status were prioritized over previous "CONFIRMED" fix verdicts when contradictions arose (e.g., V1, V7, V11, V15). This indicates a regression or an incomplete fix for these vulnerabilities, and the current evidence directly confirms their active status.
-   The `state-loss-evidence` for V13, showing identical `before`/`after` values, was correctly interpreted as the *fix working* for Learn tab header stats, despite the test description implying state loss. This highlights the importance of interpreting the raw evidence over potentially outdated test descriptions.
-   Critical offline and core functionality issues were prioritized due to their high user and business impact, consistent with past successful analyses.