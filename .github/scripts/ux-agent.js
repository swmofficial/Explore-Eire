// ux-agent.js — UX Agent for Explore Eire pipeline.
// Reads STATE_MAP.md + ux-agent-context.md + test results + screenshots.
// Sends structured prompt to Gemini. Outputs findings to AGENT_REPORTS/.
// Replaces the generic gemini-analysis.js with domain-specific UX reasoning.
import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

const date = new Date().toISOString().split('T')[0];
const reportDir = 'AGENT_REPORTS';
const findingsDir = path.join(reportDir, 'ux-findings');

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
if (!fs.existsSync(findingsDir)) fs.mkdirSync(findingsDir);

// ── Load inputs ──────────────────────────────────────────────────────

function readFileOr(filepath, fallback) {
  try { return fs.readFileSync(filepath, 'utf8'); } catch { return fallback; }
}

const stateMap = readFileOr('BRAIN/STATE_MAP.md', 'STATE_MAP.md not found — architectural foresight unavailable.');
const uxContext = readFileOr('BRAIN/agents/ux-agent-context.md', 'UX context not found — using general knowledge only.');
const promptTemplate = readFileOr('BRAIN/agents/ux-agent-prompt.md', null);

const playwrightResults = readFileOr('playwright-report.json', '{}');
const gitDiff = readFileOr('git-diff.txt', 'No git diff available.');
const gitLog = readFileOr('git-log.txt', 'No commit log available.');

// ── Load screenshots ────────────────────────────────────────────────
// Playwright screenshots are stored in test-results/ as PNG files.
// We encode them as base64 for Gemini's vision capability.

const screenshotDir = 'test-results';
const screenshotParts = [];
const screenshotDescriptions = [];

if (fs.existsSync(screenshotDir)) {
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (/\.(png|jpg|jpeg)$/i.test(entry.name)) {
        try {
          const data = fs.readFileSync(full);
          const base64 = data.toString('base64');
          const mimeType = entry.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
          screenshotParts.push({
            inlineData: { mimeType, data: base64 }
          });
          screenshotDescriptions.push(full);
        } catch (e) {
          console.warn(`Could not read screenshot ${full}: ${e.message}`);
        }
      }
    }
  };
  walk(screenshotDir);
}

console.log(`Found ${screenshotParts.length} screenshots.`);

// ── Load previous findings ──────────────────────────────────────────

const previousFindings = (() => {
  if (!fs.existsSync(findingsDir)) return 'No previous findings.';
  const files = fs.readdirSync(findingsDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();
  if (files.length === 0) return 'No previous findings.';
  return readFileOr(path.join(findingsDir, files[0]), 'Could not read previous findings.');
})();

// ── Load resolved tasks (calibration data) ──────────────────────────
// Resolved tasks contain a Verdict (CONFIRMED / PHANTOM / MISDIAGNOSED / SUPERSEDED).
// This teaches the agent which of its past findings were real vs. wrong.
// The agent uses this to calibrate: stop repeating phantom patterns, prioritise confirmed patterns.

const resolvedDir = path.join(reportDir, 'resolved');
const calibrationData = (() => {
  if (!fs.existsSync(resolvedDir)) return 'No resolved tasks yet — first run.';

  const files = fs.readdirSync(resolvedDir)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse()
    .slice(0, 30); // last 30 resolved tasks

  if (files.length === 0) return 'No resolved tasks yet — first run.';

  const entries = [];
  let confirmed = 0, phantom = 0, misdiagnosed = 0, superseded = 0;

  for (const file of files) {
    const content = readFileOr(path.join(resolvedDir, file), '');

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+Task\s+\d+\s*—\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : file;

    // Extract source (which agent report generated this task)
    const sourceMatch = content.match(/^Source:\s*(.+)$/m);
    const source = sourceMatch ? sourceMatch[1].trim() : 'unknown';

    // Extract verdict
    const verdictMatch = content.match(/^Verdict:\s*(CONFIRMED|PHANTOM|MISDIAGNOSED|SUPERSEDED)/m);
    const verdict = verdictMatch ? verdictMatch[1] : 'UNKNOWN';

    // Extract resolution notes
    const notesMatch = content.match(/^Notes:\s*(.+)$/m);
    const notes = notesMatch ? notesMatch[1].trim() : '';

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

console.log('Calibration data loaded.');


// ── Build prompt ────────────────────────────────────────────────────

const screenshotNote = screenshotParts.length > 0
  ? `${screenshotParts.length} screenshots attached. File paths:\n${screenshotDescriptions.map(s => `- ${s}`).join('\n')}`
  : 'No screenshots available in this run. All visual findings must be scored LOW confidence.';

// Trim large inputs to stay within context limits
const trimmedPlaywright = playwrightResults.slice(0, 30000);
const trimmedStateMap = stateMap.slice(0, 15000);
const trimmedUxContext = uxContext.slice(0, 8000);
const trimmedPreviousFindings = previousFindings.slice(0, 5000);

const systemPrompt = `You are the UX Agent for Explore Eire, an outdoor mapping app for Ireland.
Your role: analyse test results, screenshots, and architecture to identify real
UX issues — not phantom errors. You must be honest about what you can and cannot see.

### Your Analysis Rules

1. NEVER guess. If you cannot confirm a finding in the code, state, or screenshots —
   say so explicitly and score it LOW or PHANTOM.

2. Every finding MUST include:
   - Summary (one sentence)
   - Confidence: HIGH / MEDIUM / LOW / PHANTOM
   - Evidence: what you can see that supports this finding
   - Cannot confirm: what you would need to see to be certain
   - Root cause: the specific architectural reason (reference STATE_MAP.md)
   - User impact: what the real user experiences
   - Business impact: how this affects conversion, retention, or trust
   - Fix direction: one sentence pointing at the right solution layer

3. Trace every UX finding to its architectural cause.

4. Think in user journeys, not isolated screens. Test:
   - open → interact → navigate away → return → continue
   - open → interact → lose signal → interact → regain signal
   - open → interact → app killed by OS → reopen

5. Cross-reference every finding against the Known Vulnerability List in STATE_MAP.md.
   If your finding matches a known vulnerability, reference it by number (V1-V15).

6. Explicitly state what you CANNOT see and why.

7. Maximum 8 findings per run. Rank by user impact. Discard weakest with explanation.

8. Score confidence using:
   HIGH (80-100%): directly observable in code or screenshot
   MEDIUM (50-79%): inferred from architecture, not confirmed visually  
   LOW (20-49%): speculative, multiple explanations possible
   PHANTOM (0-19%): cannot point to specific evidence — MUST be discarded

### State Map (architectural ground truth)

${trimmedStateMap}

### UX Knowledge Context

${trimmedUxContext}

### Calibration Data (your track record)

This section shows how your past findings were resolved by human review.
Study it carefully:
- If a pattern was previously PHANTOM, do NOT flag it again unless you have new concrete evidence.
- If a pattern was previously CONFIRMED, prioritise similar patterns — they represent real issues.
- If a pattern was MISDIAGNOSED, look more carefully at root causes — your reasoning was close but wrong.
- Your goal: drive the CONFIRMED rate above 70% and the PHANTOM rate below 15%.

${calibrationData}`;

const userPrompt = `### Test Results

\`\`\`json
${trimmedPlaywright}
\`\`\`

### Git Changes (recent)

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

${trimmedPreviousFindings}

---

Produce your UX Agent Report for ${date}. Follow the output format exactly:

# UX Agent Report — ${date}

## Run Context
- Commits analysed: [list]
- Screenshots available: YES/NO (count)
- Test pass rate: X/Y
- Historical accuracy: [from calibration data, or "first run" if none]

## Findings
[Up to 8 findings, ranked by user impact, each with all required fields]

## Findings Discarded
[Any findings dropped, with reason. Include any findings suppressed because they matched a previous PHANTOM verdict.]

## Cannot Assess
[Things missing for full analysis]

## Systemic Patterns
[Shared root causes across findings]

## Calibration Notes
[What you learned from the resolved task history. Which patterns you avoided because they were previously PHANTOM. Which confirmed patterns you prioritised.]`;

// ── Call Gemini ──────────────────────────────────────────────────────

// Build content parts: text prompt + screenshots (if any)
const contentParts = [{ text: userPrompt }];
// Add screenshots as inline images for Gemini vision
for (const sp of screenshotParts.slice(0, 10)) { // max 10 screenshots to stay in limits
  contentParts.push(sp);
}

const requestBody = {
  systemInstruction: { parts: [{ text: systemPrompt }] },
  contents: [{ parts: contentParts }],
  generationConfig: {
    maxOutputTokens: 4096,
    temperature: 0.2, // low temperature for analytical precision
  }
};

console.log('Calling Gemini UX Agent...');

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  }
);

const rawBody = await response.text();
console.log(`Gemini API status: ${response.status}`);

if (!response.ok) {
  console.error(`Gemini API error: ${rawBody}`);
  // Write error report instead of crashing
  const errorReport = `# UX Agent Report — ${date}\n\n## Error\nGemini API returned ${response.status}.\n\n\`\`\`\n${rawBody.slice(0, 2000)}\n\`\`\`\n`;
  fs.writeFileSync(path.join(findingsDir, `ux-findings-${date}.md`), errorReport);
  process.exit(1);
}

const data = JSON.parse(rawBody);
const report = data.candidates?.[0]?.content?.parts?.[0]?.text
  || '# UX Agent Report\n\nGemini returned no content.';

// ── Write output ────────────────────────────────────────────────────

const outPath = path.join(findingsDir, `ux-findings-${date}.md`);
fs.writeFileSync(outPath, report);
console.log(`UX Agent report written to ${outPath}`);

// Also write to the main report location for backward compatibility
const mainReportPath = path.join(reportDir, `report-${date}.md`);
fs.writeFileSync(mainReportPath, report);
console.log(`Also written to ${mainReportPath}`);
