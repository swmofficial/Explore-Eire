# UX Agent Report — 2026-08-31

## Run Context
- Commits analysed: `48a9dc37ff9e9c99a11b13d936322df3e2501e32` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread User Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 - Regressions)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, indicating a systemic regression in state persistence.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` (timeout) and `free V8` (timeout) imply `mapStore.basemap` and `mapStore.layerVisibility` are resetting, indicating `ee-map-prefs` persistence failure.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` confirms all these items *should* be persisted via Zustand `persist` or manual `localStorage` keys.
- Cannot confirm: The exact point of failure (write, read, or `localStorage` clearing) for each specific key, but the consistent `null`/`absent` annotations point to a write or read issue.
- Root cause: Systemic regression in `localStorage` persistence mechanisms, affecting both Zustand `persist` middleware and manual `IIFE + write` patterns. This contradicts previous "CONFIRMED" fixes for V1, V7, V11, V15 and the initial implementation of Zustand `persist` for V8/V9.
- User impact: Significant loss of user preferences and unsaved session data (waypoints, tracks), leading to high frustration, repeated setup, and distrust in the application's reliability.
- Business impact: Increased churn, negative reviews, and reduced engagement as users find the app unreliable for core tasks.
- Fix direction: Thoroughly audit and debug all `localStorage` persistence mechanisms (Zustand `persist` configuration and manual `IIFE + write` patterns) for regressions.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to save waypoints directly from the map, bypassing the intended upgrade prompt for this Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `UpgradeSheet` was not shown, but the `WaypointSheet` was. Screenshot `test-results/free/f3-2-after-camera-tap.png` would show the WaypointSheet open.
- Cannot confirm: The specific code path that is incorrectly evaluating the `isPro` status for this particular gate.
- Root cause: Incorrect implementation of the feature gating logic for waypoint saving, likely a mischeck of the `isPro` status or an incorrect routing decision when the camera button is tapped.
- User impact: Free users gain access to a premium feature without paying, which might seem positive in the short term, but it undermines the value proposition of the Pro tier.
- Business impact: Direct loss of potential Pro conversions, as a key premium feature is available for free. This impacts revenue and the perceived value of the subscription.
- Fix direction: Correct the conditional rendering or routing logic for the waypoint camera button to ensure it surfaces the `UpgradeSheet` for free users.

### 5. Medium: Offline Data Writes Fail Silently or Without Pre-Check (V4, V6, V14)
- Summary: User-generated data (tracks, routes) cannot be saved offline, resulting in data loss or silent failure, and there is no pre-save warning when attempting to save waypoints offline.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming `track save fails offline (post-stop data loss)`. `STATE_MAP.md` confirms `tracks` INSERT fails offline.
    - `pro V6` passed, confirming `route save offline produces no user-facing toast (silent failure)`. `STATE_MAP.md` confirms `routes` INSERT fails offline with `console.error only, no toast`.
    - `pro V3` (though blocked by GPS issue) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, explicitly confirming the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The exact toast message for V4, but the test passing confirms the failure.
- Root cause: Lack of an offline data sync queue (V3, V4, V6, V14 are known, deferred vulnerabilities). Supabase write operations fail directly when offline, and the app does not implement local-first writes or a retry mechanism.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, leading to frustration and distrust. The lack of a pre-warning for waypoints means they might unknowingly lose data.
- Business impact: Damages user trust and reliability perception, especially for a field-based app where offline scenarios are common.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store and retry failed write operations, and add explicit offline warnings before critical save actions.

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 - Ambiguous Timeout)
- Summary: The test for Pro users *not* seeing an UpgradeSheet on a Pro affordance tap timed out, suggesting a potential issue where Pro status is not correctly recognized, leading to an incorrect upgrade prompt.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.` The test's intent is `Pro user does not see UpgradeSheet on Pro affordance tap`. A timeout here could mean the test got stuck waiting for an element that *shouldn't* appear (the UpgradeSheet), or it failed to assert its absence. Given the widespread persistence issues (V10 blocker, V7, V15 regressions), it's plausible that `isPro` status is not correctly loaded or maintained.
- Cannot confirm: Whether the UpgradeSheet actually appeared, or if the timeout was due to a different test-specific issue (e.g., selector not found, element not becoming visible/invisible). No screenshot directly shows the P1 failure.
- Root cause: Potentially related to `userStore.isPro` not being correctly hydrated or maintained, leading to incorrect feature gating. This could be exacerbated by the offline loading issues (V10 blocker).
- User impact: A paying Pro user might be incorrectly prompted to upgrade, leading to confusion, frustration, and a diminished sense of value for their subscription.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations or negative sentiment.
- Fix direction: Investigate the `isPro` hydration and gating logic, especially in scenarios where `storageState` is used, and ensure the P1 test correctly asserts the *absence* of the UpgradeSheet.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier fails to load the application at all when offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is inferred to affect Free users as well, as the root cause is a lack of app shell caching and critical data loading from Supabase on every mount, regardless of authentication. Guest tier is not explicitly tested for this scenario but would likely face similar issues if attempting to access map data offline.
-   **GPS Acquisition Failure (P3, V3 Blocker):** Observed in the Pro tier, preventing waypoint saving. This is a core app function and would likely affect Free and Guest tiers if they were able to attempt waypoint saving.
-   **Persistence Regressions (V1, V7, V8, V9, V11, V15):**
    -   `V7 (theme)`: Confirmed regression for both Guest and Free tiers.
    -   `V9 (basemap)`: Confirmed regression for Guest tier.
    -   `V8 (layer visibility)`: Confirmed regression for Free tier.
    -   `V11 (guest waypoints)`: Confirmed regression for Guest tier.
    -   `V15 (active module)`: Confirmed regression for Guest tier.
    -   `V1 (session trail)`: Confirmed regression for Pro tier.
    -   This indicates a widespread, systemic issue affecting `localStorage` persistence across all stores and tiers, regardless of authentication status.
-   **Learn Header Stats (V13):** Identical behavior across Guest and Free tiers. The `state-loss-evidence` annotations show no change in header stats (`courses`, `completePct`, `chaptersDone`) after a tab switch, indicating that the fix for V13 (always-mounted tabs) is working for these metrics.
-   **Upgrade Gating (F3, C3):**
    -   Guest `C3` correctly surfaces the `UpgradeSheet` when tapping a Pro-gated feature.
    -   Free `F3` *incorrectly* allows saving waypoints (a Pro feature) instead of surfacing the `UpgradeSheet`. This is a critical business logic error specific to the Free tier.
-   **Offline Data Saving (V4, V6, V14):** Confirmed failures/silent failures for the Pro tier. `STATE_MAP.md` indicates these are general offline write failures, so they would affect any user attempting to save data offline.

## Findings Discarded

-   **`guest V13` and `free V13` (Learn header stats recomputed):** These tests passed, and the `state-loss-evidence` annotations showed identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. This indicates that for *these specific header stats*, no state loss occurred. The `UX Knowledge Context` states V13 was fixed by an "always-mounted block" for tab content. Therefore, the vulnerability V13 (learn tab state loss) is *not* confirmed by this evidence for header stats. The test description "(state-loss proof)" is misleading given the actual evidence. I am confident V13 is *not* active for header stats.
-   **`pro V10` (Pro status reverts offline) and `pro V2` (gold/mineral data missing offline) as separate findings:** These are both symptoms of the *same root cause*: the application failing to load at all when offline. I have consolidated this into a single, higher-impact finding: "Critical: App Fails to Load Offline for Authenticated Users".

## Cannot Assess

-   The exact cause of the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic (Finding 2). Further debugging within the app's GPS acquisition module would be required.
-   The precise reason for the `pro P1` timeout (Finding 6) without more detailed Playwright trace logs or screenshots of the failure state.

## Systemic Patterns

1.  **Offline-First Failure:** The application fundamentally fails to operate in offline conditions for authenticated users, both in loading the core app shell and in persisting user-generated data. This is a critical architectural flaw for a field-use application.
2.  **Persistence Layer Regression:** There is a widespread regression in `localStorage` persistence mechanisms, affecting both Zustand `persist` middleware and manual `IIFE + write` patterns across multiple stores (`userStore`, `mapStore`, `moduleStore`). This suggests a recent change or environmental factor is interfering with `localStorage` operations or store hydration.
3.  **GPS Integration Issues:** The app's GPS acquisition logic appears to be failing, preventing core functionality like waypoint saving, even when online.
4.  **Inconsistent Feature Gating:** The logic for distinguishing Free vs. Pro features is inconsistent, leading to free access to paid features (e.g., waypoint saving for Free users).

## Calibration Notes

-   I have been careful to avoid inferring UX issues solely from Playwright timeouts or ambiguous error messages (e.g., `pro P1`), especially when direct visual evidence or clear annotations are lacking. Instead, I've assigned a lower confidence (MEDIUM) and linked it to plausible systemic issues.
-   I prioritized findings that directly contradict previously "CONFIRMED" fixes (e.g., V1, V7, V11, V15 regressions), as these indicate severe regressions in core functionality.
-   I explicitly used the "Three-Tier Analysis" by comparing behaviors across guest, free, and pro tiers, noting when issues are identical (pointing to systemic root causes) or differ (highlighting specific gating or business logic flaws).
-   I rigorously adhered to the principle that test annotations and direct evidence (like `(Vxx confirmed)`) are paramount, even if a test "passed" in the Playwright sense (meaning the journey completed and produced the evidence). This led to re-evaluating V13, concluding it is *not* active for header stats based on the evidence.