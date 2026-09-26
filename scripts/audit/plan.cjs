// Step A: read every "Initialized" row from the audit (as admin, read-only) and
// build the entry plan: which user enters which row, and the physical quantity.
// Usage: node scripts/audit/plan.cjs
const fs = require('fs');
const L = require('./lib.cjs');

/** Deterministic pseudo-random in [0,1) from a string (stable across re-runs). */
function rand(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

/** Realistic count: ~40% equal, ~30% over, ~30% under; small, proportional differences. */
function targetQty(soft, seed) {
  const r = rand(seed);
  const r2 = rand(seed + '#d');
  // Small stocks: differ by 1–2 units; larger: 1–8 %.
  const delta =
    soft <= 20 ? 1 + Math.floor(r2 * 2) : Math.max(1, Math.round(soft * (0.01 + r2 * 0.07)));
  if (r < 0.4 || (soft === 0 && r < 0.7)) return { phys: soft, kind: 'equal' };
  if (r < 0.7 || soft === 0) return { phys: soft + delta, kind: 'higher' };
  // Only a single-unit stock may count down to 0 (item missing); otherwise keep at least 1.
  const phys = soft === 1 ? 0 : Math.max(1, soft - delta);
  return { phys, kind: phys === 0 ? 'lower(0)' : 'lower' };
}

(async () => {
  const browser = await L.launch();
  const { page } = await L.login(browser, L.USERS[0]);
  await L.openAudit(page);
  const { total, perPage, rows } = await L.readAllRows(page);
  await browser.close();

  if (rows.length !== total) throw new Error(`Read ${rows.length} rows but grid says ${total}`);
  const initialized = rows.filter((r) => r.status === 'Initialized');

  // Unique key per row (identical rows get an occurrence suffix).
  const seen = {};
  const items = initialized.map((r) => {
    const base = L.keyOf(r);
    seen[base] = (seen[base] ?? 0) + 1;
    const key = seen[base] > 1 ? `${base} #${seen[base]}` : base;
    const soft = Number(r.soft);
    return { key, name: r.name, batch: r.batch, exp: r.exp, soft, ...targetQty(soft, key) };
  });

  // Contiguous thirds so each user works through their own pages.
  const third = Math.ceil(items.length / 3);
  items.forEach((it, i) => (it.user = L.USERS[Math.floor(i / third)].login));

  const plan = {
    createdAt: L.now(),
    audit: L.AUDIT,
    gridTotal: total,
    perPage,
    statusCounts: {},
    items,
  };
  for (const r of rows) plan.statusCounts[r.status] = (plan.statusCounts[r.status] ?? 0) + 1;
  fs.writeFileSync(L.PLAN_FILE, JSON.stringify(plan, null, 2));

  const by = (f) => items.reduce((a, it) => ((a[f(it)] = (a[f(it)] ?? 0) + 1), a), {});
  console.log(`Grid rows: ${total} (per page ${perPage}) · status:`, plan.statusCounts);
  console.log(`Initialized rows to enter: ${items.length}`);
  console.log(
    'By user:',
    by((it) => it.user),
  );
  console.log(
    'By case:',
    by((it) => it.kind),
  );
  console.log('Plan written to', L.PLAN_FILE);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
