// Shared helpers for the Pharmacy Stock Audit UI automation (Audit Details Entry — STEP 2).
// Everything goes through the real UI: real logins, real clicks, no API/DB writes.
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
require(path.join(ROOT, 'node_modules', 'dotenv')).config({ path: path.join(ROOT, '.env'), quiet: true });
const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright-core'));

const BASE = process.env.BASE_URL;
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });

/** The audit created in Step 1. Matched on the Stock Audit dropdown option text. */
const AUDIT = { outlet: 'Indoor Outlet', month: '08', year: '2027', description: 'Test Audit' };

const USERS = [
  { login: process.env.APP_USER, password: process.env.APP_PASSWORD },
  { login: process.env.AUDIT_USER2, password: process.env.AUDIT_PASSWORD2 },
  { login: process.env.AUDIT_USER3, password: process.env.AUDIT_PASSWORD3 },
];

const PLAN_FILE = path.join(OUT, 'plan.json');
const progressFile = (login) => path.join(OUT, `progress-${login}.jsonl`);
const issuesFile = path.join(OUT, 'issues.jsonl');

const now = () => new Date().toISOString();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function logIssue(issue) {
  fs.appendFileSync(issuesFile, JSON.stringify({ time: now(), ...issue }) + '\n');
  console.log(`  !! ISSUE [${issue.user}] ${issue.product ?? ''} — ${issue.issue}`);
}

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

async function launch() {
  return chromium.launch({ headless: process.env.HEADED !== '1' });
}

/** Log in through the UI; retries up to 3 times when the server is slow to respond. */
async function login(browser, user) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await loginOnce(browser, user);
    } catch (e) {
      lastError = e;
      console.log(`  login attempt ${attempt} for ${user.login} failed: ${e.message.split('\n')[0]}`);
      await new Promise((r) => setTimeout(r, 15_000 * attempt));
    }
  }
  throw lastError;
}

async function loginOnce(browser, user) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1700, height: 1000 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20_000);
  await page.goto(BASE + '/', { timeout: 60_000 }).catch(async (e) => { await ctx.close(); throw e; });
  await page.waitForURL(/Account\/Login/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.fill('input[name="Input.Email"]', user.login);
  await page.fill('input[name="Input.Password"]', user.password);
  await page.getByRole('button', { name: 'Log In' }).click();
  await page.waitForURL((u) => !u.pathname.includes('/Account/Login'), { timeout: 30_000 });
  // App bar reads "… Language: English <Name> <Role>"; keep the part after the language picker.
  await page.getByRole('button', { name: 'Open user menu' }).waitFor({ timeout: 30_000 });
  const bar = (await page.locator('.mud-appbar').first().innerText()).replace(/\s+/g, ' ').trim();
  const displayName = bar.split(/Language:\s*\S+\s*/)[1]?.trim() || bar;
  return { ctx, page, displayName };
}

/** Close any open MudBlazor popover by clicking its overlay (Escape would close dialogs). */
async function closePopovers(page) {
  for (let i = 0; i < 3; i++) {
    const overlay = page.locator('.mud-popover-provider .mud-overlay').first();
    if (!(await overlay.isVisible().catch(() => false))) {
      if (!(await page.locator('.mud-popover-open').first().isVisible().catch(() => false))) return;
      await page.getByText('AUDIT DETAILS', { exact: true }).first().click({ force: true }).catch(() => {});
    } else {
      await overlay.click({ position: { x: 5, y: 5 } }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
}

/** Open Audit Details Entry and select the Step 1 audit. */
async function openAudit(page) {
  await page.goto(BASE + '/pharmacy/audit-details-entry', { timeout: 60_000 });
  const field = page.getByRole('textbox', { name: 'Stock Audit' });
  await field.waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1500);
  await field.click();
  await page.locator('.mud-popover-open p').filter({ hasText: AUDIT.description }).first().waitFor({ timeout: 15_000 });
  const option = page
    .locator('.mud-popover-open p')
    .filter({ hasText: AUDIT.outlet })
    .filter({ hasText: AUDIT.description })
    .filter({ hasText: new RegExp(`\\b${AUDIT.month}\\b`) })
    .filter({ hasText: AUDIT.year });
  if ((await option.count()) !== 1) throw new Error(`Expected exactly 1 matching audit option, found ${await option.count()}`);
  await option.click();
  // The audit picker stays open after selection and its overlay blocks the grid — close it.
  await page.waitForTimeout(800);
  await closePopovers(page);
  await page.getByText(/\d+ row\(s\)/).waitFor();
  await page.waitForFunction(() => /[1-9]\d* row\(s\)/.test(document.body.innerText), null, { timeout: 30_000 });
  const desc = await page.getByRole('textbox', { name: 'Description' }).inputValue();
  if (desc !== AUDIT.description) throw new Error(`Wrong audit selected: description "${desc}"`);
}

/** Read the visible grid rows as objects. */
async function readRows(page) {
  return page.locator('table tbody tr').evaluateAll((trs) =>
    trs
      .map((tr, i) => {
        const td = [...tr.querySelectorAll('td')].map((c) => c.innerText.replace(/\s+/g, ' ').trim());
        if (td.length < 12) return null;
        return {
          i, name: td[1], manufacturer: td[2], generic: td[3], batch: td[4], exp: td[5],
          soft: td[6], phys: td[7], deviation: td[8], status: td[9], user: td[10], entry: td[11],
        };
      })
      .filter(Boolean),
  );
}

async function rowCount(page) {
  return Number((await page.getByText(/\d+ row\(s\)/).innerText()).match(/(\d+)/)[1]);
}

/** Switch rows-per-page to the largest option offered. */
async function maxRowsPerPage(page) {
  const sel = page.locator('.mud-table-pagination .mud-select').first();
  await sel.click();
  const opts = page.locator('.mud-popover-open .mud-list-item');
  await opts.first().waitFor({ timeout: 10_000 });
  const texts = await opts.allInnerTexts();
  const best = texts.map((t) => t.trim()).filter((t) => /^\d+$/.test(t)).sort((a, b) => Number(b) - Number(a))[0];
  await opts.filter({ hasText: new RegExp(`^\\s*${best}\\s*$`) }).first().click();
  await page.waitForTimeout(1500);
  return Number(best);
}

/** Read every row across all pages. */
async function readAllRows(page) {
  const perPage = await maxRowsPerPage(page);
  const total = await rowCount(page);
  const all = [];
  for (let p = 0; p * perPage < total; p++) {
    if (p > 0) {
      await page.getByRole('button', { name: 'Next Page' }).click();
      await page.waitForTimeout(1500);
    }
    all.push(...(await readRows(page)));
  }
  return { total, perPage, rows: all };
}

const keyOf = (r) => [r.name, r.batch, r.exp, r.soft].join(' | ');

async function screenshot(page, label) {
  const file = path.join(OUT, 'screens', `${label.replace(/[^a-z0-9-_]+/gi, '_').slice(0, 80)}-${Date.now()}.png`);
  await page.screenshot({ path: file }).catch(() => {});
  return path.relative(ROOT, file);
}

module.exports = {
  ROOT, OUT, AUDIT, USERS, PLAN_FILE, progressFile, issuesFile,
  now, esc, logIssue, readJsonl, launch, login, openAudit, closePopovers, readRows, readAllRows, rowCount, keyOf, screenshot,
};
