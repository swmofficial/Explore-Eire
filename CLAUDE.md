# Explore Eire — Phase 2 Architect File

> Read this file at session start, then ARCHITECTURE.md, then AGENTS.md.
> Detailed material now lives in `BRAIN/` — see the index below.

## What We're Building

**Explore Eire** — Ireland's all-in-one outdoor platform. One app, one
subscription, five modules (Prospecting / Field Sports / Hiking /
Archaeology / Coastal). Direct competitor to OnX Maps, which does not
serve Ireland or Europe.

**Business model:** Free tier → Explorer €9.99/month → Annual €79/year.

**Strategic direction:** own the Irish outdoor market across all
verticals before anyone else does. Prospecting is the hero entry point.
Other modules ship as data becomes available.

## Stack

React 19 · Vite 8 · MapLibre GL JS v5.22 · Zustand v5 · Supabase ·
Stripe · Capacitor v8 · Vercel (auto-deploy on push to main) ·
Hostinger VPS for WMS proxy · MapTiler basemaps + terrain-rgb-v2 ·
GitHub Actions + Gemini 2.5 Flash for the agent pipeline.

## Infrastructure (essentials)

- **GitHub:** https://github.com/swmofficial/Explore-Eire
- **Deploy:** Vercel — auto on push to main
- **WMS proxy:** `https://srv1566939.hstgr.cloud` (Hostinger VPS, PM2
  `wms-proxy`). Endpoints: `/wms/geo`, `/wms/bed`, `/wms/bore`, `/wms/met`.
- **Supabase:** `https://dozgrffjwxdzixpfnica.supabase.co`
- **Vercel env vars + full structure:** see `BRAIN/STRUCTURE.md`
- **Local `.env`:** never commit. Confirmed in `.gitignore`.

## BRAIN Index

The detailed working knowledge of this project lives under `BRAIN/`.
Everything below was once in this file and was moved out so the agent
working file stays under the 6000-char limit. **Nothing was deleted —
only relocated.** Read whichever file is relevant to your task:

- `BRAIN/STRUCTURE.md` — full repo tree, Vercel env var list, current
  build state matrix. Read this when you need to know where a file lives
  or what env var is required for a feature.
- `BRAIN/BUGS.md` — the 44-rule known bug register. Do not reintroduce
  any of these. Read this before touching auth, MapLibre, basemap
  switching, the DataSheet, BottomNav, or any WMS layer.
- `BRAIN/STATE_MAP.md` — every piece of state, what persists, what dies
  on unmount, every Supabase write and its offline behaviour, all 15
  known vulnerabilities (V1–V15). The UX Agent reasons against this.
- `BRAIN/ROADMAP.md` — Phase 2 priority list. Done items at top, next
  items in order.
- `BRAIN/agents/ux-agent-context.md` — UX knowledge the agent reasons
  against (Apple HIG, Material Design 3, Nielsen Norman, offline-first).
- `BRAIN/agents/ux-agent-prompt.md` — current agent prompt template.

## Multi-Agent System

This repo is worked on by two Claude Code agents in parallel.
See AGENTS.md for full rules, ownership, INTENT protocol, resolution
verdict format. In short:

- **Architect** (Instance 1) — reads UX Agent findings, enriches them,
  writes tasks to `AGENT_REPORTS/pending/`. Never touches application
  code. Commit prefix `[arch]`.
- **Implementer** (Instance 2) — reads `pending/`, implements exactly
  what tasks specify, commits directly to main, adds Resolution verdict,
  moves task to `resolved/`. Commit prefix `[impl]`.

The UX Agent runs on every push to main via
`.github/workflows/ux-agent.yml` and writes structured findings to
`AGENT_REPORTS/ux-findings/`. Resolved tasks feed back into the agent as
calibration data — phantom verdicts teach it what to stop flagging,
confirmed verdicts teach it what to prioritise.

## Test Suite (Phase 2)

The Playwright suite under `tests/ux/` is now three account-tier
journey suites — `guest.spec.js`, `free.spec.js`, `pro.spec.js`. Each
test is a vulnerability proof or capability proof, not a smoke check.
`tests/ux/global-setup.js` logs in the free and pro test accounts via
the live Supabase auth UI and saves storageState files for re-use.
GitHub secrets required: `TEST_FREE_EMAIL`, `TEST_FREE_PASSWORD`,
`TEST_PRO_EMAIL`, `TEST_PRO_PASSWORD`, plus `VERCEL_PREVIEW_URL` and
`GEMINI_API_KEY`.

## Working Rules (sticky)

- Never write a single line of code until you have read CLAUDE.md,
  ARCHITECTURE.md, AGENTS.md, BRAIN/BUGS.md, and the relevant
  BRAIN/STATE_MAP.md sections.
- Shared files (App.jsx, all stores, mapConfig.js, supabase.js,
  global.css, vite.config.js, package.json, CLAUDE.md, AGENTS.md)
  require an INTENT block in CLAUDE.md before modification. See AGENTS.md.
- Commit prefixes: `[arch]` or `[impl]` — never anything else.
- Never commit: `node_modules/`, `.env`, `dist/`, `.DS_Store`,
  `.auth/*.json`, `playwright-report.json`, `test-results/`.

## INTENT Blocks

> Active coordination declarations between agents. See AGENTS.md for
> protocol. CLOSED blocks are removed from this file once their commit
> has landed — historical INTENT records live in commit messages.

## INTENT — Implementer — 2026-04-28
File: AGENTS.md
Change: Add two Architect triage rules before the Commit prefix line in Instance 1 responsibilities.
Affects: Architect must now always triage Pro tier annotations as potential fixes and log any skipped finding in STATUS.md.
Status: CLOSED

## INTENT — Implementer — 2026-04-28
File: src/store/userStore.js
Change: Wrap create() with persist middleware; partialize to theme, isPro, subscriptionStatus.
Affects: These fields now load from localStorage on startup; sign-out path already calls setIsPro(false) which clears the persisted value correctly.
Status: CLOSED

## INTENT — Implementer — 2026-04-28
File: src/store/mapStore.js
Change: Wrap create() with persist middleware; partialize to basemap and layerVisibility only. Also added sessionWaypoints IIFE hydration and clearGuestWaypoints action (task-002).
Affects: basemap and layerVisibility now load from localStorage on startup; sessionWaypoints hydrates from ee_guest_waypoints key.
Status: CLOSED

## INTENT — Implementer — 2026-04-28
File: src/store/moduleStore.js
Change: Wrap create() with persist middleware; partialize to activeModule only.
Affects: activeModule now loads from localStorage on startup.
Status: CLOSED

## INTENT — Implementer — 2026-04-28
File: App.jsx
Change: Replace conditional rendering of non-map tabs with always-mounted CSS display toggling.
Affects: DashboardView, SettingsView, LearnView, ProfileView are always mounted; only visibility changes via display:none.
Status: CLOSED
