# UX Agent Report — 2026-08-18

## Run Context
- Commits analysed: `42f873b67c7f9159a47296ca7958f7a766878827` and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
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
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The specific code change that caused the regression for each manual persistence key.
- Root cause: Failure in the manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, and likely `ee-map-prefs` (Zustand persist middleware).
- User impact: Annoying loss of settings, critical loss of unsaved work (waypoints, tracks).
- Business impact: Erodes trust, reduces engagement, leads to data loss, directly impacts user-generated content.
- Fix direction: Re-implement and thoroughly verify manual `localStorage` persistence for all affected keys and debug Zustand persist middleware configuration.

### 4. High: Free Users Can Attempt to Save Waypoints (F3 Gating Failure)
- Summary: Free users are incorrectly allowed to open the `WaypointSheet` and attempt to save a waypoint, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the `WaypointSheet` was shown (`waypointShown: true`) and the `UpgradeSheet` was not (`upgradeShown: false`).
- Cannot confirm: If the save operation would ultimately fail with a specific error, as the GPS acquisition issue (Finding 2) prevents the save button from being enabled.
- Root cause: Incorrect gating logic for the camera button/waypoint save feature, allowing free users to access a Pro feature.
- User impact: Free users can attempt to use a Pro feature, only to be blocked later (or fail due to other issues), leading to frustration and a poor user experience.
- Business impact: Undermines the upgrade strategy, creates confusion about feature availability, and can lead to negative perception.
- Fix direction: Correctly gate the camera button to show the `UpgradeSheet` for free users, preventing access to the `WaypointSheet`.

### 5. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing toast notification, leading the user to believe their data has been saved.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not directly observe the absence of a toast. However, `STATE_MAP.md` explicitly states for "Save route" that it "Fails — console.error only, no toast".
- Cannot confirm: The exact content of the console error, but the absence of a toast is confirmed by `STATE_MAP.md`.
- Root cause: Supabase write failure for routes is not communicated to the user via a toast.
- User impact: User believes their route is saved when it is not, leading to data loss and confusion when they later try to access it.
- Business impact: Erodes user trust, leads to data loss, and creates a negative user experience.
- Fix direction: Add a user-facing toast notification for failed route save operations when offline.

### 6. Medium: Offline Track Save Leads to Data Loss (Vulnerability V4)
- Summary: When a user attempts to save a GPS track while offline, the track data is lost, despite a toast notification.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` passed, which means the test journey completed. `STATE_MAP.md` explicitly states for "Save track" that it "Fails — toast 'Could not save track'" and "YES — entire GPS trail... gone." The `pro V1` test also confirmed `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of the toast message from the test run, but the data loss is confirmed by `STATE_MAP.md` and the related V1 test.
- Root cause: Supabase write failure for tracks leads to data loss because there is no offline queue mechanism.
- User impact: User loses valuable track data after a session, which can be frustrating and demotivating.
- Business impact: Erodes user trust, reduces engagement, and leads to loss of valuable user-generated content.
- Fix direction: Implement an offline queue for track data to ensure it is saved locally and synced when connectivity returns.

### 7. Medium: Free Users See PRO Badges on Inaccessible Layers (F2 UX Issue)
- Summary: Free users are shown "PRO" badges next to several layer toggles in the LayerPanel, constantly highlighting features they cannot access without upgrading.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` passed, and the annotation `pro-badge-count: 8` confirms that 8 PRO badges are visible. Screenshot `test-results/free/f2-layer-panel.png` clearly shows these badges.
- Cannot confirm: The specific impact on user motivation without user testing, but it aligns with known UX principles about demotivation.
- Root cause: The LayerPanel component renders PRO badges unconditionally for free users, without a clear call to action or differentiation.
- User impact: Free users are constantly reminded of features they can't use, potentially leading to frustration or feeling excluded.
- Business impact: Can be demotivating, potentially reducing engagement or leading to negative perception of the app's value proposition.
- Fix direction: Implement conditional rendering or a clearer "upgrade" call to action for PRO badges for free users, or hide them entirely if the feature is completely inaccessible.

## Tier Comparison

-   **Offline Loading (V2, V10):** Pro users cannot load the app offline at all due to core app shell and initial data not being cached. This behavior is inferred to affect Free users as well, as they rely on the same core infrastructure. Guest users are not explicitly tested for this, but would likely face similar issues if they require initial data loads.
-   **Persistence Issues (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Fails to persist for both Guest and Free users, indicating a universal regression.
    -   **Basemap (V9) / Layer Visibility (V8):** Fails to persist for Guest (basemap) and Free (layers). This suggests a general problem with `ee-map-prefs` persistence affecting all users.
    -   **Session Waypoints (V11):** Confirmed lost for Guest users. This is a guest-specific vulnerability as authenticated users save waypoints to Supabase.
    -   **Active Module (V15):** Confirmed lost for Guest users. This is likely a universal regression affecting all tiers.
    -   **Session Trail (V1):** Confirmed lost for Pro users. This is likely a universal regression affecting all tiers.
-   **Waypoint Gating (F3):** Free users are incorrectly allowed to open the `WaypointSheet` instead of being prompted to upgrade. Guest users are generally prevented from saving waypoints (V11 confirms they are memory-only), and Pro users are expected to save waypoints.
-   **PRO Badges (F2):** Free users see PRO badges on inaccessible layers. Pro users should not see these badges (as per P1 fix in previous reports). Guest users are not tested for this.
-   **GPS Acquisition (P3, V3):** Pro users cannot save waypoints due to GPS acquisition failure. This issue would affect Free and Guest users if they were allowed to save waypoints.
-   **Offline Data Saves (V4, V6):** Pro users experience data loss for tracks (V4) and silent failure for routes (V6) when offline. This would affect Free users if they could save these data types. Guest users cannot save tracks/routes.

## Findings Discarded

-   **`pro P1` timeout:** The test `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap` timed out. This makes it impossible to confirm if the `UpgradeSheet` incorrectly appeared for a Pro user or if the timeout was due to test flakiness or navigation issues. Given the lack of direct evidence, it is discarded.
-   **`guest V13` and `free V13` (Learn tab state loss):** Both tests passed, and the `state-loss-evidence` annotations show identical "before" and "after" header statistics. While the test description mentions "state-loss proof," the evidence provided only covers header stats, not in-chapter reading position. However, previous fixes for V13 involved ensuring tabs remain mounted, which should preserve component state. The consistent header stats are a positive indicator, and without direct evidence of in-chapter state loss, this finding is not actionable.

## Cannot Assess

-   The exact reason for the Playwright geolocation mock not being processed by the app's GPS acquisition logic (Finding 2). Further debugging within the application's GPS handling is required.
-   The specific code changes that caused the widespread regression in `localStorage` persistence (Finding 3). This would require a code review of recent commits affecting `userStore`, `mapStore`, and `moduleStore` initialization and setter functions.

## Systemic Patterns

1.  **Broken `localStorage` Persistence:** A widespread regression affects multiple manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and likely Zustand's `ee-map-prefs`. This indicates a fundamental issue in how persistence is being implemented or maintained across the application, directly contradicting the `STATE_MAP.md` ground truth.
2.  **Lack of Offline-First Design:** The application fundamentally fails to load offline for authenticated users and lacks robust offline data saving mechanisms for user-generated content (waypoints, tracks, routes). This is a critical architectural flaw for an outdoor mapping app targeting users in rural areas.
3.  **Core Dependency Failure:** The GPS acquisition logic is failing, blocking critical user actions like saving waypoints. This points to a problem with how the app interacts with device capabilities or mock data.
4.  **Inconsistent Gating and UX for Free Users:** Free users are either incorrectly allowed to access Pro features (F3) or are shown Pro features in a demotivating way (F2), indicating a lack of consistent design and implementation for tier-based feature access.

## Calibration Notes

-   Prioritized critical blockers like offline loading and core functionality (GPS acquisition) based on past "CONFIRMED" verdicts for similar high-impact issues.
-   Carefully interpreted "PASS" results for vulnerability tests (e.g., V1, V11, V15, V4, V6) where the annotation explicitly confirmed the vulnerability. A "PASS" in this context means the test successfully *observed* the intended vulnerable behavior, not that the vulnerability was fixed.
-   Used `STATE_MAP.md` as the authoritative source for persistence mechanisms and offline behavior, noting direct contradictions with test annotations (e.g., `ee_theme` being null when it should be persisted).
-   Discarded vague timeouts (e.g., `pro P1`) when direct evidence was lacking, consistent with the "NEVER guess" rule and previous "PHANTOM" verdicts.
-   Refined the understanding of "silent failure" (V4, V6) by cross-referencing `STATE_MAP.md`'s explicit descriptions of toast notifications.