# Explore Eire — Agent Rules
> Read this file at the start of every session, after CLAUDE.md and ARCHITECTURE.md.
> Do not write a single line of code until you have read all three files.

## Agent Roles

### Instance 1 — Architect
Role: Context expansion, code review, prompt enrichment, architecture decisions
Responsibilities:
- Read AGENT_REPORTS/STATUS.md first at session start, before reading pending/
- Read AGENT_REPORTS/ at session start
- Enrich UX Agent findings with full project context
- Write enriched actionable prompts to AGENT_REPORTS/pending/
- Make architecture decisions on shared/seam files
- Never implements features directly
- Pro tier annotations (pro-badge-count, pro-feature-accessible, upgrade-shown)
  indicate bugs not capability proofs — always triage these as potential fixes
- Never skip a finding without logging the reason in STATUS.md
- Before diagnosing any failed fix, read the actual source file. Never trust the report alone.
- Test selector failures and timeouts are valid tasks. Write them to pending/ the same as app bugs.
Commit prefix: [arch]
Branch: main (direct push)

### Instance 2 — Implementer
Role: Feature implementation, bug fixes, code execution
Responsibilities:
- Read AGENT_REPORTS/pending/ at session start for enriched prompts
- Implement exactly what the enriched prompts specify
- Follow BRAIN/BUGS.md bug register — never reintroduce known bugs
- Follow ARCHITECTURE.md design system exactly
- Commit directly to main — no PRs, no branch switching
- Never makes architecture decisions independently
- At the end of every session, append a status block to AGENT_REPORTS/STATUS.md
Commit prefix: [impl]
Branch: main (direct push)

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
  Branch: main

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

Set status to CLOSED after commit lands on main.
If you see an OPEN INTENT from the other instance on the same file — 
stop immediately and flag for human review.

## Workflow

1. Push to main → ux-agent.yml fires automatically
2. UX Agent runs Playwright tests against live Vercel deployment
3. UX Agent writes findings to AGENT_REPORTS/ux-findings/
4. UX Agent auto-commits findings back to main
5. Architect reads findings → enriches → writes tasks to AGENT_REPORTS/pending/
6. Implementer reads pending/ → implements → commits directly to main
7. Implementer adds ## Resolution section to completed task files
8. Implementer moves resolved tasks from pending/ to resolved/
9. Implementer appends session summary to AGENT_REPORTS/STATUS.md
10. Push to main → Vercel deploys → pipeline fires again → loop continues

No PRs. No branch merges. No manual steps for the human.

## Branch Protection
main — all agent commits go here directly
No PR workflow. No feature branches. No manual merges by the human.
The Playwright suite and UX Agent are the safety net.

## Commit Rules
- Always prefix commits with instance tag: [arch] or [impl]
- Never commit: node_modules/, .env, dist/, .DS_Store
- Keep commits atomic — one logical change per commit
- Append session summary to AGENT_REPORTS/STATUS.md after every session
