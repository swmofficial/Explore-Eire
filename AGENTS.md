# Explore Eire — Agent Rules
> Read this file at the start of every session, after CLAUDE.md and ARCHITECTURE.md.

## Agent Roles

### agent/ui-components
Owns: src/components/, src/styles/, src/pages/, index.html
Commit prefix: [ui]

### agent/map-backend
Owns: src/hooks/, src/lib/, src/store/, api/, scripts/, public/sw.js
Commit prefix: [map]

## Shared Files — Require INTENT Declaration
These files are read by both agents. Neither agent may modify them without first
declaring an INTENT block in CLAUDE.md:

  App.jsx
  src/store/mapStore.js
  src/store/moduleStore.js
  src/store/userStore.js
  src/lib/supabase.js
  src/lib/mapConfig.js
  src/styles/global.css
  vite.config.js
  package.json

## INTENT Protocol

Before modifying any shared file, append this block to CLAUDE.md:

  ## INTENT — [agent-name] — [YYYY-MM-DD]
  File: [filename]
  Change: [one sentence]
  Affects: [what the other agent needs to know]
  Status: OPEN

After your PR merges, update Status to CLOSED.
If you see an OPEN INTENT from the other agent on the same file — stop immediately
and leave a comment on the PR flagging the conflict for human review.

## Workflow Rules

1. Always pull from dev before starting a new session
2. Work only on your own branch — never commit to dev or main directly
3. Before pushing, pull dev and merge into your branch locally, resolve conflicts
4. Open a PR from your branch into dev when work is complete
5. main is protected — only humans merge dev into main via PR
6. Prefix every commit with your agent tag: [ui] or [map]
7. Write a session summary to CLAUDE.md under ## Agent Log after every session
8. Never commit: node_modules/, .env, dist/, .DS_Store
9. Never modify CLAUDE.md structural sections — only append to ## Agent Log and ## INTENT blocks
10. Read the full bug register in CLAUDE.md before every session — 44 known bugs, do not reintroduce them

## Branch Protection (human sets this in GitHub UI)
  main — require PR, require 1 review, no direct push
  dev  — require PR, no direct push

## UX Testing Pipeline
On every push to dev, GitHub Actions will:
  1. Trigger Vercel preview deploy
  2. Run Playwright against the preview URL
  3. Send screenshots + logs + git diff to Gemini 2.5 Pro for analysis
  4. Write findings + actionable prompts to AGENT_REPORTS/ directory
  5. Agents read AGENT_REPORTS/ at session start and action flagged items
