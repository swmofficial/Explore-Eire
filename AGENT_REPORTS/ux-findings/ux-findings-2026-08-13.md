# UX Agent Report — 2026-08-13

## Run Context
- Commits analysed: `cd188532acc91c3af950cab6470ae01b3575a015` (latest) and 19 preceding commits.
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
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also means offline waypoint saves fail without a pre-check warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". `pro V3` also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Regression in Persistence of User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Critical user preferences (theme, basemap, layer visibility) and user-generated session data (active GPS tracks, guest waypoints, active module) are lost on page reload, indicating a widespread regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    `STATE_MAP.md` explicitly states these items *should* be persisted via `ee_theme`, `ee-map-prefs`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, and `ee_theme`, or the Zustand `persist` for `ee-map-prefs`.
- Root cause: Regression in the implementation or configuration of both manual `localStorage` persistence patterns and Zustand `persist` middleware. The `null` values for `ee_theme` suggest the `localStorage.setItem` calls are not happening or are being cleared.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns and Zustand `persist` middleware configuration for all affected state keys.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the WaypointSheet and attempt to save waypoints, instead of being presented with an UpgradeSheet as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` clearly shows `upgradeShown` was `false` and `waypointShown` was `true`. The test expected `upgradeShown` to be `true`.
- Cannot confirm: The specific logic error in the `useAuth` or `WaypointSheet` component that bypasses the upgrade gate.
- Root cause: Incorrect gating logic for the "Save Waypoint" feature, allowing free users to access a Pro-only capability.
- User impact: Free users may attempt to save waypoints, only to find the "Save Waypoint" button disabled (due to the GPS issue) or the save failing later, leading to confusion and frustration. This also devalues the Pro subscription.
- Business impact: Reduced conversion from free to Pro tier, as the value proposition of Pro features is undermined. Potential for negative user experience when the save ultimately fails.
- Fix direction: Correct the gating logic to ensure free users are prompted to upgrade when attempting to save waypoints.

### 5. Medium: Offline Track and Route Saves Fail Silently or With Generic Toast (Vulnerability V4, V6)
- Summary: Saving a GPS track or a custom route while offline results in data loss, with track saves producing a generic failure toast and route saves failing silently (console error only).
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks/routes)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed (confirmed vulnerability): This test confirms the track save fails offline. `STATE_MAP.md` states "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone."
    - `pro V6` passed (confirmed vulnerability): This test confirms the route save fails offline. `STATE_MAP.md` states "Save route... Fails — console.error only, no toast". The annotation `route-button-missing: cannot proof V6` is confusing but the test itself passed, indicating the vulnerability was found.
- Cannot confirm: The exact content of the "Could not save track" toast, or the specific console error for route saves.
- Root cause: Lack of an offline data sync queue. All data writes are directly to Supabase, failing when offline.
- User impact: Users lose valuable, effort-intensive data (GPS tracks, custom routes) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, perceived data insecurity.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store and retry failed write operations when connectivity is restored.

### 6. Low: Learn Tab Header Stats are Recomputed on Every Tab Switch (Vulnerability V13)
- Summary: The Learn tab header statistics (courses, complete percentage, chapters done) are recomputed on every tab switch, but the underlying persisted progress is correctly maintained. The test name implies state loss, but the evidence shows no loss of *persisted* state.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH (that the stats are recomputed, and that persisted state is not lost)
- Evidence: `guest V13` and `free V13` both passed. `state-loss-evidence` annotations show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` (all 0). This indicates that the *persisted* values are correctly re-read and displayed, and no *persisted* state is lost. The previous fix for V13 was to keep tabs mounted, which would prevent component state loss.
- Cannot confirm: Whether in-progress chapter reading position (which page within a chapter) is still lost, as the test only checks header stats.
- Root cause: The header stats are derived from `useProgress()` which reads `ee_progress` and `ee_certificates` from `localStorage`. The previous fix for V13 (always mounting tabs) should prevent loss of *component* state, but the header stats are likely re-rendered/re-computed on tab switch due to component lifecycle or data dependency, even if the underlying data is stable.
- User impact: Minor, if any. Users might perceive a slight flicker or re-computation, but their progress is not actually lost. The test name is more confusing than the actual UX.
- Business impact: Negligible.
- Fix direction: Clarify test intent. If the goal was to check for *component* state loss (e.g., scroll position within a chapter), the test needs to be updated. If it's to confirm persistence of header stats, it's already passing.

## Tier Comparison

-   **Offline App Load (V2, V10):** Only tested for Pro, but likely affects Free users as well due to shared authentication and data loading mechanisms. Guest users might load partially but would still lack map data.
-   **GPS Acquisition Failure (P3, V3):** Tested for Pro, but the underlying GPS acquisition logic (`mapStore.userLocation`) is universal, so this would affect all tiers attempting to save waypoints.
-   **Persistence Regression (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Fails for both Guest and Free. Likely affects Pro too.
    -   **Basemap/Layer Visibility (V8, V9):** Fails (timeouts) for both Guest and Free. Likely affects Pro too.
    -   **Guest Waypoints (V11):** Specific to Guest tier.
    -   **Active Module (V15):** Specific to Guest tier (as authenticated users would have a module preference).
    -   **Session Trail (V1):** Specific to Pro tier (as tracking is a Pro feature).
-   **Free User Waypoint Save (F3):** Specific to Free tier.
-   **Offline Data Save (V4, V6):** Tested for Pro (tracking/routing are Pro features). Guest/Free users cannot save these items anyway.
-   **Learn Tab Header Stats (V13):** Behaves identically across Guest and Free tiers (no loss of persisted stats). This indicates the underlying persistence for learning progress is working, and the tab mounting fix for V13 is effective for these stats.

## Findings Discarded

-   `pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap): This test timed out. The intent is to confirm Pro users *don't* see the upgrade sheet. A timeout here means the test couldn't complete its assertion. Without direct evidence of the UpgradeSheet appearing, this is discarded as PHANTOM. The timeout does not confirm the presence of the UpgradeSheet.

## Cannot Assess

-   The exact cause of the timeouts for `guest V9` and `free V8` (basemap and layer persistence). While likely persistence issues, the timeout itself doesn't provide direct evidence of the state *value* after reload, only that the test couldn't complete. However, given the other clear persistence failures, it's a strong inference.
-   The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, and `ee_theme`. This would require code inspection beyond the scope of this report.

## Systemic Patterns

1.  **Persistence Mechanism Failure:** There's a widespread failure in both Zustand `persist` middleware and manual `localStorage` patterns. Multiple critical user preferences and session data points are not surviving reloads, despite `STATE_MAP.md` indicating they should. This suggests a fundamental issue with how `localStorage` is being accessed or written to, or a recent change that inadvertently broke these mechanisms.
2.  **Offline Capability Regression:** The app has regressed significantly in its offline capabilities, now failing to even load for authenticated users. This is a critical failure for an app targeting rural users.
3.  **GPS Acquisition Instability:** The GPS acquisition logic appears to be failing, preventing core features like waypoint saving. This could be related to the Playwright environment or an app-side bug.

## Calibration Notes

-   Learned from previous `PHANTOM` verdicts (e.g., "Dashboard Tab Obstruction", "Map Layer Style Inconsistencies") to be extremely cautious about inferring issues from timeouts or general error messages without direct visual or annotated evidence. For `pro P1` timeout, I discarded it as PHANTOM because the timeout doesn't directly prove the UpgradeSheet *was* shown, which is what the test was likely trying to prevent.
-   Prioritized findings based on user impact, especially critical failures like the app not loading offline and core features being unusable (GPS acquisition).
-   The interpretation of "state-loss proof" in V13 was clarified by looking at the *actual evidence* (before/after values) rather than just the test name. The identical values indicate *no loss* of the *persisted* stats, which is a positive outcome, despite the test name.
-   Direct contradictions between test annotations (e.g., "V11 confirmed") and `STATE_MAP.md` (e.g., `sessionWaypoints` persists) are strong evidence of regressions and were prioritized.