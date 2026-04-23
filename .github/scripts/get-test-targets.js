import { execSync } from 'child_process';
import fs from 'fs';

const diff = execSync('git diff HEAD~1 --name-only').toString().trim().split('\n');

const map = [
  // Planned specs (not yet created — map to app.spec.js until built):
  // mobile.spec.js, map.spec.js, sheets.spec.js, dashboard.spec.js,
  // module.spec.js, settings.spec.js, learn.spec.js, paywall.spec.js
  { patterns: ['src/components/BottomNav', 'src/App', 'src/main', 'src/styles/global.css'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Auth', 'src/hooks/useAuth', 'src/lib/supabase'], specs: ['auth.spec.js'] },
  { patterns: ['src/components/Map', 'src/lib/mapConfig', 'src/lib/layerCategories', 'src/hooks/useGold', 'src/hooks/useMineralLocalities'], specs: ['app.spec.js'] },
  { patterns: ['src/components/DataSheet', 'src/components/SampleSheet', 'src/components/MineralSheet', 'src/components/FindSheet'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Dashboard', 'src/store/moduleStore'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Module', 'src/store/moduleStore'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Settings', 'src/components/Legal'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Learn', 'src/hooks/useLearn'], specs: ['app.spec.js'] },
  { patterns: ['src/components/Upgrade', 'src/hooks/useSubscription', 'src/hooks/useUserTier'], specs: ['app.spec.js'] },
  { patterns: ['src/store/mapStore', 'src/store/userStore'], specs: ['app.spec.js', 'auth.spec.js'] },
];

const targets = new Set();

for (const file of diff) {
  for (const entry of map) {
    if (entry.patterns.some(p => file.includes(p))) {
      entry.specs.forEach(s => targets.add(s));
    }
  }
}

if (targets.size === 0) {
  console.log('app.spec.js');
} else {
  console.log([...targets].join('\n'));
}

fs.writeFileSync('test-targets.txt', [...targets].join('\n') || 'app.spec.js');
