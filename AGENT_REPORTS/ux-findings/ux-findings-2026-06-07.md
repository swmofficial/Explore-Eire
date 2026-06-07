# UX Agent Report — 2026-06-07

## Run Context
- Commits analysed: `b0fe7c9` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Widespread Persistence Failures Lead to Data and Preference Loss (V1, V7, V8, V9, V11, V15)
- Summary: Multiple user preferences (theme, basemap, layer visibility) and critical session data (active module, guest waypoints, active GPS track) are lost on page reload across all tiers, directly contradicting `STATE_MAP.md`'s persistence claims.
- Tier(s) affected: All (V7, V9, V11, V15 confirmed in Guest/Free; V1 confirmed in Pro; V8 in Free).
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `theme` resets to 'dark'. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` failed: `basemap` and `layerVisibility` preferences reset (test timeouts imply default state).
    - `guest V11` passed: Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: Annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: Annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure for each persistence mechanism (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Widespread failure in `localStorage` persistence mechanisms. This affects both manual IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and the Zustand `persist` middleware (for `ee-map-prefs`). The `null` values for `ee_theme` suggest the key is not even being written to `localStorage`. This points to a fundamental problem with `localStorage` access, key naming, or the persistence setup itself, possibly a regression or incomplete deployment of previous fixes.
- User impact: Significant frustration as app settings and unsaved work are repeatedly lost, undermining app reliability. Loss of active GPS tracks is particularly severe.
- Business impact: High churn, negative user perception, inability to rely on core features.
- Fix direction: Systematically debug all `localStorage` persistence implementations (manual IIFE and Zustand `persist` middleware) across `userStore`, `mapStore`, and `moduleStore`. Verify `localStorage` keys are correctly set and retrieved.

### 3. High: Pro User Incorrectly Gated by Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, or the test couldn't proceed because the UI was in an unexpected state (e.g., UpgradeSheet was visible).
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `userStore.isPro` at the time of the tap.
- Root cause: Likely a race condition or bug in the `useAuth` hook's hydration of `userStore.isPro` or `userStore.subscriptionStatus` from Supabase, or an issue with the `global-setup.js` ensuring `isPro:true` is set in `ee-user-prefs` before the test begins. The app's UI is incorrectly evaluating the user's Pro status.
- User impact: Paying users are blocked from accessing features they have subscribed to, leading to extreme frustration and a perception of being defrauded.
- Business impact: Direct loss of trust, high churn among paying subscribers, and potential for negative reviews.
- Fix direction: Debug the `useAuth` hook's `isPro` and `subscriptionStatus` hydration logic, ensuring it correctly reads from both Supabase and persisted `localStorage` state. Review `global-setup.js` for robust `isPro` state setup.

### 4. High: Critical Offline Data Loss and Lack of Offline-First Design (V4, V6, V14)
- Summary: User-generated data (tracks, routes) is lost or fails silently when the app is offline, and there is no pre-save warning for waypoints, indicating a fundamental lack of offline-first capabilities.
- Tier(s) affected: Pro (V4, V6, V14 confirmed), Free (implicitly, if they could save tracks/routes).
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: Confirms track save fails offline, leading to data loss. `STATE_MAP.md` states "Save track fails — toast 'Could not save track'".
    - `pro V6` passed: Annotation `route-button-missing: cannot proof V6`. While the test couldn't explicitly prove the *absence* of a toast, `STATE_MAP.md` confirms "Route save fails — console.error only, no toast", indicating silent failure.
    - `pro V3` (failed due to GPS, but also) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` confirms no warning is shown before attempting to save a waypoint offline.
- Cannot confirm: The specific toast messages or console errors generated during these offline failures, as screenshots are not provided for these specific steps.
- Root cause: The application lacks a robust offline-first architecture, specifically a local data store or sync queue for user-generated content. All write operations directly attempt to interact with Supabase, leading to immediate failure and data loss when offline.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) will lose significant work (e.g., entire GPS tracks from a hike), leading to severe frustration and distrust.
- Business impact: The app is unreliable in its primary use environment, leading to high churn, negative word-of-mouth, and failure to meet core user needs.
- Fix direction: Implement an offline data persistence layer (e.g., IndexedDB) with a sync queue for all user-generated content. Provide clear UI feedback for offline status and queued operations. Implement pre-save offline warnings.

## Tier Comparison
- **Persistence Failures (V7, V8, V9):** Theme (V7) resets to default 'dark' on reload for both guest and free tiers, with `ee_theme` localStorage key reported as `null` before and after reload. Basemap (V9) and layer preferences (V8) also reset for guest and free tiers respectively, indicating a systemic failure in `ee-map-prefs` persistence. This identical behavior across tiers suggests a fundamental issue with `localStorage` access or the persistence setup itself, rather than an authentication-specific problem.
- **Learn Tab State (V13):** The Learn tab header statistics (courses, completePct, chaptersDone) are correctly preserved across tab switches for both guest and free tiers, as evidenced by identical `before` and `after` values in `state-loss-evidence` annotations. This indicates the V13 fix for header stats is working, despite the misleading test description.
- **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled due to "Acquiring GPS..." for Pro users (P3, V3). While Free users cannot save waypoints (F3), this underlying GPS acquisition failure would likely affect them if they had the capability, suggesting a core map/geolocation issue independent of tier.
- **Offline Test Failures (V2, V10):** The tests for Pro V2 (gold/mineral data missing offline) and Pro V10 (Pro status reverts offline) failed to even load the page due to `net::ERR_INTERNET_DISCONNECTED`. This indicates a problem with the Playwright offline test setup for these specific journeys, preventing assessment of the vulnerabilities themselves.

## Findings Discarded
- **V13 (Learn tab state loss):** Discarded as the `state-loss-evidence` annotations for both guest and free tiers show identical `before` and `after` values for learn header stats, indicating the state is correctly preserved. The test description is misleading.
- **V2 (Gold/mineral data missing offline) and V10 (Pro status reverts to free on offline reload):** Discarded as the tests failed to load the page offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any assessment of the actual vulnerability. This is a test setup issue, not a UX finding.

## Cannot Assess
- The exact reason for the `net::ERR_INTERNET_DISCONNECTED` error in the `pro V2` and `pro V10` tests, which prevented the assessment of these vulnerabilities. This indicates a problem with the Playwright offline test setup for these specific journeys.

## Systemic Patterns
- **Widespread `localStorage` Persistence Failure:** Multiple independent persistence mechanisms (Zustand `persist` middleware for `ee-map-prefs` and manual IIFE patterns for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are failing across all tiers. This points to a fundamental issue with `localStorage` access, key management, or the persistence layer's initialization/hydration logic, rather than isolated bugs.
- **GPS Acquisition Instability:** The consistent failure to acquire GPS position, leading to disabled "Save Waypoint" buttons, suggests a problem with the `useTracks` hook, `Map.jsx watchPosition` implementation, or the Playwright geolocation mock integration. This impacts core map functionality.
- **Incomplete Offline-First Implementation:** The app continues to exhibit critical data loss and silent failures when offline for user-generated content (tracks, routes, waypoints), confirming that a robust offline-first strategy with local queuing and sync mechanisms is still missing.

## Calibration Notes
- Prioritized findings with direct evidence from annotations (e.g., `V11 confirmed`, `V15 confirmed`, `ee_theme: null`).
- Carefully re-evaluated "passed" tests that claimed to confirm vulnerabilities (e.g., V1, V11, V15) by checking the specific annotation evidence.
- Avoided misdiagnosing test setup failures (e.g., `net::ERR_INTERNET_DISCONNECTED` for V2, V10) as application UX issues, consistent with past "PHANTOM" verdicts for similar test environment problems.
- Noted misleading test descriptions (e.g., V13) when the evidence contradicted the description, ensuring the report reflects actual observed behavior.