import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set or empty');

const reportDir = 'AGENT_REPORTS';
const date = new Date().toISOString().split('T')[0];

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

const playwrightReport = fs.existsSync('playwright-report.json')
  ? fs.readFileSync('playwright-report.json', 'utf8')
  : 'No Playwright report found.';

const gitDiff = fs.existsSync('git-diff.txt')
  ? fs.readFileSync('git-diff.txt', 'utf8')
  : 'No git diff found.';

const claudeMd = fs.existsSync('CLAUDE.md')
  ? fs.readFileSync('CLAUDE.md', 'utf8').slice(0, 8000)
  : '';

const prompt = `You are a QA architect for Explore Eire, an Irish outdoor app built in React + Vite + MapLibre + Supabase.

You have been given:
1. Playwright test results and screenshots
2. Recent git diff (last 5 commits)
3. Project memory excerpt (CLAUDE.md)

Your job:
- Identify UX bugs and regressions correlated to recent commits
- Flag visual issues, broken interactions, mobile viewport problems
- Output structured actionable prompts that a Claude Code agent can action directly

Format your response as:

## UX Report — ${date}

### Summary
[2-3 sentence overview]

### Findings
[numbered list of issues, each with: description, likely cause from git diff, severity: low/medium/high]

### Actionable Prompts for Agents
[numbered list of ready-to-use prompts, prefixed with [ui] or [map] for routing]

### Flagged for Human Review
[anything that needs a human decision]

---

GIT DIFF:
${gitDiff}

PLAYWRIGHT RESULTS:
${playwrightReport.slice(0, 6000)}

PROJECT MEMORY:
${claudeMd}`;

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  }
);

const rawBody = await response.text();
console.log(`Gemini API status: ${response.status}`);
console.log(`Gemini API response body: ${rawBody}`);

if (!response.ok) {
  throw new Error(`Gemini API error ${response.status}: ${rawBody}`);
}

const data = JSON.parse(rawBody);
const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Gemini returned no response.';

const outPath = path.join(reportDir, `report-${date}.md`);
fs.writeFileSync(outPath, text);
console.log(`Report written to ${outPath}`);
