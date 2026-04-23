import { execSync } from 'child_process';
import fs from 'fs';

const diff = execSync('git diff HEAD~1 --name-only').toString().trim().split('\n');

const map = [
  { patterns: ['src/components/BottomNav', 'src/App', 'src/main', 'src/styles/global.css'], specs: ['app.spec.js', 'mobile.spec.js'] },
  { patterns: ['src/components/Auth', 'src/hooks/useAuth', 'src/lib/supabase'], specs: ['auth.spec.js'] },
  { patterns: ['src/components/Map', 'src/lib/mapConfig', 'src/lib/layerCategories', 'src/hooks/useGold', 'src/hooks/useMineralLocalities'], specs: ['map.spec.js'] },
  { patterns: ['src/components/DataSheet', 'src/components/SampleSheet', 'src/components/MineralSheet', 'src/components/FindSheet'], specs: ['sheets.spec.js'] },
  { patterns: ['src/components/Dashboard', 'src/store/moduleStore'], specs: ['dashboard.spec.js', 'module.spec.js'] },
  { patterns: ['src/components/Module'], specs: ['module.spec.js'] },
  { patterns: ['src/components/Settings', 'src/components/Legal'], specs: ['settings.spec.js'] },
  { patterns: ['src/components/Learn', 'src/hooks/useLearn'], specs: ['learn.spec.js'] },
  { patterns: ['src/components/Upgrade', 'src/hooks/useSubscription', 'src/hooks/useUserTier'], specs: ['paywall.spec.js'] },
  { patterns: ['src/store/mapStore', 'src/store/userStore'], specs: ['map.spec.js', 'sheets.spec.js', 'auth.spec.js'] },
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
