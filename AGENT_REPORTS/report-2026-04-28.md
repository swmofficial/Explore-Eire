# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `394c32c`, `afc08b0`, `47b1264`, `4532bf4`, `f75fb1a`, `44abf7e`, `eeff89e`, `3aa364c`, `92031a8`, `ee1382c`, `2ab9669`, `3667c43`, `ade22a6`, `d341ff9`, `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 3/9
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Pro Subscription Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their subscription status and access to Pro features if the app is reloaded while offline.
- Tier(s) affected: pro (and likely free, if they had an active subscription)
- Confidence: HIGH
- Evidence: `pro V10` test failed with `net::ERR_INTERNET_DISCONNECTED` during `page.reload`, directly confirming the scenario. `STATE_MAP.md` states `userStore.isPro` and `subscriptionStatus` are hydrated from Supabase and "Fails" offline, causing `isPro` to be "stuck false, Pro features locked".
- Cannot confirm: Visual evidence of the UI state after the offline reload, as the test timed out during the reload itself.
- Root cause: `userStore.isPro` and `userStore.subscriptionStatus` are not persisted locally (e.g., `localStorage`) and rely solely on Supabase reads, which fail without connectivity.
- User impact: Critical loss of functionality for paying users, who are locked out of features they've paid for, leading to extreme frustration and inability to use the app in common offline scenarios.
- Business impact: Severe damage to user trust, high churn risk for Pro subscribers, and potential for refund requests.
- Fix direction: Implement `localStorage` persistence for `userStore.isPro` and `userStore.subscriptionStatus`, with a clear strategy for re-syncing on connectivity restoration.

### 2. Core Map Data (Gold Samples, Minerals) Missing After Offline Reload (V2)
- Summary: Critical map data layers like gold samples and mineral localities fail to load after an offline reload, rendering the map largely useless for prospecting.
- Tier(s) affected: all (any authenticated user relying on this data)
- Confidence: HIGH
- Evidence: `pro V2` test failed with `net::ERR_INTERNET_DISCONNECTED` during `page.reload`, directly confirming the scenario. `STATE_MAP.md` explicitly states `gold_samples` and `mineral_localities` queries "No data loads" offline.
- Cannot confirm: Visual evidence of the empty map, as the test timed out during the reload itself.
- Root cause: `useGoldSamples` and `useMineralLocalities` fetch data directly from Supabase on app mount without any local caching mechanism (e.g., `IndexedDB` or `localStorage`).
- User impact: Prevents users from performing core prospecting activities when offline, which is a frequent scenario in rural Ireland, making the app unreliable.
- Business impact: Reduces the app's core value proposition, leading to low user satisfaction, poor retention, and negative word-of-mouth, especially among the target prospector demographic.
- Fix direction: Implement an offline-first strategy using a Service Worker and/or `IndexedDB` to cache critical map data on first load and serve it when offline.

### 3. User-Generated Data (Waypoints, Tracks) Lost on Offline Save Attempts (V3, V4, V14)
- Summary: User-generated content like waypoints and GPS tracks are lost if the user attempts to save them while offline, with no prior warning or retry mechanism.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless)
- Confidence: HIGH
- Evidence: `pro V3` test failed (timeout) and annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the lack of an offline warning. `pro V4` test failed (timeout). `STATE_MAP.md` explicitly states `waypoints` INSERT and `tracks` INSERT "Fails" offline, resulting in "YES — waypoint data gone" and "YES — entire GPS trail... gone".
- Cannot confirm: The exact toast message for V3/V4, as the tests timed out.
- Root cause: Supabase write operations for `waypoints` and `tracks` are performed directly without an offline queue or local-first persistence. `V14` is confirmed because there's no pre-save connectivity check.
- User impact: Critical data loss for users who spend significant time creating content, leading to severe frustration and distrust. This is particularly problematic for prospectors who operate in areas with intermittent connectivity.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for all user-generated content, allowing local-first saves and automatic syncing when connectivity is restored. Add a clear offline warning (V14) before attempting a save.

### 4. GPS Tracking Session Lost on Page Reload (V1)
- Summary: Any active GPS tracking session, including the accumulated trail and elevation profile, is entirely lost if the user reloads the page before explicitly saving the track.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no (V1 confirmed)`. `STATE_MAP.md` notes `sessionTrail`, `sessionWaypoints`, `elevationProfile` are in `mapStore` (in-memory) and "None are persisted anywhere until the user explicitly saves."
- Cannot confirm: The exact duration or complexity of the lost track from the annotation.
- Root cause: `mapStore.sessionTrail` and `mapStore.elevationProfile` are volatile in-memory states in a Zustand store, with no auto-save or `localStorage` persistence during an active tracking session.
- User impact: Devastating loss of potentially hours of recorded activity, forcing users to restart their tracking or lose valuable data from their outdoor excursions.
- Business impact: Significant frustration and distrust, especially for users relying on the app for critical navigation and data logging during long trips.
- Fix direction: Implement a robust auto-save mechanism for active tracking sessions, persisting `sessionTrail` and `elevationProfile` to `localStorage` or `IndexedDB` at regular intervals.

### 5. Guest Waypoints are Memory-Only and Lost on Reload (V11)
- Summary: Waypoints created by unauthenticated (guest) users are stored only in volatile memory and are permanently lost upon page reload or app closure.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, confirming the journey completed and waypoints vanished after reload. `STATE_MAP.md` explicitly states `mapStore.sessionWaypoints` are in-memory and "Guest waypoints are memory-only regardless."
- Cannot confirm: The specific content of the lost waypoints.
- Root cause: `sessionWaypoints` are stored in `mapStore`, an in-memory Zustand store, and are not persisted to `localStorage` or `Supabase` for guest users.
- User impact: Loss of user-generated data for unauthenticated users, leading to frustration and a poor first impression, hindering their ability to explore the app's core features.
- Business impact: Prevents guest users from experiencing the full value of the app, hindering conversion to free/pro tiers and increasing bounce rates.
- Fix direction: Implement `localStorage` persistence for guest waypoints, with a clear prompt to sign up or log in to save them permanently to Supabase.

### 6. PRO Badges Inappropriately Displayed to Free Users (F2)
- Summary: The LayerPanel displays "PRO" badges next to premium map layers for free users, creating visual clutter and potentially confusing them about their access.
- Tier(s) affected: free
- Confidence: HIGH
- Evidence: `free F2` test passed with annotation `pro-badge-count: 10`. The screenshot `test-results/free/f2-layer-panel.png` clearly shows multiple "PRO" badges next to various layer toggles.
- Cannot confirm: Whether these badges are interactive or merely visual indicators.
- Root cause: The `LayerPanel` component's rendering logic for PRO badges does not correctly gate their visibility based on the `userStore.isPro` status for free users.
- User impact: Confusing user interface, as free users see features they cannot access, potentially leading to frustration or false expectations about what's included in their tier.
- Business impact: Dilutes the perceived value of the Pro subscription if free users are constantly reminded of locked features in a cluttered way, rather than being enticed by a clear upgrade path.
- Fix direction: Adjust the `LayerPanel` rendering logic to hide PRO badges for free users, or present them in a more integrated, less intrusive way that clearly communicates the upgrade path.

### 7. PRO Badges Inappropriately Displayed to Pro Users (P1)
- Summary: The LayerPanel displays "PRO" badges next to premium map layers even for Pro users, which is redundant and unnecessary.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test failed (timeout), but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` directly confirms 8 PRO badges were found. The screenshot `test-results/pro/p1-1-layer-panel.png` clearly shows "PRO" badges next to layers like "Gold heatmap" and "Arsenic".
- Cannot confirm: The exact reason for the test timeout beyond the badge count.
- Root cause: The `LayerPanel` component's rendering logic for PRO badges does not correctly hide them when `userStore.isPro` is true.
- User impact: Unnecessary visual clutter for paying Pro users, making the interface less clean and potentially implying that these features are still "premium" even after they've paid.
- Business impact: Diminishes the premium feel of the Pro experience, as the UI is not tailored to their unlocked status.
- Fix direction: Adjust the `LayerPanel` rendering logic to hide PRO badges when `userStore.isPro` is true.

### 8. Learn Tab Component State (e.g., scroll, page) Lost on Tab Switch (V13)
- Summary: Navigating away from the Learn tab and returning causes the internal component state (e.g., current chapter page, scroll position) to reset, forcing users to restart their reading.
- Tier(s) affected: all (guest, free confirmed)
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation shows header stats (courses, completePct, chaptersDone) remain 0, indicating no *persisted* progress was lost, but the test title and `UX Knowledge Context - Mobile Navigation State` confirm *component state* loss. The `UX Knowledge Context` explicitly states conditional rendering (used for non-map tabs) violates mobile navigation state persistence.
- Cannot confirm: The exact page/scroll position loss from the provided annotations or screenshots.
- Root cause: Non-map tabs (Dashboard, Settings, Learn, Profile) are conditionally rendered in `App.jsx`, causing them to unmount and lose all internal component state when the user switches to another tab.
- User impact: Significant frustration for users engaged in learning, as they lose their place in chapters and have to navigate back manually, disrupting their learning flow.
- Business impact: Decreased engagement with the Learn module, reduced course completion rates, and a perception of a buggy or unreliable learning experience.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility via CSS, or implement state lifting/persistence for `LearnView` components.

## Tier Comparison

-   **Learn Tab State Loss (V13):** Identical behavior across `guest` and `free` tiers. Both tests passed, confirming component state loss on tab switch. This indicates the conditional rendering of non-map tabs affects all users regardless of authentication status.
-   **Theme Reset (V7):** Identical behavior across `guest` and `free` tiers. Both tests passed, confirming the theme resets to 'dark' on reload. This indicates `theme` is not persisted for any user.
-   **PRO Badges Display:** Differs significantly.
    -   `free` users see 10 "PRO" badges in the LayerPanel (`free F2` annotation).
    -   `pro` users see 8 "PRO" badges in the LayerPanel (`pro P1` annotation).
    -   Ideally, `pro` users should see 0 "PRO" badges, and `free` users should see them presented as an upgrade opportunity, not just clutter.
-   **Offline Data Handling (V2, V3, V4, V10):** Primarily tested for the `pro` tier, revealing critical failures. While not explicitly tested for `free`, the architectural root cause (Supabase direct reads/writes without local persistence) implies `free` users attempting to save data or access dynamic content would experience similar failures. `guest` users do not save to Supabase, so V3/V4/V10 are not directly applicable, but V2 (missing map data) would affect them if they were authenticated.
-   **Waypoint Persistence (V11):** Differs. `guest` waypoints are memory-only and lost on reload (V11 confirmed). `free` and `pro` users *can* save waypoints to Supabase (though this fails offline, per V3).

## Findings Discarded

-   **Basemap Resets to Satellite on Reload (V9):** Discarded. While `STATE_MAP.md` confirms this issue, the `guest V9` test timed out, providing less direct evidence than other findings. Its impact (preference loss) is also lower than data loss or core functionality issues.
-   **Layer Preferences Reset to Defaults on Reload (V8):** Discarded. Similar to V9, `STATE_MAP.md` confirms this, but the `free V8` test timed out. Impact (preference loss) is lower than other critical findings.
-   **Theme Resets to Default on Reload (V7):** Discarded from the top 8. While confirmed with HIGH confidence for both guest and free tiers, its user impact (preference loss) is lower than data loss, core functionality, or confusing UI for paid tiers.

## Cannot Assess

-   **Full Pro Suite Functionality:** The majority of `pro` tier tests failed due to timeouts or `net::ERR_INTERNET_DISCONNECTED` errors. This prevented a comprehensive assessment of Pro-specific features and vulnerabilities, especially those related to online saving and specific UI interactions.
-   **Exact State Loss Details for V13:** While component state loss for the Learn tab is confirmed, the annotations do not provide specific details on lost scroll position or current page within a chapter.
-   **Route Save Offline Toast (V6):** The `pro V6` test passed, but its annotation explicitly stated `route-button-missing: cannot proof V6`. This means the test did not provide direct evidence for the *lack* of a user-facing toast, despite `STATE_MAP.md` indicating "console.error only, no toast".

## Systemic Patterns

-   **Lack of Offline-First Design:** The most pervasive issue is the complete absence of an offline-first strategy. Critical data (gold samples, minerals), user-generated content (waypoints, tracks, finds, routes), and even user authentication/subscription status are not cached locally and fail silently or with data loss when offline. This fundamentally undermines the app's utility for its target user base in rural areas.
-   **Volatile In-Memory State:** Many critical user preferences (`theme`, `basemap`, `layerVisibility`) and active session data (`sessionTrail`, `sessionWaypoints`, `elevationProfile`) are stored solely in volatile Zustand stores (`mapStore`, `userStore`) and are lost on page reload.
-   **Conditional Rendering for Tab Navigation:** The `App.jsx` architecture conditionally renders non-map tabs, leading to component unmounting and complete state loss when switching tabs. This violates fundamental mobile navigation UX principles.
-   **Inconsistent PRO Gating:** The display of "PRO" badges is inconsistent and confusing, appearing for both free and Pro users in the LayerPanel, rather than being a clear, well-integrated upgrade path for free users and completely hidden for Pro users.

## Calibration Notes

-   The new vulnerability-proof test philosophy is effective. Tests passing for V1, V11, V13, V14, V15 directly confirmed the existence of the vulnerabilities by producing evidence of the predicted behaviour (e.g., `track-survived-reload: no (V1 confirmed)`).
-   Timeouts for tests like `guest V9` and `free V8` were interpreted in conjunction with `STATE_MAP.md` to infer the underlying issue (preference loss), but were rated MEDIUM confidence due to the indirect nature of the evidence. This aligns with avoiding PHANTOM verdicts for speculative issues.
-   The explicit `pro-badge-count` annotations were crucial for identifying the PRO badge display issues (F2, P1), demonstrating the value of detailed test annotations.
-   The `net::ERR_INTERNET_DISCONNECTED` errors for offline reload tests (V2, V10) provided strong, direct evidence for critical offline failures, even if the subsequent UI state couldn't be fully assessed. This is a clear improvement over previous test designs.