# Implementer — Session Instructions
Read this file first. Then read CLAUDE.md, ARCHITECTURE.md, BRAIN/BUGS.md, and AGENTS.md before touching any code.

## Session Start — Every Time
1. Run `ls AGENT_REPORTS/pending/` to list all pending task files
2. Read every file in AGENT_REPORTS/pending/ before implementing anything
3. Order tasks by task number ascending
4. Implement all tasks — do not stop after one

## Implementation Rules
- Implement exactly what each task file specifies — no more, no less
- Never make architecture decisions independently
- Follow BRAIN/BUGS.md — never reintroduce a known bug
- Follow ARCHITECTURE.md design system exactly
- Only modify shared files (App.jsx, stores, etc.) if the task explicitly requires it and an INTENT block exists in CLAUDE.md
- Commit directly to main — no PRs, no branch switching
- One commit per task, prefixed with [impl]

## Session End — Every Task
When a task is complete:
1. Add a ## Resolution section to the task file (Verdict, Commit hash, Notes)
2. Move the file from AGENT_REPORTS/pending/ to AGENT_REPORTS/resolved/
3. Append a summary block to AGENT_REPORTS/STATUS.md

## Resolution Verdicts
- CONFIRMED — finding was real, fix worked
- MISDIAGNOSED — finding was real but root cause was wrong
- PHANTOM — issue does not exist in the app
- SUPERSEDED — made obsolete by another change
