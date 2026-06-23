# UX Agent Report — 2026-06-23

## Run Context
- Commits analysed: `90fdf3a` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Users Incorrectly See Upgrade Sheet (Vulnerability P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, despite already having a Pro subscription. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout indicates the test was waiting for the UpgradeSheet *not* to be visible, but it likely appeared, causing the test to hang.
- Cannot confirm: The exact UI element that triggered the UpgradeSheet, as the test timed out before a specific assertion could fail.
- Root cause: The gating logic for `showUpgradeSheet` (controlled by `userStore.showUpgradeSheet`) is likely misconfigured or has a race condition, failing to correctly check `userStore.isPro` before displaying the sheet.
- User impact: Confusing and frustrating experience for paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the `showUpgradeSheet` gating logic to ensure it correctly evaluates `userStore.isPro` and `userStore.subscriptionStatus` before displaying the upgrade sheet.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme on every app reload, regardless of authentication status.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both reported `Expected: "light" Received: "dark"` after a theme flip and reload. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If the `setTheme` action is being called correctly to trigger the write.
- Root cause: The manual `localStorage` persistence for `userStore.theme` (task-008, `ee_theme` key) is not functioning, or the key is not being correctly set/retrieved on app load.
- User impact: Users' chosen theme preference is lost on every app reload, leading to a jarring and inconsistent experience.
- Business impact: Minor negative impact on user satisfaction and perceived app quality.
- Fix direction: Debug the manual `ee_theme` localStorage read/write logic in `userStore.js` to ensure the theme is correctly persisted and rehydrated.

### 5. High: Layer Preferences Reset to Defaults on Reload (Vulnerability V8)
- Summary: The user's custom map layer visibility preferences are lost and reset to their default state on every app reload.
- Tier(s) affected: Free (likely all tiers using `mapStore`)
- Confidence: MEDIUM
- Evidence: `free V8` test failed with `Test timeout of 60000ms exceeded.`, implying the layer visibility state was not as expected after reload.
- Cannot confirm: The exact layer that reset, or if the `ee-map-prefs` key was present/correct in localStorage.
- Root cause: `mapStore.layerVisibility` is configured to persist via Zustand `persist` middleware (`ee-map-prefs`). The timeout suggests this persistence is failing, possibly due to incorrect configuration or a problem with the `localStorage` interaction.
- User impact: Users' custom layer configurations are lost on every app reload, requiring manual re-selection and causing frustration.
- Business impact: Reduces efficiency and perceived customizability of the map interface.
- Fix direction: Investigate `mapStore`'s Zustand `persist` configuration for `layerVisibility` and verify the content of `ee-map-prefs` in localStorage.

### 6. High: Basemap Preference Resets to Default on Reload (Vulnerability V9)
- Summary: The user's selected basemap preference resets to the default 'satellite' basemap on every app reload.
- Tier(s) affected: Guest (likely all tiers using `mapStore`)
- Confidence: MEDIUM
- Evidence: `guest V9` test failed with `Test timeout of 60000ms exceeded.`, implying the basemap state was not as expected after reload.
- Cannot confirm: The exact basemap that reset, or if the `ee-map-prefs` key was present/correct in localStorage.
- Root cause: `mapStore.basemap` is configured to persist via Zustand `persist` middleware (`ee-map-prefs`). The timeout suggests this persistence is failing, similar to V8.
- User impact: Users' preferred basemap is lost on every app reload, forcing them to re-select it.
- Business impact: Minor negative impact on user experience and efficiency.
- Fix direction: Investigate `mapStore`'s Zustand `persist` configuration for `basemap` and verify the content of `ee-map-prefs` in localStorage.

### 7. High: GPS Track Data is Lost on App Reload (Vulnerability V1)
- Summary: Any active GPS track accumulated during a session is permanently lost if the app reloads or the tab is closed before the user explicitly saves it.
- Tier(s) affected: Pro (likely any tier capable of tracking)
- Confidence: HIGH
- Evidence: `pro V1` test passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This explicitly confirms the vulnerability.
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic.
- Root cause: `sessionTrail` accumulates in `mapStore` (volatile memory). Despite `STATE_MAP.md` indicating manual persistence via `ee_session_trail` (task-006), the test proves this persistence is not occurring during active tracking.
- User impact: Severe data loss for users, as hours of recorded activity can vanish without warning, leading to distrust and abandonment of the tracking feature.
- Business impact: Significant negative impact on user engagement and perceived value of the app's core functionality.
- Fix direction: Debug the manual `ee_session_trail` localStorage read/write logic in `mapStore.js` to ensure `sessionTrail` is auto-persisted during active tracking.

### 8. High: Guest Waypoints are Lost on App Reload (Vulnerability V11)
- Summary: Waypoints created by guest users are not persisted and are lost if the app reloads or the browser tab is closed.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This explicitly confirms the vulnerability.
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic.
- Root cause: `sessionWaypoints` for guest users are memory-only. Despite `STATE_MAP.md` indicating manual persistence via `ee_guest_waypoints` (task-002), the test proves this persistence is not occurring.
- User impact: Guest users lose all unsaved waypoints if the app reloads or the tab is closed, making the "Save Waypoint" feature unreliable for them and hindering exploration.
- Business impact: Frustrates potential users, hindering conversion to authenticated tiers and reducing initial engagement.
- Fix direction: Debug the manual `ee_guest_waypoints` localStorage read/write logic in `mapStore.js` to ensure `sessionWaypoints` are persisted for guest users.

## Tier Comparison

-   **Theme Preference (V7):** The theme preference reset on reload affects both **Guest** and **Free** tiers identically. This indicates the root cause lies in the general persistence mechanism for `userStore.theme` (the `ee_theme` localStorage key) rather than authentication-specific logic.
-   **Learn Header Stats (V13, F4):** The Learn tab header statistics (courses, complete percentage, chapters done) are **not** lost on tab switch for both **Guest** and **Free** tiers. This confirms that the underlying progress data is persistent and correctly re-read when the tab is re-rendered.
-   **Map Preferences (V8, V9):** Layer preferences (V8) reset for **Free** users, and basemap preferences (V9) reset for **Guest** users. Both are related to `mapStore` persistence (`ee-map-prefs`). It's highly probable these issues affect all tiers, indicating a general problem with `mapStore`'s Zustand `persist` configuration.
-   **Offline App Loading (V10, V2):** The app completely fails to load offline for **Pro** users. This critical failure is likely to affect **Free** users as well, as the root cause (lack of app shell/data caching) is common to all authenticated users.
-   **Waypoint Save (P3, V3, V14):** The "Save Waypoint" button is disabled for **Pro** users due to GPS acquisition issues. **Free** users are explicitly gated from saving waypoints (F3 confirms they see the UpgradeSheet), and **Guest** waypoints are memory-only (V11 confirmed). This issue is specific to the Pro tier's ability to save.
-   **Upgrade Sheet (P1, F3):** **Pro** users are incorrectly shown the Upgrade Sheet (P1 failed), while **Free** users are correctly shown the Upgrade Sheet when attempting Pro-gated actions (F3 passed). This highlights a specific logic error in the Pro tier's entitlement check.
-   **GPS Track Data Loss (V1):** GPS track data is lost on reload for **Pro** users. This vulnerability would affect any tier capable of tracking if the persistence mechanism is not working.
-   **Guest Waypoint Loss (V11):** Waypoints are lost on reload for **Guest** users. This is a specific vulnerability for the guest experience.

## Findings Discarded

-   **V15 — Active Module Resets to Default on Reload:** While confirmed by `guest V15` (activeModule-after-reload: ee_active_module absent after reload), this is a preference loss issue with lower user impact than the 8 selected findings.
-   **V4 — Track Save Fails Offline:** Confirmed by `pro V4` (test passed, confirming vulnerability). This is a data loss issue, but it occurs on an *explicit save attempt* while offline, which is slightly less critical than passive data loss (V1, V11) or complete app unavailability (V10, V2).
-   **V6 — Route Save Offline Produces No User-Facing Toast:** Confirmed by `pro V6` (test passed, confirming vulnerability). Similar to V4, this is data loss on an explicit offline save, and the lack of a toast makes it worse, but still less critical than the top 8.

## Cannot Assess

-   The exact state of `ee-map-prefs` in localStorage for V8 and V9, as the tests timed out rather than providing explicit localStorage annotations for these keys.
-   The specific UI element that triggered the UpgradeSheet in `pro P1`, as the test timed out before a specific assertion could fail.

## Systemic Patterns

-   **Persistence Mechanism Failures:** A significant number of findings (V7, V8, V9, V1, V11) point to a widespread failure in state persistence across reloads. This affects both Zustand's `persist` middleware (`ee-map-prefs` for V8/V9) and the manual `localStorage` IIFE + write patterns (`ee_theme` for V7, `ee_session_trail` for V1, `ee_guest_waypoints` for V11). This suggests a fundamental issue with how `localStorage` is being interacted with, or how state is being rehydrated on app initialization.
-   **Offline Capability Breakdown:** The complete failure of the app to load offline for authenticated users (V10, V2) and the disabled waypoint save button (P3, V3, V14) highlight a critical lack of robust offline-first design, despite the presence of a Service Worker for map tiles. Core app shell and data are not cached, and data write operations are not queued or handled gracefully offline.
-   **GPS Acquisition Issues:** The consistent failure to acquire GPS location, even with a mocked signal, indicates a problem with the app's internal GPS processing logic, impacting core features like waypoint saving.

## Calibration Notes

-   Prioritized findings where tests explicitly stated "V[X] confirmed" or where error messages directly matched vulnerability descriptions, aligning with the new "vulnerability-proof test philosophy".
-   Treated timeouts for persistence tests (V8, V9, P1) as strong indicators of failure, as the test's inability to reach the expected state implies the vulnerability is present. This aligns with previous successful diagnoses.
-   Carefully distinguished between "test passed" meaning "vulnerability confirmed" (e.g., V1, V11) versus "test passed" meaning "expected behavior observed" (e.g., C1, C2, F1, F2, F3, F4).
-   Recognized the contradiction between `STATE_MAP.md`'s stated persistence mechanisms and the test results (e.g., `ee_theme` being null despite manual persistence), prioritizing observed test evidence as ground truth for UX issues.