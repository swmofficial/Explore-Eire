# Explore Eire — Agent Rules
> Read this file at the start of every session, after CLAUDE.md and ARCHITECTURE.md.
> Do not write a single line of code until you have read all three files.

## Agent Roles

### Instance 1 — Architect (agent/architect branch)
Role: Context expansion, code review, prompt enrichment, architecture decisions
Responsibilities:
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
Commit prefix: [impl]
Branch: agent/implementer

## AGENT_REPORTS Structure
AGENT_REPORTS/
├── report-YYYY-MM-DD.md          ← raw Gemini/UX Agent reports (auto-written by pipeline)
├── ux-findings/                  ← UX Agent structured findings (auto-written)
│   └── ux-findings-YYYY-MM-DD.md
├── pending/                      ← enriched prompts ready for Instance 2 to action
│   └── task-YYYY-MM-DD-NNN.md
└── resolved/                     ← completed tasks with resolution verdict
    └── task-YYYY-MM-DD-NNN.md    ← moved here from pending/ after resolution

## Pending Task File Format
Each file in AGENT_REPORTS/pending/ follows this structure:

  # Task [NNN] — [short title]
  Date: YYYY-MM-DD
  Status: PENDING | IN_PROGRESS | DONE
  Source: [Gemini report filename or human or ux-findings-YYYY-MM-DD.md]
  Branch: agent/implementer

  ## Context
  [Full project context Instance 1 has added]

  ## Task
  [Exact implementation instructions]

  ## Constraints
  [Relevant bug register rules, design system rules, file ownership rules]

  ## Definition of Done
  [How Instance 2 knows the task is complete]

## Task Resolution — Closing The Feedback Loop

When a task is DONE, the Implementer MUST add a Resolution section before
the task file is moved from pending/ to resolved/:

  ## Resolution
  Verdict: CONFIRMED | MISDIAGNOSED | PHANTOM | SUPERSEDED
  Commit: [commit hash of fix, or N/A if phantom]
  Notes: [one sentence explanation]

Verdict definitions:
- CONFIRMED — the finding was real, the root cause was correct, the fix worked
- MISDIAGNOSED — the finding was real but the root cause was wrong (state actual cause)
- PHANTOM — the issue does not exist in the app (state why the agent was wrong)
- SUPERSEDED — made obsolete by a different change (reference the superseding task/commit)

After adding the Resolution section:
1. Move the file from pending/ to resolved/
2. The UX Agent reads resolved/ on every run and uses verdicts as calibration data
3. PHANTOM verdicts teach the agent what patterns to stop flagging
4. CONFIRMED verdicts teach the agent what patterns to prioritise

This feedback loop is mandatory. Without it the UX Agent cannot improve.
Skipping resolution = the agent keeps producing the same phantoms forever.

### Resolution Examples

  ## Resolution
  Verdict: CONFIRMED
  Commit: 360a79e
  Notes: CSS variables in MapLibre paint objects replaced with static hex — console errors resolved.

  ## Resolution
  Verdict: PHANTOM
  Commit: N/A
  Notes: BottomNav haptic feedback was already working. Agent inferred regression from file change but haptics.js was untouched.

  ## Resolution
  Verdict: MISDIAGNOSED
  Commit: abc1234
  Notes: Issue was real (map layers disappeared) but root cause was basemap switch not calling addDataLayers, not the CSS variable change the agent blamed.

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

1. Pipeline runs on every push to dev → UX Agent writes to AGENT_REPORTS/ux-findings/
2. Instance 1 reads UX Agent findings → enriches → writes to AGENT_REPORTS/pending/
3. Instance 2 reads pending/ → implements → commits to agent/implementer
4. Instance 2 adds ## Resolution section to the task file
5. Instance 2 moves resolved tasks from pending/ to resolved/
6. Instance 2 opens PR to dev
7. Instance 1 reviews PR against bug register + design system
8. Human approves and merges to dev
9. dev auto-deploys to Vercel preview
10. Pipeline runs again → UX Agent reads resolved/ for calibration → loop continues

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
