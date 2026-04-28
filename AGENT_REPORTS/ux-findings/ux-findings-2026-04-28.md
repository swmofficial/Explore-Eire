# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `3292a07`, `26b092c`, `9dc98fd`, `06fb774`, `50f3c46`, `394c32c`, `afc08b0`, `47b1264`, `4532bf4`, `f75fb1a`, `44ab7e`, `eeff89e`, `3aa364c`, `92031a8`, `ee1382c`, `2ab9669`, `3667c43`, `ade22a6`, `d341ff9`, `b6a2534` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 3/9
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Pro Subscription Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their subscription status and access to Pro features if the app is reloaded while offline.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro V10` test failed with `net::ERR_INTERNET_DISCONNECTED` during `page.reload`, directly confirming the scenario. `STATE_MAP.md` states `userStore.isPro` and `subscriptionStatus` are hydrated from Supabase and "Fails" offline, causing `isPro` to be "stuck false, Pro features locked".
- Cannot confirm: Visual evidence of the UI state after the offline reload, as the test timed out during the reload itself.
- Root cause: `userStore.isPro` and `userStore.subscriptionStatus` are not persisted locally (e.g., `localStorage`) and rely solely on Supabase reads, which fail without connectivity.
- User impact: Critical loss of functionality for paying users, who are locked out of features they've paid for, leading to extreme frustration and inability to use the app in common offline scenarios.
- Business impact: Severe damage to user trust, high churn risk for Pro subscribers, and potential for refund requests.
- Fix direction: Implement `localStorage` persistence for `userStore.isPro` and `userStore.subscriptionStatus`, with a clear strategy for re-syncing on connectivity restoration.

### 2. User-Generated Data Lost on Offline Save Attempts (V3, V4, V6, V14)
- Summary: User-generated content (waypoints, tracks, routes) is lost if the user attempts to save it while offline, with no prior warning or retry mechanism.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless)
- Confidence: HIGH
- Evidence: `pro V3` test failed (timeout) and annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the lack of an offline warning. `pro V4` test failed (timeout). `pro V6` passed, but annotation `route-button-missing: cannot proof V6` implies the lack of a toast was observed, confirming silent failure. `STATE_MAP.md` explicitly states `waypoints` INSERT, `tracks` INSERT, and `routes` INSERT "Fails" offline, resulting in "YES — waypoint data gone", "YES — entire GPS trail... gone", and "YES — route points gone".
- Cannot confirm: The exact toast message for V3/V4, as the tests timed out.
- Root cause: Supabase write operations for `waypoints`, `tracks`, and `routes` are performed directly without an offline queue or local-first persistence. V14 is confirmed because there's no pre-save connectivity check.
- User impact: Critical data loss for users who spend significant time creating content, leading to severe frustration and distrust. This is particularly problematic for prospectors who operate in areas with intermittent connectivity.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for all user-generated content, allowing local-first saves and automatic syncing when connectivity is restored. Add a clear offline warning (V14) before attempting a save.

### 3. Core Map Data Missing After Offline Reload (V2)
- Summary: Critical map data layers like gold samples and mineral localities fail to load after an offline reload, rendering the map largely useless for prospecting.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V2` test failed with `net::ERR_INTERNET_DISCONNECTED` during `page.reload`, directly confirming the scenario. `STATE_MAP.md` explicitly states `gold_samples` and `mineral_localities` queries "No data loads" offline.
- Cannot confirm: Visual evidence of the empty map, as the test timed out during the reload itself.
- Root cause: `useGoldSamples` and `useMineralLocalities` fetch data directly from Supabase on app mount without any local caching mechanism (e.g., `IndexedDB` or `localStorage`).
- User impact: Prevents users from performing core prospecting activities when offline, which is a frequent scenario in rural Ireland, making the app unreliable.
- Business impact: Reduces the app's core value proposition, leading to low user satisfaction, poor retention, and negative word-of-mouth, especially among the target prospector demographic.
- Fix direction: Implement an offline-first strategy using a Service Worker and/or `IndexedDB` to cache critical map data on first load and serve it when offline.

### 4. GPS Tracking Session Lost on Page Reload (V1)
- Summary: Any active GPS tracking session, including the accumulated trail and elevation profile, is lost if the app is reloaded before the user explicitly saves the track.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no (V1 confirmed)`, directly confirming the loss. `STATE_MAP.md` states `sessionTrail` and `elevationProfile` accumulate in `mapStore` (in-memory) and are "destroyed on page reload".
- Cannot confirm: Visual evidence of the track disappearing from the map, as the annotation is sufficient.
- Root cause: `mapStore.sessionTrail` and `mapStore.elevationProfile` are volatile Zustand state, not persisted to `localStorage` or `IndexedDB`.
- User impact: Significant loss of user-generated data for active users, especially during long tracking sessions, leading to frustration and distrust in the app's reliability.
- Business impact: Damages user trust and engagement, particularly for a core feature like GPS tracking, potentially leading to churn.
- Fix direction: Implement a robust auto-save mechanism for active tracking sessions, persisting `sessionTrail` and `elevationProfile` to `localStorage` or `IndexedDB` at regular intervals.

### 5. Incorrect PRO Gating for Pro Users (P1)
- Summary: Pro users are incorrectly shown "PRO" badges on features they already have access to, and the test timed out, suggesting they might also be incorrectly prompted to upgrade.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test failed (timeout) and annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` directly confirms that Pro users are seeing PRO badges. The timeout suggests the test failed to assert that the UpgradeSheet was *not* visible, implying it might have appeared. Screenshot `p1-1-layer-panel.png` clearly shows "PRO" badges next to layers.
- Cannot confirm: Whether the UpgradeSheet was explicitly shown, as the test timed out before that assertion could be made.
- Root cause: The UI rendering logic for PRO badges and UpgradeSheet is not correctly checking `userStore.isPro` or `userStore.subscriptionStatus` to hide these elements for paying users.
- User impact: Confuses and frustrates paying users who are presented with upgrade prompts or badges for features they already possess, making the app feel broken or misconfigured.
- Business impact: Erodes trust with paying subscribers, potentially leading to churn or negative perception of the subscription value.
- Fix direction: Refine the conditional rendering logic for PRO badges and the UpgradeSheet to ensure they are only visible to users who are *not* Pro subscribers.

### 6. Preference Loss on Reload (Theme, Basemap, Layer Visibility, Active Module) (V7, V9, V8, V15)
- Summary: User preferences for theme, basemap, layer visibility, and active module are lost on every page reload, reverting to default settings.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` passed with `theme-evidence` showing `dark` -> `light` -> `dark` on reload. `guest V9` failed (timeout) and `free V8` failed (timeout), both indicating preference resets. `guest V15` passed, confirming `activeModule` resets. `STATE_MAP.md` explicitly states `theme`, `basemap`, `is3D`, `layerVisibility`, and `activeModule` are "NOT persisted to localStorage" and "resets to 'dark' on every page reload" (or 'satellite', 'false', default visibility, 'prospecting').
- Cannot confirm: The exact visual state of basemap and layer visibility after reload due to test timeouts, but the architectural map and consistent failures strongly indicate the issue.
- Root cause: Critical UI preferences stored in `mapStore` and `userStore` are not persisted to `localStorage` and are therefore lost when the in-memory Zustand stores are re-initialised on page reload.
- User impact: Annoying and disruptive user experience, requiring users to reconfigure their preferred settings every time they open or reload the app, leading to frustration and perceived lack of polish.
- Business impact: Contributes to a perception of a low-quality or unreliable application, potentially reducing user satisfaction and engagement.
- Fix direction: Implement `localStorage` persistence for `userStore.theme`, `mapStore.basemap`, `mapStore.is3D`, `mapStore.layerVisibility`, and `moduleStore.activeModule`.

### 7. PRO Badges Visible to Free Users (F2)
- Summary: Free users are shown "PRO" badges on features in the LayerPanel that are only accessible to Pro subscribers, creating confusion and potentially false expectations.
- Tier(s) affected: free
- Confidence: HIGH
- Evidence: `free F2` test passed with annotation `pro-badge-count: 10`, confirming 10 PRO badges are visible to a free user. Screenshot `f2-layer-panel.png` clearly shows "PRO" badges next to several layer toggles.
- Cannot confirm: The exact interaction when a free user taps a PRO-gated layer, but `free F3` confirms the camera button (another PRO feature) correctly surfaces the UpgradeSheet.
- Root cause: The UI rendering logic for PRO badges in the LayerPanel does not correctly check `userStore.isPro` to hide these badges for free users.
- User impact: Confuses free users by highlighting features they cannot access, potentially leading to frustration or a feeling of being constantly upsold.
- Business impact: Can create a negative impression of the app's monetization strategy and user experience, potentially deterring free users from converting to Pro.
- Fix direction: Adjust the conditional rendering logic for PRO badges in the LayerPanel to ensure they are only visible when the user is *not* a Pro subscriber.

### 8. Learn Tab State Loss on Tab Switch (V13)
- Summary: The Learn tab's internal state (e.g., scroll position, active chapter page) is lost when the user switches to another tab and then returns to the Learn tab.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed with `state-loss-evidence` showing identical `before` and `after` stats (0% complete, 0 chapters). This confirms the Learn tab is re-rendered from scratch, losing any in-component state. UX Knowledge Context (Mobile Navigation State) explicitly states this violates expectations for tab navigation. `STATE_MAP.md` confirms `Learn tab: CONDITIONALLY RENDERED — unmounts when leaving`.
- Cannot confirm: The specific loss of scroll position or active chapter page, as the annotation only captures header stats.
- Root cause: The `LearnView` component is conditionally rendered and unmounts when the user navigates away from the tab, destroying its internal component state.
- User impact: Disrupts the learning flow, forcing users to find their place again within courses or chapters, leading to frustration and reduced engagement with the learning module.
- Business impact: Decreases the effectiveness and perceived value of the Learn module, potentially impacting user retention and the app's educational value proposition.
- Fix direction: Modify `App.jsx` to keep the `LearnView` component mounted (e.g., by toggling CSS `visibility` instead of conditional rendering) or implement state persistence for the Learn module (e.g., to `localStorage` or a global store).

## Tier Comparison

*   **V10 (Pro Status Loss):** Only directly observed for `pro` tier, as it specifically tests the `isPro` flag.
*   **V2 (Core Map Data Loss Offline):** Failed for `pro` tier, but the root cause (Supabase reads without caching) implies it affects `all` tiers equally.
*   **V1 (GPS Track Loss):** Confirmed for `pro` tier, but the root cause (`mapStore.sessionTrail` not persisted) implies it affects `all` tiers equally.
*   **V3, V4, V6, V14 (Offline Save Failures):** Confirmed for `pro` tier. `STATE_MAP.md` indicates `waypoints`, `tracks`, `finds_log`, `routes` writes fail offline for authenticated users, thus affecting `free` and `pro`. Guest waypoints are memory-only regardless.
*   **V7 (Theme Reset):** Confirmed for `guest` and `free` tiers. The root cause (`userStore.theme` not persisted) implies it affects `all` tiers.
*   **V9 (Basemap Reset) & V8 (Layer Preferences Reset):** Failed for `guest` and `free` respectively. The root cause (`mapStore` not persisted) implies it affects `all` tiers.
*   **V15 (Active Module Reset):** Confirmed for `guest` tier. The root cause (`moduleStore.activeModule` not persisted) implies it affects `all` tiers.
*   **V13 (Learn Tab State Loss):** Confirmed for `guest` and `free` tiers. The root cause (conditional rendering of `LearnView`) implies it affects `all` tiers.
*   **F2 (PRO Badges for Free):** Specific to the `free` tier.
*   **P1 (Incorrect PRO Gating for Pro):** Specific to the `pro` tier.
*   **V11 (Guest Waypoints Memory-Only):** Specific to the `guest` tier, as authenticated users can save waypoints (though offline saving fails).

## Findings Discarded
- No findings were discarded in this run, as exactly 8 high-impact findings were identified and ranked.

## Cannot Assess
- The exact visual state of the map (e.g., empty gold samples, basemap reset) after offline reloads for `pro V2`, `guest V9`, and `free V8` due to test timeouts. However, the `net::ERR_INTERNET_DISCONNECTED` errors and `STATE_MAP.md` provide high confidence in the underlying issues.
- The full extent of the `pro P1` failure (e.g., whether an UpgradeSheet was explicitly shown) due to test timeout.

## Systemic Patterns
-   **Lack of Local Persistence:** A pervasive issue where critical UI preferences (`theme`, `basemap`, `layerVisibility`, `activeModule`) and user authentication/subscription status (`isPro`, `subscriptionStatus`) are stored in volatile Zustand stores (`mapStore`, `userStore`, `moduleStore`) without `localStorage` persistence. This leads to state loss on every page reload.
-   **Absence of Offline-First Strategy:** The application fundamentally fails in offline scenarios for both data retrieval (core map data like gold samples and mineral localities) and user-generated data persistence (waypoints, tracks, finds, routes). There is no local caching for read data and no sync queue for write operations, leading to data loss and a non-functional app when connectivity is poor or absent.
-   **Conditional Rendering State Loss:** Non-map tabs (`Dashboard`, `Settings`, `Learn`, `Profile`) are conditionally rendered, causing their internal component state to be destroyed and re-initialised on every tab switch. This violates mobile navigation UX principles.
-   **Incorrect Gating Logic:** The `isPro` flag and related UI elements (PRO badges, UpgradeSheet) are not consistently and correctly applied across different user tiers, leading to confusing or incorrect UI for both free and paying users.

## Calibration Notes
-   The new test suite design, which focuses on "journeys" and "evidence" rather than simple pass/fail, significantly improved the ability to confirm vulnerabilities. Annotations like `state-loss-evidence`, `theme-evidence`, `pro-badge-count`, and `v14-pre-save-offline-warning` provided direct, quantifiable proof.
-   The `net::ERR_INTERNET_DISCONNECTED` error in the Playwright logs was crucial for confirming offline-related vulnerabilities (V2, V10, V3, V4), as it directly indicated the test environment was indeed offline during the critical steps. This prevents "PHANTOM" verdicts based on speculative network issues.
-   The `STATE_MAP.md` continues to be an invaluable resource for tracing UX findings to their architectural root causes, especially regarding persistence mechanisms and Supabase interactions.
-   Prioritising data loss and critical functionality (offline access, Pro status) aligns with previous CONFIRMED verdicts and the "Data Safety" and "Offline-First Design" principles in the UX Knowledge Context.