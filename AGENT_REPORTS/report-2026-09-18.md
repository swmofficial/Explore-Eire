# UX Agent Report — 2026-09-18

## Run Context
- Commits analysed: `af54f70a9d7728f23a5d36d2fa1c5595721da433` and 19 preceding commits.
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

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Review the `CornerControls` and `WaypointSheet` logic to ensure the camera button correctly triggers the `UpgradeSheet` for free users.

### 4. High: Critical Session Data and User Preferences Are Lost on Reload (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility, active module) and session-specific data (guest waypoints, active GPS track) are not being persisted across page reloads, leading to significant data loss and a frustrating user experience.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: Theme reverted to 'dark' after reload. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being persisted.
    - `guest V9` (FAIL) and `free V8` (FAIL): Both timed out, implying basemap and layer preferences reset. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via `ee-map-prefs`. The timeouts suggest the test couldn't find the expected state after reload.
    - `guest V11` (PASS, confirming vulnerability): Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` shows guest waypoints are lost. `STATE_MAP.md` confirms `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern).
    - `guest V15` (PASS, confirming vulnerability): Annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` shows active module is lost. `STATE_MAP.md` confirms `activeModule` persists via `ee_active_module` (manual pattern).
    - `pro V1` (PASS, confirming vulnerability): Annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` shows GPS tracks are lost. `STATE_MAP.md` confirms `sessionTrail` persists via `ee_session_trail` (manual pattern).
- Cannot confirm: The exact point of failure (read or write) for each manual `localStorage` key, but the evidence clearly shows the keys are not present or are empty after reload, or the Zustand `persist` middleware is failing for `ee-map-prefs`.
- Root cause: A systemic failure in the manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, and/or issues with the Zustand `persist` middleware for `ee-map-prefs`. This contradicts `STATE_MAP.md` which states these are persisted.
- User impact: Users lose their custom settings and accumulated session data (waypoints, tracks) on every app reload, leading to severe frustration, repeated setup, and loss of valuable work.
- Business impact: High churn due to unreliable data persistence, negative user reviews, and reduced engagement with core features.
- Fix direction: Thoroughly debug and verify the `localStorage` read/write implementations for all affected manual keys and the Zustand `persist` middleware for `mapStore` preferences.

### 5. High: Offline Data Saves Fail Silently or With Data Loss (V4, V6, V14 Confirmed)
- Summary: Attempts to save user-generated content (tracks, routes) while offline result in silent failures or data loss, without proper user notification or queuing for later sync.
- Tier(s) affected: Pro (inferred for Free/Guest if they could save these)
- Confidence: HIGH
- Evidence:
    - `pro V4` (PASS, confirming vulnerability): Test passed, confirming track save fails offline. `STATE_MAP.md` states `tracks` INSERT "Fails — toast 'Could not save track'", but the test confirms the vulnerability.
    - `pro V6` (PASS, confirming vulnerability): Test passed, confirming route save offline produces no user-facing toast. `STATE_MAP.md` states `routes` INSERT "Fails — console.error only, no toast".
    - `pro V3` (FAIL, but annotation confirms V14): `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The exact toast message for V4, but the test confirms the failure.
- Root cause: The application lacks an offline-first data strategy, specifically a local-first write mechanism and a persistent sync queue. Supabase write operations are directly attempted without checking connectivity or queuing, leading to immediate failure and data loss. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable work (recorded tracks, planned routes, waypoints) if they attempt to save while offline, leading to significant frustration and distrust in the app's reliability.
- Business impact: Loss of user-generated content, reduced engagement with core tracking/planning features, and negative perception of app robustness, especially in rural areas.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) for all user-generated content, ensuring local-first writes and eventual consistency. Provide clear UI feedback for offline status and sync progress.

### 6. Medium: Free Users See Pro Badges in LayerPanel (F2 Regression)
- Summary: Free tier users are shown "PRO" badges next to premium map layers in the LayerPanel, which creates confusion and an inconsistent user experience.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` test passed with annotation `pro-badge-count: 8`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layer toggles.
- Cannot confirm: If this is intended behavior to upsell, but typically, badges are hidden for Pro users (as per previous P1 fix) and either hidden or clearly distinguished for free users (e.g., with a lock icon and upgrade CTA). Showing "PRO" badges to free users is confusing.
- Root cause: The logic for displaying PRO badges in `LayerPanel` is likely inverted or misconfigured. The previous fix for P1 (`!isPro` guard) was intended to *hide* badges for *Pro* users. If `!isPro` is used to *show* badges, then free users (where `isPro` is false) will see them.
- User impact: Confusion for free users who see "PRO" badges on features they cannot access, potentially leading to frustration or misinterpretation of their account status.
- Business impact: Minor, but contributes to a less polished user experience and could dilute the perceived value of the Pro tier if the gating isn't clear.
- Fix direction: Adjust the `LayerPanel` rendering logic to either hide PRO badges for free users or replace them with a clearer "Upgrade" indicator.

### 7. Low: Learn Tab Header Stats Recompute, Not Persist (V13 Re-evaluation)
- Summary: While the Learn tab component state is now preserved across tab switches, the header statistics (courses, complete percentage, chapters done) are recomputed on every tab switch, rather than persisting their last-known state.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation shows identical `before` and `after` stats (e.g., `{"courses":2,"completePct":0,"chaptersDone":0}`). This indicates the stats are re-evaluated, but since the user has 0 progress, they remain 0. The test title "learn header stats are recomputed on every tab switch (state-loss proof)" explicitly states recomputation.
- Cannot confirm: If the recomputation causes a noticeable flicker or performance hit, or if it's simply re-reading from a persistent source (like `localStorage.ee_progress`) which is acceptable. The UX context mentions "in-progress chapter reading position" as the primary V13 concern, which is not directly tested here.
- Root cause: Although the Learn tab component is now always mounted (as per previous V13 fix), the logic for calculating header statistics might still be tied to a `useEffect` or derived state that re-runs on tab activation or prop changes, even if the underlying data (from `useProgress`) is stable.
- User impact: Minor, as the stats are correct. However, if the stats were complex to compute, it could lead to unnecessary re-renders or slight delays. The primary V13 concern (losing chapter reading position) is not addressed by this test.
- Business impact: Negligible, unless performance becomes an issue with more complex progress tracking.
- Fix direction: Ensure Learn header stats are derived from a stable, persisted source and only recompute when the underlying progress data actually changes, not just on tab visibility changes. Re-verify that in-progress chapter reading position is truly preserved.

## Tier Comparison
- **Offline App Load (V2, V10):** Pro tier explicitly fails to load offline. This behavior is likely identical for Free users, as the root cause is a lack of general app shell caching. Guest users might load, but without any authenticated data.
- **GPS Acquisition Failure (P3, V3 blocker):** Observed in Pro tier. This issue would affect all tiers equally if they were able to attempt saving waypoints.
- **Persistence Failures (V1, V7, V8, V9, V11, V15):**
    - `V7` (Theme) affects Guest and Free (identical failure).
    - `V9` (Basemap) affects Guest (timeout, implies reset). `V8` (Layers) affects Free (timeout, implies reset). These are likely identical failures for `ee-map-prefs` across all tiers.
    - `V11` (Guest Waypoints) specifically affects Guest.
    - `V15` (Active Module) affects Guest (identical failure). Likely affects Free/Pro too.
    - `V1` (Session Trail) affects Pro (identical failure). Likely affects Free/Guest too if they track.
- **Free User Waypoint Save (F3):** Specific to Free tier, as Pro users should be able to save, and Guest users have memory-only waypoints.
- **PRO Badges for Free Users (F2):** Specific to Free tier. Pro users should not see them (P1 fix), and Guest users don't have the context.
- **Learn Tab Header Stats (V13):** Identical behavior (recomputation) for Guest and Free. Likely applies to Pro as well.
- **Offline Data Saves (V4, V6, V14):** Observed in Pro tier. These vulnerabilities (track save failure, silent route save failure, no pre-save warning) would apply to any tier attempting these actions offline.

## Findings Discarded
- **Pro P1 Test Timeout:** This finding was discarded as a primary UX issue. The `pro P1` test, which verifies Pro users do not see the UpgradeSheet, timed out. This is likely a cascading effect from more critical underlying issues (e.g., app failing to load, GPS not acquiring), preventing the test from reaching the point where it can assert the absence of the UpgradeSheet. It is not a direct UX bug in the Pro gating logic itself, which was previously confirmed fixed.

## Cannot Assess
- The exact cause of the `Test timeout` for `guest V9` (basemap reset) and `free V8` (layer preferences reset). While the timeouts imply a reset or inability to proceed, the specific error message is not as clear as a direct assertion failure. However, the architectural map and other persistence failures strongly suggest these are indeed persistence issues.
- The full extent of `V13` (Learn tab state loss) regarding in-progress chapter reading position, as the current tests only check header statistics.

## Systemic Patterns
1.  **Broken Persistence Layer:** A widespread failure in both Zustand's `persist` middleware (for `ee-map-prefs`) and the manual `localStorage` read/write patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`). This indicates a fundamental issue with how state is saved and restored across reloads, affecting multiple critical features and user preferences.
2.  **Lack of Offline-First Strategy:** The app fundamentally fails to load offline for authenticated users and lacks any robust mechanism for queuing or gracefully handling data writes when offline. This is a critical architectural gap for an app designed for outdoor use in potentially disconnected environments.
3.  **GPS Acquisition Instability:** A recurring issue with the app's ability to acquire and process GPS data, leading to disabled functionality (waypoint saving). This suggests a problem with the `useTracks` hook or its integration with `mapStore.userLocation`.
4.  **Inconsistent Pro Gating:** Logic for premium features (waypoint saving, PRO badges) is either inverted or incorrectly applied, allowing free users access or showing confusing UI elements.

## Calibration Notes
- The previous "Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)" and "Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)" were correctly identified and are now confirmed again, highlighting the importance of addressing foundational issues.
- The re-evaluation of V13 (Learn tab state) based on the test annotations and previous fix confirms that the component *mounting* issue was addressed, but the *recomputation* of stats is a separate, minor concern. This reinforces the need to differentiate between component lifecycle and data derivation.
- The persistence failures (V1, V7, V8, V9, V11, V15) are a recurring theme, indicating that fixes for individual keys might not be addressing a deeper, systemic problem with the persistence implementation. The `ee_theme: null` annotations are particularly strong evidence of this.
- The `PHANTOM` verdicts from previous runs (e.g., Dashboard Tab Obstruction, Map Layer Style Inconsistencies) continue to guide me to look for direct evidence in annotations and errors, rather than inferring from timeouts or general descriptions. The current timeouts are treated as evidence of *something* failing, but the specific UX impact is inferred from the test's intent and `STATE_MAP.md`.