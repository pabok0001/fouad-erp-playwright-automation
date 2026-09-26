// Step C (read-only): log in fresh, read the whole audit grid and check it against
// plan.json + the progress logs. Writes output/verification.json and prints a summary.
// Usage: node scripts/audit/verify.cjs
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const parseDate = (s) => {
  const [d, m, y] = s.split('/').map(Number);
  return new Date(y, m - 1, d);
};
/** "24/09/2026 06:51 PM" → Date */
const parseEntry = (s) => {
  const m = s.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = Number(m[4]) % 12;
  if (/pm/i.test(m[6])) h += 12;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), h, Number(m[5]));
};

(async () => {
  const plan = JSON.parse(fs.readFileSync(L.PLAN_FILE, 'utf8'));
  const progress = L.USERS.flatMap((u) => L.readJsonl(L.progressFile(u.login)));
  const okRecs = new Map(); // key → last ok record
  for (const r of progress) if (r.ok) okRecs.set(r.key, r);
  const blocked = new Map(progress.filter((r) => r.blocked).map((r) => [r.key, r]));

  const browser = await L.launch();
  const { page } = await L.login(browser, L.USERS[0]); // fresh login = fresh session
  await L.openAudit(page);
  const { total, rows } = await L.readAllRows(page);
  await browser.close();

  // Map grid rows to plan keys the same way plan.cjs did.
  const seen = {};
  const byKey = new Map();
  for (const r of rows) {
    const base = L.keyOf(r);
    seen[base] = (seen[base] ?? 0) + 1;
    const key = seen[base] > 1 ? `${base} #${seen[base]}` : base;
    byKey.set(key, r);
  }

  const statusCounts = {};
  for (const r of rows) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  const planned = plan.items;
  const res = {
    checkedAt: L.now(),
    gridTotal: total,
    rowsRead: rows.length,
    statusCounts,
    planned: planned.length,
    entered: 0,
    stillInitialized: [],
    wrongPhysical: [],
    softChanged: [],
    deviationWrong: [],
    byUser: {},
    byUserGridName: {},
    cases: { equal: 0, higher: 0, lower: 0 },
    zeroPhysical: 0,
    expiry: { past: 0, future: 0 },
    addedInStep2: [],
    blocked: [...blocked.values()].map((b) => ({
      name: b.name,
      batch: b.batch,
      exp: b.exp,
      issue: b.issue,
    })),
    attributionMismatch: [],
    entryTimeMismatch: [],
    duplicateKeys: [],
  };

  // Identical rows beyond what initialize created would suggest duplicates.
  const baseCounts = {};
  for (const r of rows) {
    const b = L.keyOf(r);
    baseCounts[b] = (baseCounts[b] ?? 0) + 1;
  }
  const planBase = {};
  for (const it of planned) {
    const b = [it.name, it.batch, it.exp, it.soft].join(' | ');
    planBase[b] = (planBase[b] ?? 0) + 1;
  }

  const userName = {}; // login → grid display name (from progress)
  for (const r of okRecs.values()) if (r.rowUser) (userName[r.user] ??= new Set()).add(r.rowUser);

  for (const it of planned) {
    const g = byKey.get(it.key);
    if (!g) {
      res.stillInitialized.push({ key: it.key, issue: 'row missing from grid' });
      continue;
    }
    if (g.status === 'Initialized') {
      res.stillInitialized.push({ key: it.key, user: it.user, blocked: blocked.has(it.key) });
      continue;
    }
    res.entered++;
    const soft = Number(g.soft),
      phys = Number(g.phys);
    if (soft !== it.soft) res.softChanged.push({ key: it.key, planned: it.soft, grid: soft });
    if (phys !== it.phys) res.wrongPhysical.push({ key: it.key, planned: it.phys, grid: phys });
    if (Number(g.deviation) !== phys - soft)
      res.deviationWrong.push({ key: it.key, deviation: g.deviation, expected: phys - soft });
    if (phys === soft) res.cases.equal++;
    else if (phys > soft) res.cases.higher++;
    else res.cases.lower++;
    if (phys === 0) res.zeroPhysical++;
    if (parseDate(g.exp) < TODAY) res.expiry.past++;
    else res.expiry.future++;
    res.byUserGridName[g.user] = (res.byUserGridName[g.user] ?? 0) + 1;

    const rec = okRecs.get(it.key);
    const who = rec?.user ?? it.user;
    res.byUser[who] = (res.byUser[who] ?? 0) + 1;
    if (rec && userName[who] && !userName[who].has(g.user))
      res.attributionMismatch.push({ key: it.key, login: who, grid: g.user });
    // Entry time should be within a few minutes of when the script saved it.
    const shown = parseEntry(g.entry);
    if (rec && shown && !rec.alreadyDone && Math.abs(shown - new Date(rec.time)) > 5 * 60_000) {
      res.entryTimeMismatch.push({ key: it.key, savedAt: rec.time, gridEntry: g.entry });
    }
  }

  // Step 2 rows: entered via Add Item (not in the initialize plan).
  const planKeys = new Set(planned.map((p) => p.key));
  for (const [key, g] of byKey)
    if (!planKeys.has(key)) {
      res.addedInStep2.push({
        name: g.name,
        batch: g.batch,
        exp: g.exp,
        soft: g.soft,
        phys: g.phys,
        status: g.status,
        user: g.user,
        expiry: parseDate(g.exp) < TODAY ? 'past' : 'future',
      });
    }
  for (const [b, n] of Object.entries(baseCounts))
    if (planBase[b] !== undefined && n > planBase[b])
      res.duplicateKeys.push({ row: b, grid: n, initialized: planBase[b] });

  res.userDisplayNames = Object.fromEntries(Object.entries(userName).map(([k, v]) => [k, [...v]]));
  fs.writeFileSync(path.join(L.OUT, 'verification.json'), JSON.stringify(res, null, 2));

  const n = (a) => (Array.isArray(a) ? a.length : a);
  console.log(
    JSON.stringify(
      {
        gridTotal: res.gridTotal,
        statusCounts,
        planned: res.planned,
        entered: res.entered,
        stillInitialized: n(res.stillInitialized),
        blocked: n(res.blocked),
        byUser: res.byUser,
        byUserGridName: res.byUserGridName,
        userDisplayNames: res.userDisplayNames,
        cases: res.cases,
        zeroPhysical: res.zeroPhysical,
        expiryOfEntered: res.expiry,
        step2Added: res.addedInStep2.length,
        step2Expiry: res.addedInStep2.reduce(
          (a, r) => ((a[r.expiry] = (a[r.expiry] ?? 0) + 1), a),
          {},
        ),
        wrongPhysical: n(res.wrongPhysical),
        softChanged: n(res.softChanged),
        deviationWrong: n(res.deviationWrong),
        attributionMismatch: n(res.attributionMismatch),
        entryTimeMismatch: n(res.entryTimeMismatch),
        duplicateKeys: n(res.duplicateKeys),
      },
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
