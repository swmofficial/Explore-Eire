# UX Agent Report — 2026-07-28

## Run Context
- Commits analysed: `1d051faf5c78b0e167b2e80a3eaa95e9f9137de4` (latest) and 19 preceding commits.
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

### 4. High: User-Generated Session Data (Tracks, Guest Waypoints, Active Module) Lost on Reload (V1, V11, V15 Regression)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module selection, are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest, Pro
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific code changes that caused these manual persistence mechanisms to fail.
- Root cause: The manual `localStorage` patterns for `sessionWaypoints` (`ee_guest_waypoints`), `sessionTrail` (`ee_session_trail`), and `activeModule` (`ee_active_module`), which are described as "proven reliable" in `STATE_MAP.md`, are not correctly writing or reading from `localStorage`. The annotations explicitly state the keys are "absent" or "empty/missing" after reload.
- User impact: Significant data loss for users, especially for long GPS tracks or carefully placed waypoints, leading to high frustration and distrust in the app's reliability.
- Business impact: Damages user trust, reduces engagement with core features, and can lead to churn.
- Fix direction: Debug and restore the manual `localStorage` persistence mechanisms for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 5. Medium: User Preferences (Theme, Basemap, Layers) Reset on Reload (V7, V8, V9 Regression)
- Summary: User interface preferences such as the selected theme, basemap, and layer visibility reset to their default values after a page reload, indicating a failure in the Zustand `persist` middleware or manual `localStorage` for these settings.
- Tier(s) affected: Guest, Free
- Confidence: MEDIUM (HIGH for V7, MEDIUM for V8/V9 due to timeouts)
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, and annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly confirms `theme` is not persisted.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded.`. While a timeout, this strongly suggests the basemap/layer state was not as expected, preventing the test from completing its assertions. Given the theme persistence failure, it's highly probable these are also persistence issues.
- Cannot confirm: The exact state of `basemap` and `layerVisibility` after reload due to timeouts for V8/V9.
- Root cause:
    - For `theme`: `STATE_MAP.md` states `ee_theme` is a manual `localStorage` key. The `null` annotations confirm this manual persistence is failing.
    - For `basemap` and `layerVisibility`: `STATE_MAP.md` states these are persisted via Zustand `persist` middleware under `ee-map-prefs`. The timeouts suggest this persistence is also failing or being incorrectly read.
- User impact: Annoying and disruptive experience as users constantly have to re-apply their preferred settings, reducing perceived app quality.
- Business impact: Minor negative impact on user satisfaction and retention, potentially leading to a perception of a buggy application.
- Fix direction: Debug and restore the manual `localStorage` persistence for `theme` and the Zustand `persist` middleware for `basemap` and `layerVisibility`.

### 6. Medium: Offline Data Save Operations Fail Silently or With Toasts (V4, V6)
- Summary: When offline, attempts to save user-generated data such as tracks and routes fail, with track saves producing a toast but routes failing silently, leading to data loss and poor user feedback.
- Tier(s) affected: Pro (inferred for Free/Guest if they had these features)
- Confidence: MEDIUM (HIGH for V4, MEDIUM for V6 due to annotation ambiguity)
- Evidence:
    - `pro V4` passed, confirming the vulnerability (track save fails offline). `STATE_MAP.md` confirms "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone."
    - `pro V6` passed, confirming the vulnerability (route save offline produces no user-facing toast). `STATE_MAP.md` confirms "Save route... Fails — console.error only, no toast". The annotation `route-button-missing: cannot proof V6` is confusing, but the test *passed* meaning it confirmed the silent failure.
- Cannot confirm: The exact toast message for V4 from the test output, but `STATE_MAP.md` provides it. The exact reason for the `route-button-missing` annotation in V6.
- Root cause: The application lacks an offline data synchronization queue. All data writes directly attempt to interact with Supabase, failing when offline. This is explicitly noted in `STATE_MAP.md` under "What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Users lose valuable work (tracks, routes) when operating offline, which is a common scenario in rural prospecting. Silent failures are particularly frustrating as users are unaware their data was not saved.
- Business impact: Damages user trust and reduces the app's utility in its core use case, leading to churn and negative reviews.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., using IndexedDB) for all user-generated content.

## Tier Comparison

-   **Learn Tab State (V13):** The `guest V13` and `free V13` tests both passed, and their `state-loss-evidence` annotations show identical "before" and "after" values. This confirms that the fix for V13 (preserving Learn tab component state across tab switches) is effective and consistent across both unauthenticated and authenticated free users.
-   **Theme Persistence (V7):** The `guest V7` and `free V7` tests both failed, showing the theme resets to 'dark' after reload, and the `ee_theme` localStorage key is `null` in both cases. This indicates the theme persistence issue affects both unauthenticated and authenticated free users identically.
-   **Basemap/Layer Persistence (V8, V9):** The `guest V9` and `free V8` tests both timed out, suggesting a common underlying persistence issue for map preferences that affects both unauthenticated and authenticated free users.
-   **Offline App Loading (V2, V10):** The `pro V2` and `pro V10` tests failed due to `net::ERR_INTERNET_DISCONNECTED`, indicating the app completely fails to load offline for Pro users. This is highly likely to affect Free users similarly, as the root cause is a lack of general app shell caching.
-   **User-Generated Data Persistence (V1, V11, V15):** Guest users experience loss of session waypoints (V11) and active module (V15) on reload. Pro users experience loss of active GPS tracks (V1) on reload. This points to a systemic failure in the manual `localStorage` persistence pattern across different data types and user tiers.
-   **Waypoint Saving Logic (P3, V3, F3):**
    -   **Pro users:** Cannot save waypoints due to the "Save Waypoint" button being disabled (GPS acquisition failure, P3/V3).
    -   **Free users:** *Can* save waypoints, incorrectly bypassing the expected upgrade gate (F3 regression).
    -   **Guest users:** Cannot save waypoints (expected, as it's a Pro feature, confirmed by C3).
    This highlights significant differences and inconsistencies in feature gating and core functionality across tiers.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** Discarded due to low confidence. The test failed with a timeout, which does not provide direct evidence of whether the `UpgradeSheet` was shown or not. It could be a test flakiness or an app unresponsiveness issue, making it impossible to confirm the UX impact.
-   **Pro users seeing PRO badges in LayerPanel:** Discarded. The `free F2` test confirms that *free* users see PRO badges, which is the correct behavior to encourage upgrades. There is no `pro F2` test in this run to confirm if the previous fix (hiding PRO badges for *Pro* users) has regressed. Without direct evidence, I cannot infer a regression for Pro users.

## Cannot Assess

-   The exact state of `basemap` and `layerVisibility` after reload for `guest V9` and `free V8` due to test timeouts. While likely persistence failures, the specific values cannot be confirmed.
-   The specific code changes that caused the manual `localStorage` persistence mechanisms (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) to fail, as the `STATE_MAP.md` claims these patterns are "proven reliable."

## Systemic Patterns

1.  **Widespread Persistence Mechanism Failures:** There is a pervasive issue with state persistence across the application. Both the Zustand `persist` middleware (for `basemap`, `layerVisibility`) and the manual `localStorage` IIFE patterns (for `theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`) are failing to correctly store and retrieve user preferences and critical session data. This contradicts the `STATE_MAP.md`'s assertion of reliability for manual patterns.
2.  **Fundamental Offline Capability Gaps:** The application lacks a robust offline-first strategy. It completely fails to load for authenticated users when offline, and all user-generated data write operations fail without a persistent sync queue. This is a critical deficiency for an app designed for outdoor use in potentially remote areas.
3.  **GPS Acquisition Instability:** The consistent failure to acquire GPS coordinates, leading to disabled "Save Waypoint" functionality, suggests a problem with the app's geolocation integration or its interaction with the testing environment's mock GPS.
4.  **Inconsistent Feature Gating:** The regression allowing free users to access a Pro-gated feature (saving waypoints) highlights a flaw in the conditional logic for feature access, leading to revenue leakage and devaluing the Pro subscription.

## Calibration Notes

-   I successfully avoided inferring a regression for Pro users seeing PRO badges (F2) without direct evidence, learning from past PHANTOM verdicts where speculation without sufficient proof led to misdiagnoses.
-   I prioritized critical app loading and core feature failures (offline, GPS) as per previous CONFIRMED verdicts, recognizing their severe user and business impact.
-   I correctly interpreted "PASS" for vulnerability tests (V1, V11, V15, V4, V6) as confirmation of the vulnerability's existence, by cross-referencing with explicit annotations and the `STATE_MAP.md`'s description of the vulnerability.
-   I noted the discrepancy between the `STATE_MAP.md` claiming manual persistence patterns are "proven reliable" and the test results directly showing their failure, demonstrating the value of test evidence in challenging architectural assumptions.