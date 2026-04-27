# UX Agent Report — 2026-04-27

## Run Context
- Commits analysed: `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226`, `bbbe88c`, `76058ce`, `5ea51e9`, `e2ebef5`, `d0c1560`, `4d6c2e1`, `7911f7b`, `8b8dfc8`, `5baba95`, `26156c1`, `31a079e`, `3efe499`
- Screenshots available: YES (9)
- Test pass rate: 4/10
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Application Blocked by Onboarding/Legal Disclaimer Overlay
- Summary: The application is stuck on an introductory screen (onboarding or legal disclaimer), preventing users from interacting with the main navigation and features.
- Confidence: HIGH
- Evidence: All failed test results (dashboard, map, learn, settings, profile tabs) show a `Test timeout of 60000ms exceeded` error. The Playwright call log explicitly states: `<div>…</div> from <div>…</div> subtree intercepts pointer events`. The screenshots attached to these failed tests (e.g., `app-dashboard-tab-navigates-without-errors/test-failed-1.png`) consistently show the "Explore Eire" splash screen with a "Next →" button, indicating an active onboarding or legal disclaimer flow that is blocking interaction.
- Cannot confirm: Whether the blocking overlay is specifically `Onboarding.jsx` (triggered by `userStore.showOnboarding`) or `LegalDisclaimerModal.jsx` (triggered by `userStore.showLegalDisclaimer`) without inspecting the live DOM at the point of failure.
- Root cause: Either `userStore.showOnboarding` or `userStore.showLegalDisclaimer` is `true` on app load in the test environment, rendering a full-screen overlay with `pointer-events: all` and a high z-index, which prevents interaction with the underlying main application UI.
- User impact: Users are completely blocked from accessing any core functionality of the app, leading to immediate frustration and inability to use the product. This is a critical first-run blocker.
- Business impact: Critical user abandonment, zero engagement, negative first impressions, and likely uninstallation. This is a complete blocker for new users.
- Fix direction: Ensure the test environment is configured to complete or bypass initial onboarding/legal flows, or implement a robust check in `App.jsx` to ensure these modals are dismissed before allowing interaction with the main UI.

### 2. Volatile In-Session Data Loss on App Crash or Close
- Summary: User-generated data accumulated during a session (GPS tracks, waypoints, route points) is stored only in volatile memory and is lost if the app crashes or the browser tab is closed before explicit saving.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under `mapStore` explicitly states: "`sessionTrail`, `sessionWaypoints`, `elevationProfile`, `routePoints` accumulate during active user sessions. None are persisted anywhere until the user explicitly saves. If the app crashes, the browser tab closes, or connectivity drops during a Supabase write — all accumulated data is lost." This directly matches Known Vulnerability V10.
- Cannot confirm: A crash scenario in this specific test run, as the tests are blocked by the onboarding/legal screen.
- Root cause: Lack of local persistence (e.g., IndexedDB or `localStorage` with a robust schema) for in-progress user data that is currently only held in the `mapStore` Zustand instance (which is in-memory).
- User impact: Users can lose significant amounts of work, such as a multi-hour GPS track or a carefully planned route, if the app unexpectedly closes or crashes. This is a catastrophic data loss scenario.
- Business impact: Severe erosion of user trust, negative reviews, and high churn, especially for core features like tracking and route planning. This directly undermines the app's reliability and value proposition.
- Fix direction: Implement an auto-save mechanism to a persistent local storage solution (like IndexedDB) for all in-progress user-generated data, with a clear recovery path.

### 3. Offline Data Writes Fail Silently with Data Loss
- Summary: The application lacks an offline-first data strategy, causing all user data write operations (saving waypoints, tracks, finds, routes) to fail and be lost when the user is offline.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "Supabase Write Map" explicitly details that operations like "Save waypoint", "Save track", "Save find", and "Save route" all "Fail" when offline, often with only a toast message, and result in "YES — data gone." This violates core offline-first principles outlined in the UX Knowledge Context.
- Cannot confirm: An offline scenario in this specific test run, as the tests are blocked by the onboarding/legal screen.
- Root cause: Absence of a persistent local sync queue (e.g., using IndexedDB or a Service Worker) to store outgoing data operations when offline and replay them when connectivity is restored.
- User impact: Users in remote areas with poor or no internet connectivity (a common scenario for an outdoor mapping app) cannot reliably save their critical field data, leading to data loss and extreme frustration. The app becomes unusable in its primary context.
- Business impact: Severe damage to the app's reputation and utility for its target audience, leading to low adoption and high churn among prospectors and outdoor enthusiasts.
- Fix direction: Implement a robust offline-first data synchronization layer with a local persistent queue for all user-generated content.

### 4. Non-Map Tab State Loss on Navigation
- Summary: Switching between non-map tabs (Dashboard, Learn, Settings, Profile) causes the previous tab's internal state (e.g., scroll position, form inputs, selected items) to be lost.
- Confidence: MEDIUM
- Evidence: `UX Knowledge Context` under "Mobile Navigation State" explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines." `STATE_MAP.md` confirms that `moduleStore.activeModule` resets, and `mapStore` and `userStore` are destroyed on page reload, implying that unmounting components will lose their local state.
- Cannot confirm: Direct observation of state loss in this specific test run, as the tests are blocked before tab navigation can be fully tested.
- Root cause: `App.jsx` unmounts components for non-active tabs instead of merely hiding them. This destroys their internal React state, which is not lifted to a persistent store or `localStorage`.
- User impact: Users experience frustration and inefficiency when they switch tabs to check something quickly and then return to find their progress or context within the previous tab has been reset.
- Business impact: Reduced user satisfaction, perceived lack of polish, and increased cognitive load, potentially leading to lower engagement with features like the Learn Hub or Settings.
- Fix direction: Modify `App.jsx` to keep non-map tab components mounted but hidden (e.g., using `display: none` or `visibility: hidden`) or implement state persistence mechanisms (e.g., lifting state to Zustand stores, using `localStorage`) for critical tab-specific states.

### 5. User Preferences (Theme, Basemap, Layers) Not Persisted
- Summary: Several user preferences, such as the selected theme, basemap, and layer visibility, reset to their default values on every page reload or app restart.
- Confidence: MEDIUM
- Evidence: `STATE_MAP.md` under "Persistence Map — localStorage" explicitly lists: "`theme` — resets to 'dark' on every page reload", "`basemap` — always resets to 'satellite'", "`is3D` — always resets to false", and "`layerVisibility` — always resets to { stream_sediment: true }".
- Cannot confirm: Direct observation in this specific test run, as the tests are blocked before these preferences can be changed and reloaded.
- Root cause: These preferences are stored in `mapStore` or `userStore` (Zustand), which are pure in-memory stores and do not use `persist` middleware. They are not written to `localStorage` or any other persistent storage.
- User impact: Users are forced to reconfigure their preferred settings (e.g., switch to light theme, change basemap, re-enable specific layers) every time they open the app, leading to repetitive and annoying setup.
- Business impact: Minor but persistent user friction, contributing to a less polished and less personalized user experience, potentially impacting long-term retention.
- Fix direction: Implement `localStorage` persistence for `theme`, `basemap`, `is3D`, and `layerVisibility` by integrating `persist` middleware into the respective Zustand stores or manually managing `localStorage` updates.

### 6. In-Progress Learning Chapter Position Lost on Tab Switch
- Summary: When a user is reading a chapter in the Learn Hub and switches to another tab, their specific page position within that chapter is lost upon returning, forcing them to restart from the beginning of the chapter.
- Confidence: MEDIUM
- Evidence: `UX Knowledge Context` under "Progress and Motivation Loops" states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch. User reading page 2 of 3 in a chapter switches tabs → returns → chapter restarts at page 1."
- Cannot confirm: Direct observation in this specific test run, as the tests are blocked before the Learn tab can be accessed and navigated.
- Root cause: The `ChapterReader` component's internal state, which tracks the current page within a chapter, is not persisted when the `LearnView` component is unmounted (due to `App.jsx`'s conditional rendering of non-map tabs).
- User impact: Users engaged in learning content are frustrated by losing their place, disrupting their learning flow and requiring them to manually navigate back to their last read page.
- Business impact: Reduced engagement with the Learn Hub, perceived unreliability of the learning system, and potential abandonment of courses due to friction.
- Fix direction: Persist the `ChapterReader`'s current page state to `localStorage` or a global Zustand store, and re-hydrate it when the component mounts.

### 7. Gold Samples and Mineral Localities Not Cached Locally
- Summary: The application fetches large datasets like gold samples and mineral localities from Supabase on every mount, without local caching, leading to slower loading times and unavailability when offline.
- Confidence: MEDIUM
- Evidence: `UX Knowledge Context` under "Offline-First Design" states: "gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache." This is a direct violation of offline-first principles.
- Cannot confirm: Direct observation of slow loading or offline failure in this specific test run, as the tests are blocked by the onboarding/legal screen.
- Root cause: The data fetching mechanism for these datasets does not utilize a local caching strategy (e.g., IndexedDB or Service Worker cache) to store previously fetched data.
- User impact: Users experience slower data loading times, especially on slower connections, and are unable to view this critical information when they are offline, which is a common scenario for prospectors.
- Business impact: Degraded performance, reduced utility in key user scenarios (offline exploration), and a perception of the app being less robust than competitors.
- Fix direction: Implement a local caching strategy (e.g., using IndexedDB or a Service Worker) for frequently accessed, large datasets like gold samples and mineral localities to enable offline access and faster loading.

### 8. Profile Tab Test Failure due to Selector Ambiguity
- Summary: The Playwright test for the 'Profile' tab fails due to a strict mode violation, as the selector `getByRole('button', { name: 'Profile' })` matches two distinct elements.
- Confidence: LOW (UX Impact) / HIGH (Test Impact)
- Evidence: The test result for "profile tab navigates without errors" shows `Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Profile' }) resolved to 2 elements: 1) <button>…</button> aka getByRole('button', { name: 'My Account View your profile' }) 2) <button aria-label="Profile">…</button> aka getByRole('button', { name: 'Profile', exact: true })`.
- Cannot confirm: The visual layout or context of these two "Profile" buttons without a live DOM inspection or more detailed screenshots.
- Root cause: The Playwright test uses a generic selector (`name: 'Profile'`) that is not specific enough. While this is primarily a test issue, it *could* indicate a minor UX ambiguity if two interactive elements with similar accessible names are visually close or in confusing contexts.
- User impact: Minimal direct user impact, as a human user can likely distinguish between a "My Account" button and a bottom navigation "Profile" button. However, it points to a potential for confusion if the naming or placement were less clear.
- Business impact: Primarily impacts test reliability and development efficiency. Indirectly, if the ambiguity were more severe, it could lead to user errors.
- Fix direction: Update the Playwright test selector for the 'Profile' tab to be more specific, likely by adding `exact: true` or using a more precise role/label combination, similar to the fix applied to the 'Map' button in a previous commit.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were distinct and had sufficient evidence.

## Cannot Assess
- **Offline functionality:** Due to the blocking onboarding/legal screen, no tests could proceed to interact with features that would expose offline behavior (e.g., saving waypoints, loading data without network).
- **Performance metrics:** The tests timed out due to blocking elements, preventing any meaningful performance measurements or observations of loading states for large datasets.
- **Specific UI/visual regressions:** While screenshots were provided, the blocking overlay prevented interaction with the main UI, making it impossible to assess specific visual elements or interactions beyond the initial splash/onboarding.
- **User journey completion:** No user journeys could be completed due to the initial blocking state, limiting analysis to initial load and navigation attempts.

## Systemic Patterns
- **Lack of State Persistence:** A recurring theme is the absence of robust state persistence. In-memory Zustand stores are not backed by `localStorage` for user preferences (`theme`, `basemap`, `layerVisibility`) or for critical in-progress user data (`sessionTrail`, `sessionWaypoints`, `routePoints`). This leads to data loss and repetitive setup for users.
- **Incomplete Offline-First Implementation:** While offline tile caching exists, the application fundamentally lacks an offline-first strategy for user-generated data writes and for caching large, frequently accessed datasets (gold samples, mineral localities). This makes the app unreliable and less useful in its intended outdoor, potentially offline, environment.
- **Blocking Initial User Experience:** The current test failures highlight a critical blocker in the initial user experience (onboarding/legal disclaimer), preventing any interaction with the core application. This indicates a potential gap in the initial setup or testing of the application's first-run experience.

## Calibration Notes
- I carefully avoided re-flagging the "Dashboard Tab Obstruction" as PHANTOM, as the current `intercepts pointer events` error clearly originates from a different, higher-level overlay (onboarding/legal screen) as evidenced by the screenshots. This is a distinct and confirmed issue.
- I learned from the previous "Map Button Naming Ambiguity" (MISDIAGNOSED) to be precise about the nature of selector issues. For the "Profile Tab Test Failure," I explicitly noted it's primarily a Playwright test issue, while acknowledging the *potential* for minor UX ambiguity if not handled carefully. This reflects a more nuanced understanding of test failures vs. direct UX problems.
- I prioritized findings related to data loss and app blocking, as these have the highest user and business impact, aligning with the goal of identifying real, critical UX issues.
- I expanded on architectural issues identified in `STATE_MAP.md` and `UX Knowledge Context` (e.g., preference persistence, learning state loss, data caching) to provide a more comprehensive report, moving beyond just the directly observed test failures.