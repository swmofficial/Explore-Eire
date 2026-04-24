# Explore Eire — Phase 2 Architect File
> Last updated: 2026-04-24
> For full design system, module specs, DB schema see ARCHITECTURE.md
> For product vision and backlog see BRAIN/ROADMAP.md
> For architecture decisions see BRAIN/DECISIONS.md
> DO NOT write a single line of code until you have read this file in full

---

## Project Knowledge Base
Full context lives in BRAIN/:
- BRAIN/ROADMAP.md — product vision, backlog, completed features
- BRAIN/DECISIONS.md — architecture decisions and reasoning
- BRAIN/BUGS.md — bug register (44 rules — read before touching anything)
- BRAIN/STRUCTURE.md — full project file tree with annotations

Read those files when you need product, architecture, or structure context.
Gemini receives only this file — keep it under 6000 chars.

---

## Infrastructure

- **GitHub repo:** https://github.com/swmofficial/Explore-Eire
- **Deployment:** Vercel — auto-deploys on every push to `main`
- **VPS (WMS proxy):** `187.124.212.83` / `srv1566939.hstgr.cloud` — Ubuntu 24.04 LTS, PM2 `wms-proxy` process
- **Proxy URL (HTTPS via Traefik):** `https://srv1566939.hstgr.cloud` — Health check: `https://srv1566939.hstgr.cloud/health`
- **Proxy endpoints:** `/wms/geo` → GSI Geochemistry, `/wms/bed` → GSI Bedrock, `/wms/bore` → GSI Boreholes, `/wms/met` → Met Éireann WMS
- **Supabase:** `https://dozgrffjwxdzixpfnica.supabase.co`
- **MapTiler:** satellite (default), outdoor-v2, topo-v2 + terrain-rgb-v2

**Vercel env vars (set in Vercel dashboard):**
```
VITE_MAPTILER_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PRICE_ID_MONTHLY
VITE_STRIPE_PRICE_ID_ANNUAL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY
APP_URL
```

**Local `.env` (never commit — confirmed in .gitignore):**
```
VITE_MAPTILER_KEY=HPJlwqR1pNmrR3Eyirrv
VITE_SUPABASE_URL=https://dozgrffjwxdzixpfnica.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## Multi-Agent System

This repo is worked on by two Claude Code agents running in parallel.
See AGENTS.md for full rules, ownership boundaries and workflow.

### Agent Ownership
- agent/ui-components → components, styles, pages
- agent/map-backend   → hooks, stores, lib, api

### Shared File Contract
Shared files require an INTENT declaration before modification.
See AGENTS.md for the full INTENT protocol.

---

## Agent Log
> Both agents append session summaries here. Newest first.

---

## INTENT Blocks
> Active coordination declarations between agents. See AGENTS.md for protocol.

## INTENT — agent/implementer — 2026-04-23
File: src/components/Map.jsx
Change: Replace var(--color-accent) and var(--color-text) in MapLibre paint objects with static hex values #E8C96A and #E8EAF0
Affects: No functional change — purely resolves MapLibre parse errors. Architect approved.
Status: CLOSED — merged 2026-04-23 (commit 360a79e)

## INTENT — agent/implementer — 2026-04-24
File: CLAUDE.md
Change: Restructure into lean core file; move bug register, structure, roadmap, decisions to BRAIN/ directory
Affects: Both agents must now read BRAIN/BUGS.md and BRAIN/STRUCTURE.md at session start. Gemini scripts updated to inject BRAIN/ files.
Status: CLOSED — merged 2026-04-24 (commit d64dc93)

## INTENT — agent/implementer — 2026-04-24
File: AGENTS.md
Change: Add BRAIN/ files to shared files list and add CLAUDE.md maintenance rules section
Affects: Both agents must treat BRAIN/ files as shared files requiring INTENT declarations
Status: CLOSED — merged 2026-04-24 (commit d64dc93)

## INTENT — agent/implementer — 2026-04-24
File: .github/scripts/gemini-improve.js
Change: Add BRAIN/ROADMAP.md read and inject into Gemini prompt; reduce CLAUDE.md slice from 8000 to 4000 chars
Affects: Gemini improve runs will now include roadmap context
Status: CLOSED — merged 2026-04-24 (commit d64dc93)

## INTENT — agent/implementer — 2026-04-24
File: .github/scripts/gemini-analysis.js
Change: Add BRAIN/BUGS.md read and inject into Gemini prompt; reduce CLAUDE.md slice from 8000 to 4000 chars
Affects: Gemini analysis runs will now include full bug register
Status: CLOSED — merged 2026-04-24 (commit d64dc93)

## INTENT — agent/implementer — 2026-04-24
File: .github/scripts/gemini-audit.js
Change: Add BRAIN/BUGS.md read and inject into Gemini prompt; reduce CLAUDE.md slice from 8000 to 4000 chars
Affects: Gemini audit runs will now include full bug register for correlation
Status: CLOSED — merged 2026-04-24 (commit d64dc93)
