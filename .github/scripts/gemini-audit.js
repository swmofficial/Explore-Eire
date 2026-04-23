import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set or empty');

const auditDir = 'AGENT_REPORTS/audits';
const date = new Date().toISOString().split('T')[0];

if (!fs.existsSync(auditDir)) fs.mkdirSync(auditDir, { recursive: true });

const auditReport = fs.existsSync('audit-report.json')
  ? fs.readFileSync('audit-report.json', 'utf8')
  : 'No audit report found.';

const gitDiff = fs.existsSync('git-diff.txt')
  ? fs.readFileSync('git-diff.txt', 'utf8')
  : 'No git diff found.';

const commitLog = fs.existsSync('git-log.txt')
  ? fs.readFileSync('git-log.txt', 'utf8')
  : 'No commit log found.';

const claudeMd = fs.existsSync('CLAUDE.md')
  ? fs.readFileSync('CLAUDE.md', 'utf8').slice(0, 8000)
  : '';

const auditSpecDir = 'tests/audit';
let specContents = '';
if (fs.existsSync(auditSpecDir)) {
  const specFiles = fs.readdirSync(auditSpecDir).filter(f => f.endsWith('.spec.js'));
  for (const f of specFiles) {
    specContents += `\n--- ${f} ---\n`;
    specContents += fs.readFileSync(path.join(auditSpecDir, f), 'utf8');
  }
}

const prompt = `You are a senior QA architect conducting a FULL COMPREHENSIVE AUDIT of Explore Eire — an Irish outdoor platform. This is not a smoke test. Every feature has been tested. Your job is to:

1. Identify ALL failures, regressions, and UX issues
2. Classify each as: Critical / Medium / Low
   Critical = blocks users from core functionality
   Medium = degrades experience but workaround exists
   Low = cosmetic or minor issue
3. Correlate failures to specific commits where possible
4. Output actionable prompts for each issue prefixed [ui] or [map]
5. List everything flagged for human review

Format:
## Audit Report — ${date}
### Critical Failures (blocks PR to main)
### Medium Issues (warn, human decides)
### Low Issues (log only)
### Actionable Prompts
### Human Review Required

---

GIT DIFF:
${gitDiff}

COMMIT LOG (last 20):
${commitLog}

AUDIT SPEC FILES (what was tested):
${specContents.slice(0, 15000)}

AUDIT RESULTS:
${auditReport.slice(0, 20000)}

PROJECT MEMORY:
${claudeMd}`;

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

const latestPath = path.join(auditDir, 'latest-audit.md');
const datedPath = path.join(auditDir, `audit-${date}.md`);
fs.writeFileSync(latestPath, text);
fs.writeFileSync(datedPath, text);
console.log(`Audit written to ${latestPath} and ${datedPath}`);
