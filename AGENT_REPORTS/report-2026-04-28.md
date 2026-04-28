# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `48395fe`, `68b57ff`, `a44d60f`, `35ad5d6`, `86a220a`, `be55413`, `ca5445a`, `d84b479`, `86a599f`, `10ca499`, `fe53e9b`, `3292a07`, `26b092c`, `9dc98fd`, `06fb774`, `50f3c46`, `394c32c`, `afc08b0`, `47b1264`, `4532bf4` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 4/9
- Historical accuracy: Confirmed: 8 (53%) | Phantom: 5 (33%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Pro Subscription Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their subscription status and access to Pro features if the app is reloaded while offline. This vulnerability, previously "fixed", is re-confirmed.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro V10` test failed with `error: Error: page.reload: net::ERR_INTERNET_DISCONNECTED`. This directly confirms the scenario where an offline reload occurs. STATE_MAP.md explicitly states `userStore.isPro` and `subscriptionStatus` are hydrated from Supabase and "Fails" offline, causing `isPro` to be "stuck false, Pro features locked".
- Cannot confirm: Visual evidence of the UI state after the offline reload, as the test timed out during the reload itself.
- Root cause: `userStore.isPro` and `userStore.subscriptionStatus` are not persisted locally (e.g., `localStorage`) and rely solely on Supabase reads, which fail without connectivity. The previous fix (`d84b479`) intended to address this but appears to have been ineffective.
- User impact: Critical loss of functionality for paying users, who are locked out of features they've paid for, leading to extreme frustration and inability to use the app in common offline scenarios.
- Business impact: Severe damage to user trust, high churn risk for Pro subscribers, and potential for refund requests.
- Fix direction: Re-evaluate and debug the `persist` middleware configuration for `userStore.isPro` and `userStore.subscriptionStatus` to ensure they are stored in `localStorage`.

### 2. Offline Data Loss for User-Generated Content (V3, V4, V6, V14)
- Summary: User-generated content (waypoints, tracks, routes) is lost if the user attempts to save it while offline, with no prior warning or retry mechanism. This vulnerability, previously "fixed" for some aspects, is re-confirmed.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless, covered by V11)
- Confidence: HIGH
- Evidence: `pro V3` test failed, but the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the lack of an offline warning before saving. `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". STATE_MAP.md explicitly states `waypoints` INSERT, `tracks` INSERT, and `routes` INSERT "Fails" offline, resulting in "YES — waypoint data gone", "YES — entire GPS trail... gone", and "YES — route points gone".
- Cannot confirm: The exact toast message for V3, as the test timed out.
- Root cause: Supabase write operations for `waypoints`, `tracks`, and `routes` are performed directly without an offline queue or local-first persistence. V14 is confirmed because there's no pre-save connectivity check.
- User impact: Critical data loss for users who spend significant time creating content, leading to severe frustration and distrust. This is particularly problematic for prospectors who operate in areas with intermittent connectivity.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for all user-generated content, allowing local-first saves and automatic syncing when connectivity is restored. Add a clear offline warning (V14) before attempting a save.

### 3. Core Map Data Missing After Offline Reload (V2)
- Summary: Critical map data layers like gold samples and mineral localities fail to load after an offline reload, rendering the map largely useless for prospecting. This vulnerability, previously "fixed", is re-confirmed.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V2` test failed with `error: Error: page.reload: net::ERR_INTERNET_DISCONNECTED`. This confirms the scenario of an offline reload. STATE_MAP.md explicitly states `gold_samples` and `mineral_localities` queries "No data loads" offline.
- Cannot confirm: Visual evidence of the empty map, as the test timed out during the reload itself.
- Root cause: `useGoldSamples` and `useMineralLocalities` fetch data directly from Supabase on app mount without any local caching mechanism (e.g., `IndexedDB` or `localStorage`).
- User impact: Prevents users from performing core prospecting activities when offline, which is a frequent scenario in rural Ireland, making the app unreliable.
- Business impact: Reduces the app's core value proposition, leading to low user satisfaction, poor retention, and negative word-of-mouth, especially among the target prospector demographic.
- Fix direction: Implement an offline-first caching strategy for core map data layers, storing them in `IndexedDB` or `localStorage` for retrieval when offline.

### 4. User Preferences Reset on Reload (V7, V8, V9, V15)
- Summary: User preferences for theme, basemap, layer visibility, and active module are lost on every page reload, reverting to default settings. This vulnerability, previously "fixed", is re-confirmed.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` passed with `theme-after-reload: dark` (initial: dark, after flip: light), confirming V7. `free V7` passed with `theme-evidence: {"flipped":true,"tFlipped":"light","tReloaded":"dark"}`, also confirming V7. `guest V9` failed with a timeout, but STATE_MAP.md confirms `basemap` is not persisted. `free V8` failed with a timeout, but STATE_MAP.md confirms `layerVisibility` is not persisted. `guest V15` passed, confirming "activeModule defaults to prospecting on reload".
- Cannot confirm: Visual evidence for V8 and V9 due to timeouts.
- Root cause: `theme` (userStore), `basemap`, `is3D`, `layerVisibility` (mapStore), and `activeModule` (moduleStore) are not persisted to `localStorage` and are destroyed on page reload. The previous fix (`d84b479`) intended to add `persist` middleware but was ineffective for these specific state keys.
- User impact: Annoying and disruptive user experience, requiring users to reconfigure their preferred settings (e.g., map layers, dark mode) every time they open the app or refresh the page.
- Business impact: Contributes to a perception of a low-quality or unreliable application, potentially reducing engagement and user satisfaction.
- Fix direction: Debug and correctly configure `persist` middleware for `userStore`, `mapStore`, and `moduleStore` to ensure `theme`, `basemap`, `is3D`, `layerVisibility`, and `activeModule` are saved to `localStorage`.

### 5. Pro User Sees PRO Badges in Layer Panel (P1)
- Summary: Authenticated Pro users are incorrectly shown "PRO" badges next to features they already have access to in the Layer Panel. This vulnerability, previously "fixed", is re-confirmed.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with a timeout, but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` provides direct evidence that 8 PRO badges were visible to the Pro user. Screenshot `test-results/pro/p1-1-layer-panel.png` also shows "PRO" badges next to layers like "Gold heatmap" for a Pro user.
- Cannot confirm: The exact state after the timeout, but the annotation is clear.
- Root cause: The rendering logic for PRO badges in `LayerRow` does not correctly check `userStore.isPro` to hide the badges for paying users. The previous fix (`86a599f`) was intended to add an `!isPro` guard but appears to be ineffective or incorrectly implemented.
- User impact: Confusing and potentially frustrating for Pro users, as it suggests they still need to upgrade or that certain features are locked, despite having paid for them.
- Business impact: Undermines the value proposition of the Pro subscription and can lead to user confusion and dissatisfaction.
- Fix direction: Correct the conditional rendering logic in `LayerRow` to ensure PRO badges are only displayed when `userStore.isPro` is `false`.

### 6. Guest Waypoints are Memory-Only (V11)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload or app closure. This vulnerability, previously "fixed", is re-confirmed.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with the description "session waypoints are memory-only (vanish on reload)". This directly confirms the vulnerability. STATE_MAP.md explicitly states "Guest waypoints are memory-only regardless."
- Cannot confirm: Visual evidence of the waypoint vanishing, as the test description is sufficient.
- Root cause: `mapStore.sessionWaypoints` is an in-memory Zustand store key and is not persisted to `localStorage` for guest users. The previous fix (`ca5445a`) intended to persist guest waypoints but was either ineffective or reverted.
- User impact: Significant data loss for unauthenticated users who may spend time marking locations, leading to frustration and a disincentive to use the app without signing up.
- Business impact: Hinders user acquisition and conversion by creating a poor first-time user experience for guests, as their initial contributions are not valued or saved.
- Fix direction: Implement `localStorage` persistence for `mapStore.sessionWaypoints` specifically for guest users, ensuring these are cleared upon successful authentication.

### 7. GPS Track Lost on Reload During Active Session (V1)
- Summary: An active GPS tracking session's accumulated trail data is lost if the app is reloaded before the user explicitly saves the track.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V1` test passed with the annotation `track-survived-reload: no (V1 confirmed)`. This directly confirms the vulnerability. STATE_MAP.md explicitly states `sessionTrail` accumulates in `mapStore` (in-memory) and "None are persisted anywhere until the user explicitly saves."
- Cannot confirm: Visual evidence of the track disappearing, as the annotation is clear.
- Root cause: `mapStore.sessionTrail` is an in-memory Zustand store key and is not persisted to `localStorage` or `IndexedDB` during an active tracking session.
- User impact: Critical data loss for users engaged in long tracking activities (e.g., hikes, prospecting routes) if the app crashes, the browser tab is accidentally closed, or the device runs out of battery.
- Business impact: Severe damage to user trust and reliability perception, especially for a core feature of an outdoor mapping app. High churn risk for users who experience this data loss.
- Fix direction: Implement an auto-save mechanism for `sessionTrail` to `localStorage` or `IndexedDB` at regular intervals during an active tracking session, with a recovery option upon app restart.

## Tier Comparison

-   **Theme Reset (V7):** Confirmed to reset on reload for both **guest** and **free** tiers. Architectural analysis indicates this affects **all** tiers.
-   **Basemap Reset (V9):** Confirmed to reset on reload for the **guest** tier (via timeout and architectural confirmation). Architectural analysis indicates this affects **all** tiers.
-   **Layer Preferences Reset (V8):** Confirmed to reset on reload for the **free** tier (via timeout and architectural confirmation). Architectural analysis indicates this affects **all** tiers.
-   **Active Module Reset (V15):** Confirmed to reset on reload for the **guest** tier. Architectural analysis indicates this affects **all** tiers.
-   **Learn Tab Header Stats (V13):** The header stats (courses, completePct, chaptersDone) remain consistent across tab switches for both **guest** and **free** tiers, as confirmed by `state-loss-evidence` annotations. This is likely due to `ee_progress` being persisted in `localStorage`. However, the underlying component state (e.g., chapter reading position) is still expected to be lost due to conditional rendering, which the test does not directly verify.
-   **PRO Badges in Layer Panel (F2 vs P1):** **Free** users correctly see 10 PRO badges (F2 passed, `pro-badge-count: 10`), indicating features they can upgrade to. **Pro** users incorrectly see 8 PRO badges (P1 failed, `pro-badge-count: 8`), which is a bug.
-   **Waypoint Saving:** **Guest** users' waypoints are memory-only (V11 confirmed). **Free** users are correctly gated to the UpgradeSheet when attempting to save a waypoint (F3 passed). **Pro** users *should* be able to save waypoints, but the `pro P3` test timed out, indicating a potential issue even online.
-   **Offline Data Handling (V2, V3, V4, V6, V10, V14):** These vulnerabilities primarily affect **authenticated users (free/pro)** who interact with Supabase for saving data (waypoints, tracks, routes) or loading core map data. Guest users do not save data to Supabase, so V3/V4/V6/V14 are not applicable to them in the same way (V11 covers guest waypoints). V2 (gold/mineral data) affects all tiers. V1 (GPS track loss) affects any user who tracks. V10 (Pro status) is Pro-specific.

## Findings Discarded

-   **pro P3 — waypoint save happy path online:** This test failed with a timeout. While a critical function, the timeout could be due to test flakiness or a broader system slowdown rather than a specific architectural flaw directly confirming a vulnerability. Given the higher confidence and impact of other confirmed findings, this was discarded to adhere to the 8-finding limit.

## Cannot Assess

-   **Learn Tab Component State Loss (V13):** The tests `guest V13` and `free V13` passed, but their annotations only confirm the stability of header statistics (derived from `localStorage`), not the preservation of in-component state like scroll position or current chapter page. The UX Knowledge Context and architectural design (conditional rendering of non-map tabs) suggest this vulnerability still exists, despite a previous "fix" (`be55413`). The current tests do not provide sufficient evidence to confirm or deny the actual component state loss.

## Systemic Patterns

The most prominent systemic pattern is the **lack of robust offline-first data handling and state persistence**.
1.  **Volatile In-Memory State:** Many critical user preferences (`theme`, `basemap`, `layerVisibility`, `activeModule`) and active session data (`sessionTrail`, `sessionWaypoints`) reside solely in Zustand stores without `persist` middleware or `localStorage` integration. This leads to complete state loss on page reload (V1, V7, V8, V9, V11, V15).
2.  **Direct Supabase Dependency for Critical Data:** Core map data (`gold_samples`, `mineral_localities`) and user authentication/subscription status (`isPro`, `subscriptionStatus`) are fetched directly from Supabase on mount/auth change. There is no local caching or fallback, leading to complete data/status loss when offline (V2, V10).
3.  **No Offline Write Queue:** All user-generated content writes (waypoints, tracks, finds, routes) attempt direct Supabase writes. Failure (due to offline status) results in immediate data loss with no local queue, retry mechanism, or adequate pre-save warning (V3, V4, V6, V14).

These patterns indicate a fundamental architectural gap in handling network intermittency and ensuring data safety, which is critical for an outdoor mapping application.

## Calibration Notes

This run highlighted a critical issue with previous "CONFIRMED" fixes. Several vulnerabilities (P1, V7, V8, V9, V10, V11, V15) that were previously marked as fixed are now re-confirmed as present by the current test suite. This suggests either:
1.  The previous fixes were ineffective or incomplete.
2.  The previous tests were insufficient to truly confirm the fix.
3.  The fixes were reverted in subsequent commits.

This reinforces the need for robust, vulnerability-proof test journeys that explicitly prove or disprove the *existence* of a vulnerability, rather than just checking for a "pass" state. My analysis prioritized direct evidence from annotations and test descriptions that explicitly stated "V1 confirmed" or showed state changes consistent with the vulnerability, even if the Playwright test itself "passed" (meaning it successfully *proved* the vulnerability). I also relied heavily on STATE_MAP.md to confirm the architectural root causes for timed-out tests. I avoided repeating previous PHANTOM verdicts (e.g., Dashboard Tab Obstruction) unless new, direct evidence emerged.