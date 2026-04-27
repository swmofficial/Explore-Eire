import fs from 'fs';

const streakFile = 'AGENT_REPORTS/failure-streak.json';
const passed = process.argv[2] === 'pass';

let streak = { count: 0, lastUpdated: null, history: [] };

try {
  streak = JSON.parse(fs.readFileSync(streakFile, 'utf8'));
} catch {}

if (passed) {
  streak.count = 0;
} else {
  streak.count += 1;
}

streak.lastUpdated = new Date().toISOString();
streak.history = [
  { date: streak.lastUpdated, result: passed ? 'pass' : 'fail' },
  ...(streak.history || [])
].slice(0, 20);

fs.writeFileSync(streakFile, JSON.stringify(streak, null, 2));
console.log(`Streak: ${streak.count} | Trigger audit at: 3`);
console.log(streak.count >= 3 ? 'TRIGGER_AUDIT' : 'OK');
