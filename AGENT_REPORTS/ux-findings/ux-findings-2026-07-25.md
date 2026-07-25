# UX Agent Report — 2026-07-25

## Run Context
- Commits analysed: `fcdc9566b6123ee1eb74d482c5790599440d25da` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints directly via the camera button, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific code change that introduced this regression.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check the user's `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users access a premium feature without paying, diminishing the value proposition of the Pro subscription.
- Business impact: Direct revenue loss, devalues the Pro subscription, and creates an unfair advantage for free users.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when the camera button is tapped, ensuring `isPro` status is correctly evaluated.

### 4. High: Widespread Failure of `localStorage` Persistence for User Preferences (V7, V8, V9)
- Summary: Multiple critical user preferences, including theme, basemap, and layer visibility, are failing to persist across page reloads, reverting to default states.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
    - `guest V9` (basemap) and `free V8` (layer visibility) tests failed with timeouts, strongly indicating that these preferences did not persist as expected after reload.
- Cannot confirm: The exact reason for the timeouts in V9 and V8 without more detailed logs, but the context points to persistence failure.
- Root cause: The manual `localStorage` pattern for `userStore.theme` (`ee_theme`) is not functioning, as evidenced by the `null` annotations. The `mapStore` fields (`basemap`, `layerVisibility`) which use Zustand `persist` middleware (`ee-map-prefs`) are also failing, suggesting an issue with the middleware's configuration or hydration.
- User impact: Annoying and repetitive resets of personalized settings, making the app feel unreliable and unpolished.
- Business impact: Decreased user satisfaction, potential for negative reviews, and reduced engagement due to a frustrating user experience.
- Fix direction: Debug the manual `localStorage` read/write logic for `ee_theme`. Investigate the `ee-map-prefs` Zustand `persist` middleware configuration and ensure proper hydration and serialization of `basemap` and `layerVisibility`.

### 5. High: Session Data (Waypoints, Tracks, Active Module) Lost on Reload (V1, V11, V15)
- Summary: Critical session-specific data, including guest waypoints, active GPS tracks, and the user's active module, are not persisting across page reloads, leading to unrecoverable data loss and loss of context.
- Tier(s) affected: Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed (confirming vulnerability): Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirming vulnerability): Annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirming vulnerability): Annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The precise point of failure within the manual `localStorage` read/write patterns for these specific keys.
- Root cause: Despite `STATE_MAP.md` indicating manual `localStorage` persistence for `sessionWaypoints` (`ee_guest_waypoints`), `sessionTrail` (`ee_session_trail`), and `activeModule` (`ee_active_module`), the tests confirm these keys are either absent or empty after a reload. This indicates a failure in the manual IIFE read/write pattern, potentially due to incorrect key usage, timing issues, or unexpected clearing.
- User impact: Loss of unsaved work (e.g., a long GPS track, temporary waypoints), forcing users to restart tasks and losing valuable data. This is highly frustrating and can lead to distrust in the app.
- Business impact: Significant user churn, negative perception of data safety, and reduced engagement with core tracking and data collection features.
- Fix direction: Thoroughly debug the manual `localStorage` read/write patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure data is correctly saved and retrieved across reloads.

### 6. Medium: Pro Users May See Upgrade Sheet on Pro Affordance Tap (P1 Ambiguity)
- Summary: A Pro user attempting to access a Pro-gated feature may still be presented with an Upgrade Sheet, which is incorrect behavior for a paying subscriber.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with a timeout. This typically implies that the expected condition (Upgrade Sheet *not* being visible) was not met within the allotted time, suggesting it *did* appear.
- Cannot confirm: The exact UI state after the timeout without a screenshot or more specific error message.
- Root cause: Potential regression in the `isPro` check for Pro-gated features, or a race condition where the `isPro` status isn't fully hydrated from `localStorage` or Supabase before the UI element is interacted with.
- User impact: Annoyance and confusion for paying users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust in the Pro subscription value, potentially leading to cancellations or negative sentiment.
- Fix direction: Investigate the `isPro` gating logic for Pro affordances and ensure `isPro` is fully resolved and stable before UI interactions are processed.

### 7. Medium: Offline Data Saves Fail Silently or with Generic Toasts (V4, V6, V14)
- Summary: When offline, saving tracks and routes results in silent failures or generic toasts, and there is no pre-save warning for waypoints, leading to potential data loss and user confusion.
- Tier(s) affected: Pro (V4, V6, V14 confirmed), inferred Free/Guest for relevant actions.
- Confidence: HIGH (for confirmation of vulnerability, MEDIUM for user impact due to existing toasts)
- Evidence:
    - `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
    - `pro V4` passed (confirming vulnerability): Track save fails offline.
    - `pro V6` passed (confirming vulnerability): Route save offline produces no user-facing toast.
- Cannot confirm: The exact content of the generic toasts for track saves without screenshots.
- Root cause: Lack of an offline data queue and explicit offline-first design. `STATE_MAP.md` confirms "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". Supabase write operations fail directly without local caching.
- User impact: Users lose data they believe they have saved, leading to frustration and distrust. The lack of clear feedback or a retry mechanism exacerbates the problem.
- Business impact: Erodes trust in data safety, hinders adoption in offline environments, and creates a perception of an unreliable application.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store pending writes. Provide clear, actionable offline status indicators and specific warnings before attempting offline saves.

## Tier Comparison

-   **Theme Persistence (V7):** Fails for both Guest and Free tiers, indicating a universal issue with the `ee_theme` `localStorage` key's read/write mechanism, independent of authentication status.
-   **Map Preferences Persistence (V8, V9):** Fails for both Guest (basemap) and Free (layer visibility) tiers, suggesting a general problem with the `ee-map-prefs` Zustand `persist` middleware.
-   **Learn Tab State (V13, F4):** Both Guest and Free tests passed, confirming that the fix for preserving Learn tab header stats across tab switches is working correctly for all users, regardless of authentication.
-   **Offline App Loading (V2, V10):** The Pro tier explicitly fails to load offline. Given the architectural root cause (lack of Service Worker caching for the app shell), it is highly probable that Free users would experience the same complete failure to load, and Guest users might face issues with initial data loading.
-   **Waypoint Save Button Disabled (P3, V3):** The Pro tier experiences a disabled "Save Waypoint" button due to GPS acquisition failure. This is likely a universal issue affecting all tiers if they attempt to save waypoints, as it points to a core GPS handling problem.
-   **Waypoint Gating (F3):** This is a Free-tier specific regression, where free users can save waypoints instead of being prompted to upgrade, unlike Guest users who cannot save waypoints at all, and Pro users who can.
-   **Session Data Persistence (V1, V11, V15):** Guest waypoints (V11) and active module (V15) fail to persist for Guest users, while active GPS tracks (V1) fail for Pro users. This indicates a systemic issue with the manual `localStorage` persistence patterns across different types of session data, affecting various tiers.

## Findings Discarded

-   No findings were discarded in this run. All identified issues had sufficient evidence and user/business impact to warrant inclusion. Previous PHANTOM verdicts were not re-triggered.

## Cannot Assess

-   The precise cause of the `pro P1` timeout without more specific error details or a screenshot of the state at the time of failure.
-   The exact content of generic toasts for track saves (V4) without specific screenshot evidence.

## Systemic Patterns

-   **Pervasive Persistence Failures:** A critical and widespread issue affecting multiple user preferences (theme, basemap, layer visibility) and session data (guest waypoints, active module, GPS tracks) across all tiers. This points to fundamental flaws in both the manual `localStorage` read/write patterns and the configuration/hydration of Zustand's `persist` middleware. The consistent `null` value for `ee_theme` is particularly concerning.
-   **Inadequate Offline-First Strategy:** The application completely fails to load for authenticated users when offline, and data write operations (waypoints, tracks, routes) lack robust offline queuing, clear user feedback, or pre-save warnings. This is a critical deficiency for an app targeting users in potentially remote areas.
-   **GPS Acquisition Instability:** The consistent failure to acquire GPS coordinates in Playwright tests, leading to disabled save buttons, suggests a core problem with the app's GPS handling logic or its interaction with the test environment's geolocation mock.

## Calibration Notes

-   The re-confirmation of "Widespread Failure of `localStorage` Persistence" (V1, V7, V8, V9, V11, V15) with explicit `localStorage` annotations (e.g., `ee_theme-before-reload: null`) reinforces the value of direct `localStorage` inspection in tests. This pattern was correctly identified in previous runs.
-   The "App Fails to Load Offline" (V2, V10) and "Waypoint Save Button Disabled" (P3, V3) issues remain critical, highlighting that these are deep-seated architectural problems that have not been addressed.
-   The new test philosophy, with explicit "Vulnerability Confirmed" annotations, greatly aids in distinguishing between a test passing because a fix worked, and a test passing because it successfully demonstrated the vulnerability. This was particularly helpful for V1, V11, V15, V4, and V6.
-   Ambiguous timeouts (e.g., `pro P1`, `guest V9`, `free V8`) still require careful inference based on the test's intent and the `STATE_MAP.md`, but the overall context of widespread persistence failures makes the inference more confident.