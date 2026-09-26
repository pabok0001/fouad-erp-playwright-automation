// Step B: one user logs in through the UI and enters Physical Stock for the rows
// assigned to them in plan.json. Resumable: completed rows are read from
// output/progress-<login>.jsonl and never edited twice.
// Usage: node scripts/audit/entry.cjs <admin|pabok1|messi2> [--limit N]
const fs = require('fs');
const L = require('./lib.cjs');

const login = process.argv[2];
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;
const BATCH = 50;
const SLOW_MS = 10_000;

const user = L.USERS.find((u) => u.login === login);
if (!user) {
  console.error(`Unknown user "${login}". Use one of: ${L.USERS.map((u) => u.login).join(', ')}`);
  process.exit(2);
}

const plan = JSON.parse(fs.readFileSync(L.PLAN_FILE, 'utf8'));
const mine = plan.items.filter((it) => it.user === login);
const progressPath = L.progressFile(login);
// Completed rows, plus rows the UI blocks (reported once, not retried).
const retryBlocked = process.argv.includes('--retry-blocked');
const done = new Set(
  L.readJsonl(progressPath)
    .filter((p) => p.ok || (p.blocked && !retryBlocked))
    .map((p) => p.key),
);

const sameRow = (r, it) => r.name === it.name && r.batch === it.batch && r.exp === it.exp;

/** Snapshot of the grid (pager + first row) to detect when it re-renders. */
const gridSignature = (page) =>
  page.evaluate(() => {
    const pager = document.body.innerText.match(/\d+-\d+ of \d+/)?.[0] ?? '';
    const first = document.querySelector('table tbody tr')?.innerText ?? '';
    return pager + '|' + first;
  });

/** Wait until the grid is filtered by `term` (every row matches) or shows no rows. */
async function waitForSearch(page, term, before) {
  // First let the grid react to the new search (debounced), so a stale
  // "0-0 of 0" or stale rows from the previous search aren't read as the result.
  if (before !== undefined) {
    await page
      .waitForFunction(
        (b) => {
          const pager = document.body.innerText.match(/\d+-\d+ of \d+/)?.[0] ?? '';
          const first = document.querySelector('table tbody tr')?.innerText ?? '';
          return pager + '|' + first !== b;
        },
        before,
        { timeout: 5_000 },
      )
      .catch(() => {});
  }
  await page
    .waitForFunction(
      (n) => {
        const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
        const rows = [...document.querySelectorAll('table tbody tr')].filter(
          (tr) => tr.querySelectorAll('td').length >= 12,
        );
        if (rows.length === 0) return /\b0-0 of 0\b/.test(document.body.innerText);
        return rows.every((tr) => norm(tr.querySelectorAll('td')[1].innerText).includes(norm(n)));
      },
      term,
      { timeout: 15_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Filter the grid to rows of this product. Some product names contain double
 * spaces that the grid shows collapsed, so a full-name search can miss — then
 * fall back to the longest word of the name and match on normalized names.
 */
async function searchProduct(page, it) {
  const search = page.getByRole('textbox', { name: 'Search products...' });
  const current = await search.inputValue();
  if (current !== it.name) {
    const before = await gridSignature(page);
    await search.fill(it.name);
    await waitForSearch(page, it.name, before);
  }
  let rows = await L.readRows(page);
  if (!rows.some((r) => sameRow(r, it))) {
    // Skip the formation prefix ("Surgical - ", "Tab - " …): it matches hundreds of rows,
    // so the product might not be on the first page of results.
    const body = it.name.includes(' - ') ? it.name.slice(it.name.indexOf(' - ') + 3) : it.name;
    const word =
      body
        .split(' ')
        .filter((w) => /[a-z0-9]/i.test(w))
        .sort((a, b) => b.length - a.length)[0] ?? it.name;
    const before = await gridSignature(page);
    await search.fill(word);
    await waitForSearch(page, word, before);
    rows = await L.readRows(page);
  }
  return rows;
}

/** Poll the grid until the saved values show (the grid refreshes 1–3 s after Update). */
async function waitForSaved(page, it, timeoutMs = 12_000) {
  const end = Date.now() + timeoutMs;
  let rows = [];
  while (Date.now() < end) {
    rows = await L.readRows(page);
    const saved = rows.find(
      (r) =>
        sameRow(r, it) &&
        Number(r.soft) === it.soft &&
        Number(r.phys) === it.phys &&
        r.status !== 'Initialized',
    );
    if (saved) return { saved, rows };
    await page.waitForTimeout(500);
  }
  return { saved: null, rows };
}

async function ensureSession(state) {
  if (!state.page.url().includes('/Account/Login')) return;
  L.logIssue({
    user: login,
    issue: 'Unexpected logout / session expiry — logging in again',
    action: 'session check',
  });
  await state.ctx.close().catch(() => {});
  Object.assign(state, await L.login(state.browser, user));
  await L.openAudit(state.page);
}

/**
 * Cancel every open dialog (a stuck dialog's overlay blocks the whole grid).
 * If one refuses to close (seen after a double-open), reload the page and
 * re-open the audit — that resets the Blazor UI state without saving anything.
 */
async function closeDialogs(page) {
  const dialogs = page.getByRole('dialog');
  for (let i = 0; i < 5 && (await dialogs.count()) > 0; i++) {
    await dialogs
      .last()
      .getByRole('button', { name: 'Cancel' })
      .click({ timeout: 3_000 })
      .catch(() => {});
    await page.waitForTimeout(700);
  }
  if ((await dialogs.count()) > 0) {
    L.logIssue({
      user: login,
      action: 'close dialog',
      issue: 'Edit dialog would not close with Cancel — reloaded the page',
    });
    await L.openAudit(page);
  }
}

/** True when the audit page is showing the Step 1 audit with its rows. */
async function auditLoaded(page) {
  if (!page.url().includes('/pharmacy/audit-details-entry')) return false;
  const desc = await page
    .getByRole('textbox', { name: 'Description' })
    .inputValue({ timeout: 3_000 })
    .catch(() => '');
  const rowsLabel = await page
    .getByText(/\d+ row\(s\)/)
    .innerText({ timeout: 3_000 })
    .catch(() => '0 row(s)');
  return desc === L.AUDIT.description && !/^0 row/.test(rowsLabel);
}

/** Enter physical stock for one planned row. Returns a progress record. */
async function enter(state, it) {
  const { page } = state;
  await closeDialogs(page);
  const t0 = Date.now();
  const rec = {
    time: L.now(),
    key: it.key,
    user: login,
    name: it.name,
    batch: it.batch,
    exp: it.exp,
    soft: it.soft,
    phys: it.phys,
    kind: it.kind,
  };

  let rows = await searchProduct(page, it);
  const candidates = rows.filter((r) => sameRow(r, it) && Number(r.soft) === it.soft);
  const target = candidates.find((r) => r.status === 'Initialized');
  if (!target) {
    const pendingMine = candidates.find(
      (r) => r.status !== 'Initialized' && Number(r.phys) === it.phys,
    );
    if (pendingMine)
      return {
        ...rec,
        ok: true,
        alreadyDone: true,
        rowUser: pendingMine.user,
        rowEntry: pendingMine.entry,
        status: pendingMine.status,
      };
    const any = rows.filter((r) => sameRow(r, it));
    return {
      ...rec,
      ok: false,
      issue: candidates.length
        ? `Row no longer Initialized (status ${candidates.map((c) => c.status).join(',')}, phys ${candidates.map((c) => c.phys).join(',')})`
        : any.length
          ? `Software stock changed: expected ${it.soft}, grid shows ${any.map((a) => a.soft).join(',')}`
          : 'Row not found by search',
    };
  }

  // The grid can re-render right after a search; re-click Edit if the dialog doesn't open.
  // Never click Edit while a dialog is already open (a slow dialog + re-click opened two).
  const dlg = page.getByRole('dialog');
  let opened = false;
  for (let attempt = 1; attempt <= 3 && !opened; attempt++) {
    if ((await dlg.count()) > 0) {
      opened = await dlg
        .first()
        .getByRole('button', { name: 'Update' })
        .waitFor({ timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (opened) break;
    }
    const fresh = await L.readRows(page);
    const row = fresh.find(
      (r) => sameRow(r, it) && Number(r.soft) === it.soft && r.status === 'Initialized',
    );
    if (!row) break;
    const clicked = await page
      .locator('table tbody tr')
      .nth(row.i)
      .getByRole('button', { name: 'Edit' })
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) {
      await L.closePopovers(page);
      await page.waitForTimeout(1000);
      continue;
    }
    opened = await dlg
      .first()
      .getByRole('button', { name: 'Update' })
      .waitFor({ timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
  }
  if (!opened) return { ...rec, ok: false, issue: 'Edit dialog did not open after 3 clicks' };
  if ((await dlg.count()) > 1) {
    await closeDialogs(page);
    return {
      ...rec,
      ok: false,
      issue: 'Two Edit dialogs opened for one click — closed both, will retry',
    };
  }

  // Verify the dialog is for the right row and Software Stock is as initialized.
  const val = (n, role = 'textbox') => dlg.getByRole(role, { name: n, exact: true }).inputValue();
  const shown = {
    name: (await val('Product Name')).replace(/\s+/g, ' ').trim(),
    batch: await val('Batch No'),
    exp: await val('Expire Date'),
    status: await val('Status'),
    soft: Number(await val('Software Stock', 'spinbutton')),
  };
  if (
    shown.name !== it.name ||
    shown.batch !== it.batch ||
    shown.exp !== it.exp ||
    shown.soft !== it.soft ||
    shown.status !== 'Initialized'
  ) {
    await dlg
      .getByRole('button', { name: 'Cancel' })
      .click({ timeout: 3_000 })
      .catch(() => {});
    await closeDialogs(page);
    return { ...rec, ok: false, issue: `Edit dialog mismatch: ${JSON.stringify(shown)}` };
  }

  await dlg.getByRole('spinbutton', { name: 'Physical Stock', exact: true }).fill(String(it.phys));
  await page.waitForTimeout(300);
  const updateBtn = dlg.getByRole('button', { name: 'Update' });
  // Update can be briefly disabled while the form validates / a previous save finishes.
  for (let i = 0; i < 10 && (await updateBtn.isDisabled()); i++) await page.waitForTimeout(500);
  if (await updateBtn.isDisabled()) {
    // The form blocks saving (seen when Batch No is empty on some rows). Don't touch
    // other fields to force it — report and skip this row.
    const shot = await L.screenshot(page, `blocked-${login}-${it.name}`);
    await dlg.getByRole('button', { name: 'Cancel' }).click();
    await dlg.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    return {
      ...rec,
      ok: false,
      blocked: true,
      issue: `UI blocks entry: Update button disabled (Batch No "${shown.batch}")`,
      screenshot: shot,
    };
  }
  await updateBtn.click();
  const closed = await dlg
    .waitFor({ state: 'hidden', timeout: 45_000 })
    .then(() => true)
    .catch(() => false);
  if (!closed) {
    const text = (await dlg.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300);
    const shot = await L.screenshot(page, `save-failed-${login}-${it.name}`);
    await dlg
      .getByRole('button', { name: 'Cancel' })
      .click()
      .catch(() => {});
    return {
      ...rec,
      ok: false,
      issue: `Update did not close the dialog: ${text}`,
      screenshot: shot,
    };
  }

  // Verify the saved row: physical, unchanged software stock, deviation, status, user.
  const snack = await page
    .locator('.mud-snackbar')
    .filter({ hasText: /updated|success|fail|error/i })
    .first()
    .innerText({ timeout: 5_000 })
    .catch(() => '');
  const res = await waitForSaved(page, it);
  rows = res.rows;
  const saved = res.saved;
  const ms = Date.now() - t0;
  rec.message = snack.trim();
  if (!saved) {
    const shot = await L.screenshot(page, `verify-failed-${login}-${it.name}`);
    return {
      ...rec,
      ok: false,
      ms,
      issue: `Saved row not found with physical ${it.phys}; rows: ${JSON.stringify(rows.filter((r) => sameRow(r, it)))}`,
      screenshot: shot,
    };
  }
  const deviationOk = Number(saved.deviation) === it.phys - it.soft;
  return {
    ...rec,
    ok: true,
    ms,
    status: saved.status,
    deviation: saved.deviation,
    deviationOk,
    rowUser: saved.user,
    rowEntry: saved.entry,
    slow: ms > SLOW_MS,
  };
}

/** After each batch: reload and confirm a sample of the batch persisted. */
async function spotCheck(state, batchRecs) {
  await L.openAudit(state.page);
  const sample = batchRecs
    .filter((r) => r.ok)
    .filter((_, i, a) => i % Math.max(1, Math.floor(a.length / 5)) === 0)
    .slice(0, 5);
  const search = state.page.getByRole('textbox', { name: 'Search products...' });
  let okCount = 0;
  for (const r of sample) {
    const rows = await searchProduct(state.page, r);
    const hit = rows.find(
      (x) => sameRow(x, r) && Number(x.soft) === r.soft && Number(x.phys) === r.phys,
    );
    if (hit) okCount++;
    else
      L.logIssue({
        user: login,
        product: r.name,
        batch: r.batch,
        action: 'refresh spot-check',
        issue: `Entry missing after refresh (expected physical ${r.phys})`,
      });
  }
  await search.fill('');
  return `${okCount}/${sample.length}`;
}

(async () => {
  const todo = mine.filter((it) => !done.has(it.key)).slice(0, LIMIT);
  console.log(
    `[${login}] assigned ${mine.length}, already done ${done.size}, to do now ${todo.length}`,
  );
  if (!todo.length) return;

  const browser = await L.launch();
  const state = { browser, ...(await L.login(browser, user)) };
  console.log(`[${login}] logged in as "${state.displayName}"`);
  await L.openAudit(state.page);

  let batch = [];
  let n = 0;
  let failStreak = 0;
  for (const it of todo) {
    n++;
    let rec;
    try {
      await ensureSession(state);
      // After a page timeout the tab can be left off the audit; re-open it before searching.
      if (!(await auditLoaded(state.page))) {
        L.logIssue({
          user: login,
          action: 'page check',
          issue: 'Audit page not loaded (after a timeout?) — re-opening',
        });
        await L.openAudit(state.page);
      }
      // Several failures in a row: start a fresh session.
      if (failStreak >= 5) {
        L.logIssue({
          user: login,
          action: 'recovery',
          issue: `${failStreak} failures in a row — new login`,
        });
        await state.ctx.close().catch(() => {});
        Object.assign(state, await L.login(state.browser, user));
        await L.openAudit(state.page);
        failStreak = 0;
      }
      rec = await enter(state, it);
    } catch (e) {
      const shot = await L.screenshot(state.page, `error-${login}-${it.name}`);
      await closeDialogs(state.page);
      rec = {
        time: L.now(),
        key: it.key,
        user: login,
        name: it.name,
        ok: false,
        issue: `Exception: ${e.message.split('\n')[0]}`,
        screenshot: shot,
      };
    }
    fs.appendFileSync(progressPath, JSON.stringify(rec) + '\n');
    failStreak = rec.ok || rec.blocked ? 0 : failStreak + 1;
    if (!rec.ok)
      L.logIssue({
        user: login,
        product: it.name,
        batch: it.batch,
        action: `set physical ${it.phys}`,
        issue: rec.issue,
        screenshot: rec.screenshot,
      });
    else if (rec.slow)
      L.logIssue({
        user: login,
        product: it.name,
        action: 'update',
        issue: `Slow UI: ${rec.ms} ms`,
      });
    else if (rec.deviationOk === false)
      L.logIssue({
        user: login,
        product: it.name,
        action: 'verify deviation',
        issue: `Deviation ${rec.deviation} ≠ ${it.phys - it.soft}`,
      });
    batch.push(rec);

    if (batch.length === BATCH || n === todo.length) {
      const okN = batch.filter((b) => b.ok).length;
      const users = [...new Set(batch.filter((b) => b.rowUser).map((b) => b.rowUser))];
      const spot = await spotCheck(state, batch).catch((e) => `error: ${e.message.split('\n')[0]}`);
      console.log(
        `[${login}] ${L.now()} batch done: ${n}/${todo.length} · ok ${okN}/${batch.length} · grid user ${JSON.stringify(users)} · refresh check ${spot}`,
      );
      batch = [];
    }
  }
  await browser.close();
  console.log(`[${login}] finished`);
})().catch((e) => {
  console.error(`[${login}] FATAL`, e);
  process.exit(1);
});
