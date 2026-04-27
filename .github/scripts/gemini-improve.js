import fs from 'fs';
import path from 'path';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is not set or empty');

const reportDir = 'AGENT_REPORTS/improvements';
const date = new Date().toISOString().split('T')[0];

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

const playwrightReport = fs.existsSync('improvement-report.json')
  ? fs.readFileSync('improvement-report.json', 'utf8')
  : 'No Playwright report found.';

const gitDiff = fs.existsSync('git-diff.txt')
  ? fs.readFileSync('git-diff.txt', 'utf8')
  : 'No git diff found.';

const commitLog = fs.existsSync('git-log.txt')
  ? fs.readFileSync('git-log.txt', 'utf8')
  : 'No commit log found.';

const claudeMd = fs.existsSync('CLAUDE.md')
  ? fs.readFileSync('CLAUDE.md', 'utf8').slice(0, 4000)
  : '';

const roadmap = fs.existsSync('BRAIN/ROADMAP.md')
  ? fs.readFileSync('BRAIN/ROADMAP.md', 'utf8').slice(0, 4000)
  : '';

const prompt = `You are a product strategist and UX consultant for Explore Eire, an Irish outdoor app built in React + Vite + MapLibre + Supabase. The app targets Irish outdoor enthusiasts with modules for gold prospecting, hiking, field sports, archaeology, and coastal exploration. Business model: free tier → Explorer €9.99/month → Annual €79/year.

You have been given:
1. Playwright test results from the full audit suite
2. Recent git history (last 10 commits summary, last 50 log entries)
3. Project memory excerpt (CLAUDE.md)

Your job is NOT to find bugs — it is to identify product improvement opportunities that would increase user retention, conversion, and engagement.

Format your response as:

## Improvement Report — ${date}

### Summary
[2-3 sentence strategic overview of the app's current state and biggest opportunity]

### UX Improvements
[numbered list: friction points, confusing flows, missing affordances — each with: observation, suggested fix, effort: low/medium/high]

### Performance Opportunities
[numbered list: slow loads, large bundles, map render bottlenecks — each with: observation, suggested approach, impact: low/medium/high]

### Feature Gaps
[numbered list: features users would expect that are missing — each with: gap description, competitive context, priority: low/medium/high]

### Mobile Experience
[numbered list: mobile-specific issues or enhancements — viewport, touch targets, gestures, native feel]

### Quick Wins
[numbered list of ≤3 changes that could ship in a single session and have outsized impact]

### Strategic Recommendations
[2-3 longer-term product directions, each 2-4 sentences]

---

GIT HISTORY (last 10 commits summary):
${gitDiff}

COMMIT LOG (last 50):
${commitLog}

PLAYWRIGHT RESULTS:
${playwrightReport.slice(0, 20000)}

PROJECT MEMORY (design system + infrastructure):
${claudeMd}

PRODUCT ROADMAP & VISION:
${roadmap}`;

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

const outPath = path.join(reportDir, `improvement-${date}.md`);
fs.writeFileSync(outPath, text);
console.log(`Improvement report written to ${outPath}`);
