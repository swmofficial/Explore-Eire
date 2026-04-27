# UX Agent — External Knowledge Context
> Synthesised UX principles relevant to Explore Eire.
> Injected into UX Agent prompt alongside STATE_MAP.md.
> Sources: Apple HIG, Material Design 3, Nielsen Norman Group, PWA best practices, offline-first design.

---

## 1. Mobile Navigation State

**Apple HIG — Tab Bars:** Each tab must maintain its own navigation state independently. Switching tabs should never destroy the user's position within a tab. The user expects to return to exactly where they were.

**Material Design 3 — Navigation Bar:** Bottom navigation destinations should preserve scroll position, form state, and selection state when switching between them. The framework explicitly states: "content in each destination should be independently navigable."

**Relevance to Explore Eire:** App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines. DashboardView, SettingsView, LearnView, and ProfileView lose all component state on tab switch. Users who switch to the map to check something will lose their position in course lists, settings sub-pages, and profile scroll position.

**Expected behaviour:** Tab content either persists in the DOM (visibility toggled, like MapView already does) or state is lifted to a store / localStorage so it survives unmount.

---

## 2. Progress and Motivation Loops

**Nielsen Norman — Progress Indicators:** Users must see evidence of their progress to maintain motivation. Progress that resets or disappears signals the system is unreliable. Trust in progress persistence is a prerequisite for engagement with any learning or achievement system.

**Gamification research (Deterding et al.):** The progress motivation loop requires three properties: visibility (user can always see where they are), persistence (progress never vanishes), and continuity (resuming picks up exactly where they stopped). Breaking any one property collapses engagement.

**Relevance to Explore Eire:** Learn module writes chapter progress to localStorage on every chapter completion — this is correct per the codebase (markChapterComplete calls localStorage.setItem). However, in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch. User reading page 2 of 3 in a chapter switches tabs → returns → chapter restarts at page 1.

---

## 3. Offline-First Design

**Google Web Fundamentals — Offline First:** "Offline-first" means the app works without a network connection as its baseline, with network as an enhancement. The user should never encounter a state where the app appears functional but silently fails to save data.

**Core offline-first principles:**
1. **Local-first writes:** All data writes go to local storage first, then sync to server when connectivity returns. Never make the user wait for a network round-trip to confirm an action.
2. **Sync queue:** A persistent queue of unsynced operations (IndexedDB or localStorage). Each entry contains the operation type, data, timestamp, and retry count.
3. **Conflict resolution:** Last-write-wins for simple cases. Server-authoritative for shared data.
4. **Sync status indicators:** Users must know: (a) is this data saved locally? (b) is this data synced to server? Two distinct states, both visible.

**PWA best practices (web.dev):**
- Cache critical data on first load, not just tiles
- Implement a Service Worker that queues failed fetch requests for replay
- Show distinct UI for "saved locally" vs "synced to server"
- Never show an empty screen when cached data exists

**Relevance to Explore Eire:** The app has offline tile caching (Service Worker + Cache API) but zero offline data capability. Gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache. All writes (waypoints, tracks, finds, routes) fail silently offline with only a toast. The target user base (prospectors in rural Ireland) will regularly be offline. This is not an edge case — it is the primary use context.

---

## 4. Data Safety

**Apple HIG — Data Loss Prevention:** "Never let users lose their work." Apps must auto-save user-generated content. If auto-save isn't possible, warn before any action that would discard unsaved changes. Provide recovery mechanisms for interrupted operations.

**Nielsen Norman — Error Recovery:** Users should never be punished for system failures. If a save operation fails, the system must: (a) retain the data locally, (b) inform the user clearly, (c) provide a retry mechanism, (d) auto-retry when conditions improve.

**Material Design 3 — Save Patterns:** "The system should save user work continuously and automatically." Explicit save actions are a last resort, not the primary mechanism. When explicit save is required, the system must make the consequences of not saving obvious.

**Relevance to Explore Eire:** GPS tracking accumulates in Zustand (volatile memory) with no auto-save. A 3-hour hike produces a track that exists only in mapStore.sessionTrail. If the app crashes, the OS kills the process, or the user accidentally closes the tab — the entire track is unrecoverable. The Save/Discard flow after stopping is correct UX, but there is no crash protection layer beneath it.

---

## 5. Touch Target and Gesture Patterns

**Apple HIG — Touch Targets:** Minimum 44×44pt touch targets. Interactive elements must have sufficient spacing to prevent accidental taps. Bottom sheet drag handles need a generous hit area (the full-width top section, not just the visual handle bar).

**Material Design 3 — Bottom Sheets:** Drag gesture velocity determines intent. Slow drags allow precise positioning; fast flicks should snap to the nearest threshold. Sheet must not interfere with map gestures beneath it. The collapsed peek state should show enough content to signal that more is available.

**Gesture conflict zones:** When a bottom sheet overlaps a map, the gesture system must disambiguate between sheet drag (vertical) and map pan (any direction). Common solution: restrict sheet drag to the handle area only, not the full sheet surface.

**Relevance to Explore Eire:** DataSheet uses spring gesture with 1:1 tracking and velocity-based snapping — this follows best practice. The two-layer architecture (outer pointer-events:none, inner pointer-events:all) correctly prevents gesture conflicts with the map. Handle has explicit pointer-events:auto for collapsed state.

---

## 6. Form State Persistence

**Nielsen Norman — Form Design:** Users expect form inputs to survive navigation. Typing a long description, switching apps to check something, returning — the text must still be there. Mobile users are frequently interrupted (calls, notifications, multitasking).

**Apple HIG — State Restoration:** "When people reopen your app, they should be able to immediately resume where they left off." This applies to all interactive states: form inputs, scroll positions, modal states, and selection states.

**Relevance to Explore Eire:** WaypointSheet and AddFindSheet use local useState for form fields. If the user is filling in a waypoint description, switches to the map to verify location, and comes back — the form is gone (WaypointSheet unmounts when waypointSheet state is set to null, which happens independently of tab switching). However, since these sheets are inside Map.jsx (which stays mounted), they only lose state if explicitly closed, not on tab switch. This is acceptable.

---

## 7. Loading and Empty States

**Nielsen Norman — Skeleton Screens:** Show structural placeholders while data loads. Never show a blank screen. Users interpret blank screens as errors, even when data is simply loading.

**Material Design 3 — Empty States:** Empty states must be actionable. Don't just say "No items." Tell the user what to do: "You haven't saved any waypoints yet. Tap the camera button on the map to save your first spot."

**Relevance to Explore Eire:** gold_samples loads 9,313 rows in batches of 1,000 from Supabase. During this load (which can take several seconds on slow connections), the map shows zero gold markers. There is no loading indicator for data specifically — only the splash screen covers the initial load. If the user is already past the splash screen (e.g., returning from a tab switch or after the 1.8s splash), they see an empty map during data load.

---

## 8. Notification and Alert Patterns

**Apple HIG — Notifications:** Notifications must be timely, relevant, and actionable. Never use notifications for marketing without explicit user opt-in. The permission prompt should explain the value before requesting.

**Relevance to Explore Eire:** The notification system uses a pre-prompt pattern (NotificationPrePrompt) before requesting browser permission — this follows Apple's recommendation. Trigger events are contextual (first waypoint, first chapter). The snooze mechanism (7-day cooldown) prevents annoyance. This system is well-designed.

---

## 9. Critical UX Heuristics for Outdoor Apps

**Fieldwork context constraints:**
- One-handed use while hiking/wading
- Gloves (winter prospecting) — touch targets must be generous
- Bright sunlight — contrast must be high, not just "dark theme"
- Wet screens — swipe gestures may misfire on wet glass
- Intermittent connectivity — the norm, not the exception
- Battery anxiety — GPS tracking drains battery; user may force-close app to save power
- Session duration — prospecting sessions last 2-8 hours; any data loss is catastrophic relative to effort invested

**Trust hierarchy for outdoor users:**
1. My data is safe (tracks, waypoints, finds)
2. The map works where I am (offline, data visible)
3. GPS is accurate and responsive
4. I can find what I need quickly (layer toggles, search)
5. The app looks good (lowest priority)

Data safety is the #1 trust driver. A beautiful app that loses a 4-hour track will be uninstalled immediately. An ugly app that reliably saves every waypoint will be recommended to friends.

---

## 10. Confidence Scoring Framework

When the UX Agent evaluates a finding, it must score confidence using:

**HIGH (80-100%):**
- Finding is directly observable in code (e.g., useState without persist → data loss on unmount)
- Finding matches a known vulnerability in STATE_MAP.md
- Screenshot confirms the visual state
- No alternative explanation exists

**MEDIUM (50-79%):**
- Finding is inferred from architecture (e.g., "this probably fails offline" but no test confirms it)
- Code suggests the issue but edge case handling may exist elsewhere
- Screenshot is ambiguous or missing

**LOW (20-49%):**
- Finding is speculative based on common patterns
- Could not confirm in code — relies on general UX knowledge
- Multiple alternative explanations exist

**PHANTOM (0-19%):**
- Agent cannot point to specific code causing the issue
- Finding contradicts what the code actually does
- Agent is guessing based on file names or test descriptions alone
- **Must be explicitly labelled and discarded**
