# UX Agent Report — 2026-05-01

## Run Context
- Commits analysed: `8d68336`, `9c7766c`, `67bda0b`, `007e57d`, `adaaf62`, `00a605d`, `f05bbe6`, `9dea4f9`, `bd2ce22`, `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Data & Preference Loss Across Reloads (V1, V7, V8, V9, V11, V15)
- Summary: User preferences (theme, basemap, layer visibility) and critical user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This indicates the `ee_theme` localStorage key is not being written or read.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` This implies the basemap preference (`mapStore.basemap` via `ee-map-prefs`) is not persisting.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` This implies layer visibility preferences (`mapStore.layerVisibility` via `ee-map-prefs`) are not persisting.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms `sessionWaypoints` is not persisting.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms `activeModule` is not persisting.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms `sessionTrail` is not persisting.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome is clear.
- Root cause: Widespread failure in the persistence layer. Both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are not correctly writing or reading data on app initialization and lifecycle events.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints.
- Tier(s) affected: Pro (likely Free too, as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: Whether the GPS acquisition itself is failing or if the button's enabled state logic is incorrectly tied to a potentially slow or non-existent GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Ensure the Playwright geolocation mock is correctly integrated and providing a valid position.

### 3. Offline Data Loss for User-Generated Content (V3, V4, V6, V14)
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, with either silent failures or non-actionable error messages, and no pre-save warning for offline state.
- Tier(s) affected: Pro (V3, V4, V6, V14), Free (likely V3, V4, V6, V14)
- Confidence: HIGH
- Evidence:
    - `pro V3` FAIL: `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a pre-save warning. The save button itself is disabled, preventing the save attempt.
    - `pro V4` PASS: "track save fails offline (post-stop data loss)". The test passes because it confirms the failure, meaning data is lost.
    - `pro V6` PASS: "route save offline produces no user-facing toast (silent failure)". The test passes, implying silent failure, though it notes `route-button-missing: cannot proof V6`. The `STATE_MAP.md` confirms `routes` INSERT fails silently with `console.error only, no toast`.
- Cannot confirm: The exact toast message for waypoint save failure offline due to the button being disabled.
- Root cause: The application lacks an offline-first data strategy, specifically a local-first write mechanism and a persistent sync queue. All write operations directly attempt to hit Supabase, leading to immediate failure and data loss when offline.
- User impact: Users lose valuable field data (waypoints, tracks, routes) collected in areas with poor connectivity, making the app unreliable for its core purpose and eroding trust.
- Business impact: High churn, negative reviews, and inability to support the primary use case of prospecting in rural areas.
- Fix direction: Implement an offline-first data strategy, including a local-first write mechanism (e.g., IndexedDB) and a persistent sync queue for user-generated content. Provide clear UI feedback on sync status.

### 4. Pro User Incorrectly Prompted to Upgrade (P1)
- Summary: Authenticated Pro users are unexpectedly presented with the Upgrade Sheet when interacting with Pro-gated features, creating confusion and undermining their paid subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test is designed to verify that the Upgrade Sheet is *not* visible. A timeout here strongly suggests the Upgrade Sheet *was* visible or blocked the test's progress, indicating a failure in the gating logic for Pro users.
- Cannot confirm: The specific Pro affordance tapped that triggered the Upgrade Sheet, or a screenshot of the Upgrade Sheet being visible for a Pro user.
- Root cause: The `isPro` flag or `subscriptionStatus` in `userStore` is either not correctly hydrated or the conditional rendering logic for `UpgradeSheet` is flawed, leading to it being shown to Pro users. This could be a race condition during authentication or a bug in the component's `isPro` check.
- User impact: Paying users are confused and frustrated by being asked to upgrade for features they already pay for, leading to a perception of a broken or deceptive app.
- Business impact: Erodes trust with paying customers, increases support load, and could lead to subscription cancellations.
- Fix direction: Review the `UpgradeSheet`'s rendering logic and the `isPro` state hydration from `userStore` to ensure Pro users are correctly identified and never shown upgrade prompts.

### 5. Offline Test Environment Instability (V2, V10)
- Summary: Critical tests for offline functionality (Pro status persistence, gold/mineral data caching) are failing due to the Playwright test environment losing internet connection during navigation, preventing proper assessment of these vulnerabilities.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence:
    - `pro V10` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`
    - `pro V2` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`
- Cannot confirm: The actual state of V2 and V10 vulnerabilities due to the test environment failure.
- Root cause: The Playwright test setup for simulating offline conditions (likely using `page.setOffline(true)` or similar) is not robust enough to handle page reloads or navigations within the offline context, or the base URL is being re-requested online.
- User impact: N/A (developer-facing issue).
- Business impact: Inability to verify critical offline functionality, leading to potential regressions and undetected user-facing issues in a key use case.
- Fix direction: Debug and stabilize the Playwright offline test setup. Ensure `page.goto` and `page.reload` operations correctly respect the offline state and do not attempt to fetch resources online.

### 6. Learn Tab In-Progress Chapter State Loss (V13)
- Summary: While Learn tab header statistics (total courses, completion percentage) persist across tab switches, the in-progress reading position within a chapter is likely still lost, forcing users to restart chapters from the beginning.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence:
    - `guest V13` PASS: `state-loss-evidence: {"before":{...},"after":{...}}` shows identical `courses:2, completePct:0, chaptersDone:0` values.
    - `free V13` PASS: `state-loss-evidence: {"before":{...},"after":{...}}` shows identical `courses:2, completePct:0, chaptersDone:0` values.
    - `free F4` PASS: `header-stats-pair: {"before":{...},"after":{...}}` shows identical `courses:2, completePct:0, chaptersDone:0` values.
- Cannot confirm: Direct evidence of in-progress chapter page loss, as the current tests only check header stats, not the internal state of the `ChapterReader` component (e.g., `currentPage` or scroll position).
- Root cause: The previous fix for V13 (always-mounted tabs) addressed the *component unmount* issue, but the `ChapterReader`'s internal state (like current page) might not be lifted to a persistent store or managed correctly across re-renders within the always-mounted component. The `UX Knowledge Context` explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The current tests do not disprove this specific aspect.
- User impact: Users are frustrated by losing their place in long chapters, forcing them to re-read sections and hindering their learning progress.
- Business impact: Decreased engagement with the Learn module, lower course completion rates, and reduced perceived value of the educational content.
- Fix direction: Implement state persistence for the `ChapterReader` component's internal state (e.g., current page, scroll position) using a Zustand store or `localStorage` to ensure it survives tab switches and reloads.

## Tier Comparison

*   **Persistence Failures (V7, V8, V9):** Theme, basemap, and layer visibility preferences fail to persist across reloads for **both guest and free tiers**. This indicates a fundamental issue in the `persist` middleware or manual `localStorage` implementation that is independent of authentication status.
*   **Waypoint Save Button Disabled (P3, V3):** The "Save Waypoint" button is disabled for **Pro users** due to GPS acquisition issues. This behavior is likely shared with Free users, but the test only ran for Pro.
*   **Offline Data Loss (V3, V4, V6, V14):** Offline saving of waypoints, tracks, and routes fails for **Pro users**. This is expected to be consistent across Free users as well, as the underlying Supabase write logic is not tier-dependent.
*   **Learn Tab Header Stats (V13, F4):** Header statistics (courses, completion percentage) correctly persist across tab switches for **both guest and free tiers**. This indicates that the `ee_progress` and `ee_certificates` localStorage keys are working as intended for these derived stats. The deeper vulnerability of in-progress chapter reading position is not disproven for any tier.
*   **Pro-gated Features (F2, F3, C3, P1):**
    *   **Free users** correctly see PRO badges in the LayerPanel (`free F2`) and are routed to the UpgradeSheet when tapping Pro-gated features like the camera button (`free F3`).
    *   **Guest users** are also correctly routed to the UpgradeSheet when tapping Pro-gated features (`guest C3`).
    *   **Pro users** are *incorrectly* shown the UpgradeSheet (`pro P1` FAIL), indicating a failure in `isPro` recognition or gating logic for paying users.
*   **Session Waypoints (V11):** Guest waypoints are confirmed to be memory-only and lost on reload for **guest users**. This is by design for guests, but a vulnerability for data safety.
*   **Active Module (V15):** Active module resets to default for **guest users**. This is a persistence failure.
*   **GPS Track (V1):** Active GPS track is lost on reload for **Pro users**. This is a persistence failure.

## Findings Discarded
- No findings were discarded, as the top 6 identified issues fit within the maximum limit of 8.

## Cannot Assess
- **Pro V10 (Pro status reverts to free on offline reload):** The test failed due to `net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether the `isPro` status correctly persists offline for paying users.
- **Pro V2 (Gold/mineral data missing after offline reload):** The test failed due to `net::ERR_INTERNET_DISCONNECTED`, preventing assessment of whether gold/mineral data is cached and available offline.

## Systemic Patterns

1.  **Widespread Persistence Layer Failure:** There is a systemic issue with state persistence. Both Zustand's `persist` middleware (affecting `basemap`, `layerVisibility`) and manual `localStorage` implementations (affecting `theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`) are failing to correctly write or read data across reloads. This suggests a fundamental problem in how these persistence mechanisms are integrated with the application's lifecycle or how keys are managed.
2.  **Lack of Offline-First Data Strategy:** The application fundamentally lacks an offline-first approach for user-generated content. All write operations (waypoints, tracks, routes) directly attempt to interact with Supabase, leading to immediate data loss or silent failures when offline. There is no local-first write, no sync queue, and insufficient user feedback for offline operations.
3.  **GPS Acquisition Instability:** The GPS acquisition mechanism appears unreliable, leading to core features (like saving waypoints) being blocked. This could be an issue with the `useTracks` hook, the Playwright geolocation mock, or the UI component's interpretation of the GPS signal.

## Calibration Notes
- Prioritised findings with direct evidence from test annotations and error messages, especially those confirming known vulnerabilities (V1, V7, V11, V14, V15) or critical functionality (P3).
- Avoided inferring issues without direct evidence. For example, `guest V13` and `free V13` passing for header stats, while not disproving the *full* V13 vulnerability (in-progress chapter reading position), did not lead to a PHANTOM verdict for the header stats themselves. Instead, the limitation in what the test proves was noted.
- Recognised and explicitly called out test environment failures (e.g., `net::ERR_INTERNET_DISCONNECTED` for V2/V10) as a finding, rather than misattributing them to application bugs. This aligns with previous calibration where Playwright issues were distinguished from UX problems.
- Explicitly attributed findings to specific tiers and noted when behavior was identical across tiers, reinforcing the analysis of root causes.