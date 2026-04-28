// ux-agent.js — UX Agent for Explore Eire pipeline (three-tier edition).
//
// Reads STATE_MAP.md + ux-agent-context.md + Playwright results + tier-
// attributed screenshots. Sends a structured prompt to Gemini 2.5 Flash
// instructing it to analyse by account tier (guest / free / pro) and
// note where behaviour differs between tiers. Outputs findings to
// AGENT_REPORTS/ux-findings/.
//
// Compared to the previous version this script now:
//   - Looks for screenshots in test-results/<tier>/ directories first,
//     falling back to the raw test-results/ tree for backward compat.
//   - Tags each screenshot with its tier in the descriptions list so the
//     agent can group evidence by tier.
//   - Reads playwright-report.json and partitions test results by spec
//     filename (guest.spec.js / free.spec.js / pro.spec.js).
//   - Updates the prompt to require per-tier analysis and cross-tier
//     comparison.
//   - Caps total inline screenshots at 12 (up from 10) and tries to
//     include at least 3 per tier when the budget allows.

import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

const date = new Date().toISOString().split('T')[0];
const reportDir = 'AGENT_REPORTS';
const findingsDir = path.join(reportDir, 'ux-findings');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
if (!fs.existsSync(findingsDir)) fs.mkdirSync(findingsDir);

// ── Helpers ─────────────────────────────────────────────────────────

function readFileOr(filepath, fallback) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return fallback; }
}

function inferTierFromPath(filepath) {
  const lower = filepath.toLowerCase();
  if (lower.includes('/guest/') || lower.includes('guest-') || lower.includes('guest.spec')) return 'guest';
  if (lower.includes('/free/')  || lower.includes('free-')  || lower.includes('free.spec'))  return 'free';
  if (lower.includes('/pro/')   || lower.includes('pro-')   || lower.includes('pro.spec'))   return 'pro';
  return 'unknown';
}

// ── Load static inputs ──────────────────────────────────────────────

const stateMap   = readFileOr('BRAIN/STATE_MAP.md', 'STATE_MAP.md not found — architectural foresight unavailable.');
const uxContext  = readFileOr('BRAIN/agents/ux-agent-context.md', 'UX context not found — using general knowledge only.');

// Playwright JSON. Single report file written by the workflow's serial
// run. We partition test results by suite/spec downstream.
const playwrightResults = readFileOr('playwright-report.json', '{}');
const gitDiff = readFileOr('git-diff.txt', 'No git diff available.');
const gitLog  = readFileOr('git-log.txt', 'No commit log available.');

// Partition Playwright JSON results by spec file name. Fallback to the
// whole report if parsing fails.
let resultsByTier = { guest: [], free: [], pro: [], other: [] };
try {
  const pw = JSON.parse(playwrightResults);
  // Playwright JSON shape: { suites: [{ specs: [{ title, file, tests: [...] }] }] }
  function walkSuites(suites) {
    for (const s of suites || []) {
      for (const spec of s.specs || []) {
        const tier = inferTierFromPath(spec.file || s.title || '');
        const summary = {
          title: spec.title,
          file:  spec.file,
          ok:    spec.ok,
          tests: (spec.tests || []).map((t) => ({
            status:   t.status || (t.results?.[0]?.status),
            duration: t.results?.[0]?.duration,
            error:    t.results?.[0]?.error?.message?.slice(0, 800),
            annotations: (t.annotations || []).map((a) => ({ type: a.type, description: (a.description || '').slice(0, 500) })),
          })),
        };
        (resultsByTier[tier] || resultsByTier.other).push(summary);
      }
      walkSuites(s.suites || []);
    }
  }
  walkSuites(pw.suites);
} catch (e) {
  console.warn(`[ux-agent] failed to partition playwright-report.json: ${e.message}`);
}

// ── Load screenshots by tier ────────────────────────────────────────

const screenshotsByTier = { guest: [], free: [], pro: [], unknown: [] };
const screenshotDir = 'test-results';

if (fs.existsSync(screenshotDir)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(png|jpg|jpeg)$/i.test(entry.name)) continue;
      try {
        const data   = fs.readFileSync(full);
        const base64 = data.toString('base64');
        const mime   = entry.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const tier   = inferTierFromPath(full);
        const bucket = screenshotsByTier[tier] || screenshotsByTier.unknown;
        bucket.push({
          inlineData: { mimeType: mime, data: base64 },
          path: full,
        });
      } catch (e) {
        console.warn(`Could not read screenshot ${full}: ${e.message}`);
      }
    }
  };
  walk(screenshotDir);
}

console.log(
  `[ux-agent] screenshots — guest:${screenshotsByTier.guest.length} ` +
  `free:${screenshotsByTier.free.length} pro:${screenshotsByTier.pro.length} ` +
  `unknown:${screenshotsByTier.unknown.length}`,
);

// Build a balanced selection: aim for up to 4 per tier, total cap 12.
function selectBalanced(byTier, totalCap = 12, perTierCap = 4) {
  const tiers = ['guest', 'free', 'pro', 'unknown'];
  const out = [];
  // Round-robin until we hit the cap.
  let added = true;
  while (added && out.length < totalCap) {
    added = false;
    for (const t of tiers) {
      const taken = out.filter((s) => inferTierFromPath(s.path) === t).length;
      if (taken >= perTierCap) continue;
      const next = byTier[t][taken];
      if (next) { out.push(next); added = true; if (out.length >= totalCap) break; }
    }
  }
  return out;
}
const selectedScreenshots = selectBalanced(screenshotsByTier);
const screenshotDescriptions = selectedScreenshots.map((s) => `[${inferTierFromPath(s.path)}] ${s.path}`);

// ── Calibration data from resolved/ ─────────────────────────────────

const resolvedDir = path.join(reportDir, 'resolved');
const calibrationData = (() => {
  if (!fs.existsSync(resolvedDir)) return 'No resolved tasks yet — first run.';
  const files = fs.readdirSync(resolvedDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, 30);
  if (files.length === 0) return 'No resolved tasks yet — first run.';

  const entries = [];
  let confirmed = 0, phantom = 0, misdiagnosed = 0, superseded = 0;

  for (const file of files) {
    const content = readFileOr(path.join(resolvedDir, file), '');
    const titleMatch   = content.match(/^#\s+Task\s+\d+\s*—\s*(.+)$/m);
    const sourceMatch  = content.match(/^Source:\s*(.+)$/m);
    const verdictMatch = content.match(/^Verdict:\s*(CONFIRMED|PHANTOM|MISDIAGNOSED|SUPERSEDED)/m);
    const notesMatch   = content.match(/^Notes:\s*(.+)$/m);
    const title   = titleMatch ? titleMatch[1].trim() : file;
    const verdict = verdictMatch ? verdictMatch[1] : 'UNKNOWN';
    const notes   = notesMatch ? notesMatch[1].trim() : '';
    entries.push(`- "${title}" → ${verdict}${notes ? ': ' + notes : ''}`);
    if (verdict === 'CONFIRMED') confirmed++;
    else if (verdict === 'PHANTOM') phantom++;
    else if (verdict === 'MISDIAGNOSED') misdiagnosed++;
    else if (verdict === 'SUPERSEDED') superseded++;
  }

  const total = files.length;
  const accuracy = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const phantomRate = total > 0 ? Math.round((phantom / total) * 100) : 0;
  return `### Accuracy Stats (last ${total} resolved tasks)
Confirmed: ${confirmed} (${accuracy}%) | Phantom: ${phantom} (${phantomRate}%) | Misdiagnosed: ${misdiagnosed} | Superseded: ${superseded}

### Recent Verdicts
${entries.join('\n')}`;
})();

// ── Previous findings (last run only) ───────────────────────────────

const previousFindings = (() => {
  if (!fs.existsSync(findingsDir)) return 'No previous findings.';
  const files = fs.readdirSync(findingsDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .reverse();
  if (files.length === 0) return 'No previous findings.';
  return readFileOr(path.join(findingsDir, files[0]), 'Could not read previous findings.');
})();

// ── Build prompt ────────────────────────────────────────────────────

const trimmedPlaywright = playwrightResults.slice(0, 30000);
const trimmedStateMap   = stateMap.slice(0, 12000);
const trimmedUxContext  = uxContext.slice(0, 8000);
const trimmedPrev       = previousFindings.slice(0, 5000);

function tierResultSummary(label, rows) {
  if (!rows.length) return `### ${label}\nNo tests in this tier (suite may have skipped — check storageState files).`;
  const passed = rows.filter((r) => r.ok).length;
  const failed = rows.length - passed;
  const lines = rows.map((r) => {
    const t = r.tests[0] || {};
    const annot = (t.annotations || []).map((a) => `    ${a.type}: ${a.description}`).join('\n');
    return `- [${r.ok ? 'PASS' : 'FAIL'}] ${r.title}` +
           (t.error ? `\n    error: ${t.error.slice(0, 300)}` : '') +
           (annot ? `\n${annot}` : '');
  }).join('\n');
  return `### ${label} (${passed}/${rows.length} passed)\n${lines}`;
}

const tierResultsBlock = [
  tierResultSummary('Guest tier', resultsByTier.guest),
  tierResultSummary('Free tier',  resultsByTier.free),
  tierResultSummary('Pro tier',   resultsByTier.pro),
  resultsByTier.other.length ? tierResultSummary('Other', resultsByTier.other) : '',
].filter(Boolean).join('\n\n');

const screenshotNote = selectedScreenshots.length > 0
  ? `${selectedScreenshots.length} screenshots attached (balanced across tiers). File paths:\n${screenshotDescriptions.map((s) => `- ${s}`).join('\n')}`
  : 'No screenshots available in this run. All visual findings must be scored LOW confidence.';

const systemPrompt = `You are the UX Agent for Explore Eire, an outdoor mapping app for Ireland.
Your role: analyse test results, screenshots, and architecture to identify real
UX issues — not phantom errors. Be honest about what you can and cannot see.

### Three-Tier Analysis (NEW)

Tests run as three separate suites, one per account tier:
  - **guest** — unauthenticated, no Supabase session
  - **free**  — authenticated, no Stripe subscription
  - **pro**   — authenticated, active Stripe subscription

Findings MUST be tier-attributed where the difference matters. When you see
a behaviour that differs across tiers (e.g. PRO badges visible to free but
not to pro), call that out explicitly. When you see a behaviour that is the
same across all tiers (e.g. theme resets on reload regardless of auth), say
so — that itself is evidence about the root cause.

### Vulnerability-Proof Test Philosophy (NEW)

The test suite has been redesigned. Tests are no longer pass/fail smoke
checks. Each test is a **journey** that exercises a known vulnerability
(V1–V15 in STATE_MAP.md) or a capability (C1/F1/P1 etc.). A test passing
does NOT mean the vulnerability does not exist — it means the journey
completed and produced evidence. Read the test annotations and the
before/after screenshot pairs.

For example, the "free V13" test produces two Learn-tab screenshots and a
"state-loss-evidence" annotation containing before/after numeric stats.
Compare them yourself: if the after value differs from the before value
in a way STATE_MAP.md predicts, mark V13 CONFIRMED with HIGH confidence.

### Your Analysis Rules

1. NEVER guess. If you cannot confirm a finding in the code, state, or
   screenshots — score it LOW or PHANTOM.
2. Every finding MUST include:
   - Summary (one sentence)
   - Tier(s) affected: guest / free / pro / all
   - Confidence: HIGH / MEDIUM / LOW / PHANTOM
   - Evidence: what you can see (cite specific screenshot paths and/or
     annotation values)
   - Cannot confirm: what you would need to see to be certain
   - Root cause: the specific architectural reason (reference STATE_MAP.md)
   - User impact: what the real user experiences
   - Business impact: how this affects conversion, retention, or trust
   - Fix direction: one sentence pointing at the right solution layer
3. Trace every UX finding to its architectural cause.
4. Cross-reference every finding against the Known Vulnerability List in
   STATE_MAP.md. If your finding matches a known vulnerability, reference
   it (V1–V15). If a tier-attributed test journey produced direct evidence
   for that vulnerability, mark it HIGH confidence — that is the whole
   reason these tests exist.
5. Maximum 8 findings per run. Rank by user impact. Discard weakest with
   explanation.
6. Score confidence using:
   HIGH (80-100%): directly observable in screenshots or annotations
   MEDIUM (50-79%): inferred from architecture, not directly observed
   LOW (20-49%): speculative, multiple explanations possible
   PHANTOM (0-19%): cannot point to specific evidence — MUST be discarded

### State Map (architectural ground truth)

${trimmedStateMap}

### UX Knowledge Context

${trimmedUxContext}

### Calibration Data (your track record)

${calibrationData}`;

const userPrompt = `### Test Results By Tier

${tierResultsBlock}

### Raw Playwright JSON (for cross-checking)

\`\`\`json
${trimmedPlaywright}
\`\`\`

### Git Changes

\`\`\`
${gitDiff}
\`\`\`

### Commit Log

\`\`\`
${gitLog}
\`\`\`

### Screenshots

${screenshotNote}

### Previous Findings

${trimmedPrev}

---

Produce your UX Agent Report for ${date}. Follow the output format exactly:

# UX Agent Report — ${date}

## Run Context
- Commits analysed: [list]
- Screenshots available: YES/NO (count, breakdown by tier)
- Test pass rate: [per tier — guest X/Y, free X/Y, pro X/Y]
- Historical accuracy: [from calibration data, or "first run" if none]

## Findings
[Up to 8 findings, ranked by user impact. Each finding includes Tier(s) affected.]

## Tier Comparison
[Where behaviour differs between guest/free/pro for the same journey, list
the differences here. Where behaviour is identical across tiers, note that
too — it constrains the root cause.]

## Findings Discarded
[Any findings dropped, with reason. Include any findings suppressed because
they matched a previous PHANTOM verdict.]

## Cannot Assess
[Things missing for full analysis — e.g. "pro suite skipped because
.auth/pro.json missing".]

## Systemic Patterns
[Shared root causes across findings.]

## Calibration Notes
[What you learned from the resolved task history. Patterns avoided because
of past PHANTOM verdicts; patterns prioritised from past CONFIRMED verdicts.]`;

// ── Call Gemini ──────────────────────────────────────────────────────

const contentParts = [{ text: userPrompt }];
for (const sp of selectedScreenshots) {
  contentParts.push({ inlineData: sp.inlineData });
}

const requestBody = {
  systemInstruction: { parts: [{ text: systemPrompt }] },
  contents: [{ parts: contentParts }],
  generationConfig: {
    maxOutputTokens: 16384,
    temperature: 0.2,
  },
};

console.log('[ux-agent] calling Gemini …');
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  },
);
const rawBody = await response.text();
console.log(`[ux-agent] Gemini status: ${response.status}`);

if (!response.ok) {
  console.error(`[ux-agent] Gemini error: ${rawBody.slice(0, 1000)}`);
  const errorReport = `# UX Agent Report — ${date}\n\n## Error\nGemini API returned ${response.status}.\n\n\`\`\`\n${rawBody.slice(0, 2000)}\n\`\`\`\n`;
  fs.writeFileSync(path.join(findingsDir, `ux-findings-${date}.md`), errorReport);
  process.exit(1);
}

const data = JSON.parse(rawBody);
const report = data.candidates?.[0]?.content?.parts?.[0]?.text
  || '# UX Agent Report\n\nGemini returned no content.';

const outPath = path.join(findingsDir, `ux-findings-${date}.md`);
fs.writeFileSync(outPath, report);
console.log(`[ux-agent] report written to ${outPath}`);

const mainReportPath = path.join(reportDir, `report-${date}.md`);
fs.writeFileSync(mainReportPath, report);
console.log(`[ux-agent] also written to ${mainReportPath}`);
