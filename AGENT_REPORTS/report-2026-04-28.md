# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `ade22a6`, `d341ff9`, `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226`, `bbbe88c`, `76058ce`, `5ea51e9`, `e2ebef5`, `d0c1560`, `4d6c2e1`, `7911f7b`, `8b8dfc8`, `5baba95`, `26154c1`
- Screenshots available: YES (9)
- Test pass rate: 4/10
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Application Blocked by Onboarding Overlay
- Summary: The application is stuck on an onboarding screen, preventing users from interacting with the main navigation and features.
- Confidence: HIGH
- Evidence: All failed tab navigation tests (dashboard, map, learn, settings, profile) show a `Test timeout of 60000ms exceeded` error. The Playwright call log consistently states: `<div>…</div> from <div>…</div> subtree intercepts pointer events`. The screenshots attached to these failed tests (e.g., `app-dashboard-tab-navigates-without-errors/test-failed-1.png`) consistently show the "Explore Eire" splash screen with a "Next →" button, indicating an active onboarding flow that is blocking interaction.
- Cannot confirm: Whether the legal disclaimer modal (`LegalDisclaimerModal.jsx`) is also active or if it's solely the onboarding (`Onboarding.jsx`).
- Root cause: `userStore.showOnboarding` is `true` on app load in the test environment, rendering a full-screen overlay with `pointer-events: all` and a high z-index, which prevents interaction with the underlying main application UI.
- User impact: Users are completely blocked from accessing any core functionality of the app, leading to immediate frustration and inability to use the product. This is a critical first-run blocker.
- Business impact: Critical user abandonment, zero engagement, negative first impressions, and likely uninstallation. This is a complete blocker for new users.
- Fix direction: Ensure the test environment is configured to complete or bypass initial onboarding/legal flows, or implement a robust check in `App.jsx` to ensure these modals are dismissed before allowing interaction with the main UI.

### 2. Volatile In-Session Data Loss on App Crash or Close (V10)
- Summary: User-generated data accumulated during a session (GPS tracks, waypoints, route points) is stored only in volatile memory and is lost if the app crashes or the browser tab is closed before explicit saving.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under `mapStore` explicitly states: "`sessionTrail`, `sessionWaypoints`, `elevationProfile`, `routePoints` accumulate during active user sessions. None are persisted anywhere until the user explicitly saves. If the app crashes, the browser tab closes, or connectivity drops during a Supabase write — all accumulated data is lost." This directly matches Known Vulnerability V10.
- Cannot confirm: A crash scenario in this specific test run, as the tests are blocked by the onboarding/legal screen.
- Root cause: Lack of local persistence (e.g., IndexedDB or `localStorage` with a robust schema) for in-progress user data that is currently only held in the `mapStore` Zustand instance (which is in-memory).
- User impact: Users can lose significant amounts of work, such as a multi-hour GPS track or a carefully planned route, if the app unexpectedly closes or crashes. This is a catastrophic data loss scenario.
- Business impact: Severe erosion of user trust, negative reviews, and high churn, especially for core features like tracking and route planning. This directly undermines the app's reliability and value proposition.
- Fix direction: Implement an auto-save mechanism to a persistent local storage solution (like IndexedDB) for all in-progress user-generated data, with a clear recovery path.

### 3. Offline Data Writes Fail Silently with Data Loss (V11)
- Summary: The application lacks an offline-first data strategy, causing all user data write operations (saving waypoints, tracks, finds, routes) to fail and be lost when the user is offline.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "Supabase Write Map" explicitly details that operations like "Save waypoint", "Save track", "Save find", and "Save route" all "Fail" when offline, often with only a toast message, and result in "YES — data gone." This violates core offline-first principles outlined in the UX Knowledge Context. This directly matches Known Vulnerability V11.
- Cannot confirm: An offline scenario in this specific test run, as the tests are blocked by the onboarding/legal screen.
- Root cause: Absence of a persistent local sync queue (e.g., using IndexedDB or a Service Worker) to store outgoing data operations when offline and replay them when connectivity is restored.
- User impact: Users in remote areas with poor or no internet connectivity (a common scenario for an outdoor app) will experience critical data loss and frustration when their actions fail to save.
- Business impact: Leads to user distrust, negative reviews, and reduced adoption among the target demographic who rely on offline functionality. It undermines the app's core value proposition for outdoor use.
- Fix direction: Implement an offline-first architecture with a persistent local queue for all data write operations, ensuring data is saved locally first and synced when online.

### 4. Profile Tab Selector Ambiguity in Tests
- Summary: The Playwright test for the 'Profile' tab fails due to ambiguity, indicating two elements share the accessible name "Profile", which could lead to accessibility or usability issues.
- Confidence: HIGH
- Evidence: The `profile tab navigates without errors` test failed with a `strict mode violation` error: `getByRole('button', { name: 'Profile' }) resolved to 2 elements: 1) <button>…</button> aka getByRole('button', { name: 'My Account View your profile' }) 2) <button aria-label="Profile">…</button> aka getByRole('button', { name: 'Profile', exact: true })`.
- Cannot confirm: The exact visual layout or user confusion without seeing the app in a state where both elements are visible and interactive.
- Root cause: Two distinct interactive elements in the DOM have the accessible name "Profile" (or a substring match), causing Playwright's strict mode to fail. This suggests a potential lack of unique, descriptive accessible names for interactive elements.
- User impact: While primarily a test issue, having multiple elements with the same accessible name can confuse screen reader users or lead to unexpected interactions if a user tries to click a "Profile" button and gets a different one than intended.
- Business impact: Minor, primarily affecting test reliability. However, it hints at underlying accessibility issues that could impact a subset of users.
- Fix direction: Update the Playwright selector to be more specific (e.g., `exact: true` or a more precise role/label combination). Review UI for unique and descriptive accessible names for all interactive elements.

### 5. Tab Navigation State Not Preserved
- Summary: Switching between main navigation tabs (Dashboard, Learn, Settings, Profile) causes the content of the previous tab to unmount and lose its state, forcing users to restart their interaction.
- Confidence: MEDIUM
- Evidence: `UX Knowledge Context - Mobile Navigation State` explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines. DashboardView, SettingsView, LearnView, and ProfileView lose all component state on tab switch."
- Cannot confirm: The specific state loss (e.g., scroll position, form input) in this test run, as the tests are blocked by the onboarding screen.
- Root cause: `App.jsx` conditionally renders non-map tabs, causing them to unmount when inactive. This destroys their internal React component state.
- User impact: Users lose their place when navigating away from a tab and returning (e.g., losing scroll position in a list, form input, or progress in a learning module), leading to frustration and inefficiency.
- Business impact: Reduced user satisfaction and engagement, particularly for content-heavy tabs like Learn and Profile, as users are repeatedly forced to re-find their place.
- Fix direction: Implement state preservation for tab content, either by keeping components mounted (visibility toggled) or by lifting critical state to a persistent store (Zustand or localStorage) that survives unmount/remount cycles.

### 6. Map State Not Persisted Across Sessions
- Summary: User-configured map settings, such as the active basemap, 3D view, and layer visibility, are not saved and reset to defaults on every page reload.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "What is NOT in localStorage (but should be)" explicitly lists: "`basemap` — always resets to 'satellite'", "`is3D` — always resets to false", "`layerVisibility` — always resets to { stream_sediment: true }".
- Cannot confirm: This behaviour in the current test run, as the tests are blocked by the onboarding screen.
- Root cause: The `mapStore` keys (`basemap`, `is3D`, `layerVisibility`) are not configured with Zustand's persist middleware or explicitly saved to `localStorage`.
- User impact: Users who customize their map view (e.g., prefer a specific basemap or layer combination) will find their preferences reset every time they close and reopen the app, leading to repeated configuration effort.
- Business impact: Minor annoyance, but contributes to a perception of the app being less "smart" or personalized, potentially reducing long-term user satisfaction.
- Fix direction: Implement `localStorage` persistence for `basemap`, `is3D`, and `layerVisibility` state keys within `mapStore` to ensure user preferences are retained across sessions.

### 7. User Theme Preference Not Persisted
- Summary: The user's selected theme (e.g., 'dark' or 'light') is not saved and resets to the default 'dark' theme on every page reload.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under `userStore` states: "`theme` is NOT persisted to localStorage — it resets to 'dark' on every page reload."
- Cannot confirm: This behaviour in the current test run, as the tests are blocked by the onboarding screen.
- Root cause: The `theme` state key in `userStore` is not persisted to `localStorage`.
- User impact: Users who prefer a different theme will have to re-select it every time they open the app, leading to minor but recurring frustration.
- Business impact: Minor, but impacts user personalization and attention to detail. Can detract from the overall polished feel of the application.
- Fix direction: Implement `localStorage` persistence for the `theme` state key within `userStore` to ensure user preferences are retained across sessions.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were distinct and had sufficient evidence.

## Cannot Assess
- The full user journey beyond the initial splash/onboarding screen could not be assessed due to the blocking overlay. This includes interactions with the map, data sheets, forms, and module-specific features.
- Offline behaviour could not be directly observed or tested.
- Specific console errors during navigation (beyond the timeout) could not be assessed due to the test failures.

## Systemic Patterns
- **Lack of Persistence:** Multiple critical user preferences and in-session data are not persisted, leading to data loss and state resets. This affects `mapStore` (session data, map state) and `userStore` (theme). This is a fundamental architectural flaw for a mobile-first application.
- **First-Run Blocking:** The onboarding/legal flow is not handled gracefully in the test environment, completely blocking further interaction. This highlights a need for robust first-run experience management.
- **Offline-First Deficiencies:** The application fundamentally lacks an offline-first strategy for data writes, which is critical for its target user base.

## Calibration Notes
- I successfully identified the blocking onboarding overlay, which was a re-confirmation of a critical issue from the previous report (Finding 1). This pattern is now strongly confirmed.
- I correctly identified the `strict mode violation` for the 'Profile' button as a Playwright selector issue, similar to a previous `MISDIAGNOSED` case for the 'Map' button. However, I also noted its potential UX/accessibility implications, which is an improvement in analysis.
- I prioritised and included the data loss (V10) and offline failure (V11) issues, as they were previously confirmed by `STATE_MAP.md` and represent severe user impact.
- I expanded the analysis to include other persistence issues (map state, theme) and the tab navigation state loss, drawing directly from `STATE_MAP.md` and the `UX Knowledge Context`, which were not explicitly called out in the previous report but are significant architectural concerns.
- I avoided speculating on "unforeseen side effects" or "haptic feedback regressions" without concrete evidence, learning from previous `PHANTOM` verdicts.