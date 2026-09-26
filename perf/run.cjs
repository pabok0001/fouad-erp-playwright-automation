// Runs k6 with values from .env passed as -e vars (k6 doesn't read .env itself).
// Usage: node perf/run.cjs <script.ts> [extra k6 args...]
require('dotenv').config({ quiet: true });
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [script, ...extra] = process.argv.slice(2);
if (!script) {
  console.error('usage: node perf/run.cjs <script.ts> [k6 args]');
  process.exit(2);
}

// k6 may not be on PATH in terminals opened before it was installed.
const candidates = ['C:/Program Files/k6/k6.exe', '/usr/local/bin/k6', '/opt/homebrew/bin/k6'];
const k6 = candidates.find((p) => fs.existsSync(p)) || 'k6';

const vars = ['API_BASE_URL', 'API_VERSION', 'APP_USER', 'APP_PASSWORD'].flatMap((k) =>
  process.env[k] ? ['-e', `${k}=${process.env[k]}`] : [],
);
const name = path.basename(script, path.extname(script));
fs.mkdirSync('perf/results', { recursive: true });
const summary = ['--summary-export', `perf/results/${name}-summary.json`];

const r = spawnSync(k6, ['run', ...vars, ...summary, ...extra, script], { stdio: 'inherit' });
if (r.error) {
  console.error(`Could not start k6 (${r.error.message}). Install: winget install GrafanaLabs.k6`);
  process.exit(1);
}
process.exit(r.status ?? 1);
