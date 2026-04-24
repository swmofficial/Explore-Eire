# Explore Eire — Agent Rules
> Read this file at the start of every session, after CLAUDE.md and ARCHITECTURE.md.
> Do not write a single line of code until you have read all three files.

## Agent Roles

### Instance 1 — Architect (agent/architect branch)
Role: Context expansion, code review, prompt enrichment, architecture decisions
Responsibilities:
- Read AGENT_REPORTS/STATUS.md first at session start, before reading pending/
- Read AGENT_REPORTS/ at session start
- Enrich Gemini reports with full project context
- Fill gaps in Gemini prompts using CLAUDE.md + ARCHITECTURE.md knowledge
- Review Instance 2 PRs before merge — check against bug register
- Write enriched actionable prompts back to AGENT_REPORTS/pending/
- Make architecture decisions on shared/seam files
- Never implements features directly
Commit prefix: [arch]
Branch: agent/architect

### Instance 2 — Implementer (agent/implementer branch)
Role: Feature implementation, bug fixes, code execution
Responsibilities:
- Read AGENT_REPORTS/pending/ at session start for enriched prompts
- Implement exactly what the enriched prompts specify
- Follow CLAUDE.md bug register — never reintroduce known bugs
- Follow ARCHITECTURE.md design system exactly
- Commit to own branch, open PR to dev when done
- Never makes architecture decisions independently
- At the end of every session, append a status block to AGENT_REPORTS/STATUS.md
  using the format defined in that file
Commit prefix: [impl]
Branch: agent/implementer

## AGENT_REPORTS Structure
AGENT_REPORTS/
├── report-YYYY-MM-DD.md          ← raw Gemini reports (auto-written by pipeline)
└── pending/                      ← enriched prompts ready for Instance 2 to action
    └── task-YYYY-MM-DD-NNN.md    ← one file per task

## Pending Task File Format
Each file in AGENT_REPORTS/pending/ follows this structure:

  # Task [NNN] — [short title]
  Date: YYYY-MM-DD
  Status: PENDING | IN_PROGRESS | DONE
  Source: [Gemini report filename or human]
  Branch: agent/implementer

  ## Context
  [Full project context Instance 1 has added]

  ## Task
  [Exact implementation instructions]

  ## Constraints
  [Relevant bug register rules, design system rules, file ownership rules]

  ## Definition of Done
  [How Instance 2 knows the task is complete]

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
  CLAUDE.md
  AGENTS.md

## INTENT Protocol
Before modifying any shared file, append this block to CLAUDE.md:

  ## INTENT — [instance-name] — [YYYY-MM-DD]
  File: [filename]
  Change: [one sentence]
  Affects: [what the other instance needs to know]
  Status: OPEN

Set status to CLOSED after PR merges.
If you see an OPEN INTENT from the other instance on the same file — 
stop immediately and flag for human review.

## Workflow

1. Pipeline runs on every push to dev → Gemini writes to AGENT_REPORTS/
2. Instance 1 reads STATUS.md → reads raw reports → enriches → writes to AGENT_REPORTS/pending/
3. Instance 2 reads pending/ → implements → commits to agent/implementer
4. Instance 2 opens PR to dev
5. Instance 1 reviews PR against bug register + design system
6. Human approves and merges to dev
7. dev auto-deploys to Vercel preview
8. Pipeline runs again → loop continues

## Branch Protection
main  — human PR only, no direct push ever
dev   — human PR only, no direct push ever
agent/architect    — Instance 1 only
agent/implementer  — Instance 2 only

## Commit Rules
- Always prefix commits with instance tag: [arch] or [impl]
- Never commit: node_modules/, .env, dist/, .DS_Store
- Keep commits atomic — one logical change per commit
- Write session summary to CLAUDE.md under ## Agent Log after every session
