import { test, expect } from '../../../../fixtures/api';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { InvestigationDashboardPage } from '../pages/InvestigationDashboardPage';
import { invoiceForPatient, invoiceLedger, serverClockOffsetMs } from '../utils/investigationApi';
import { TEST_SETS, openEntry, registerPatient, testItems } from '../utils/investigationFlow';

// Entry / invoice date & time on /diagnostic/investigation — test cases: ../testcases/investigation.md
// ⚠️ Registers a fresh patient and saves one real invoice. Waits INV_WAIT_MIN minutes (default 3)
// with the page open before entering data, so the page-load time and the save time differ.
//
// The app stamps entries with the *server* clock, which is not in sync with this PC (79 s behind
// on 2026-09-26). Local click times are converted to server time via the HTTP Date header first.

const WAIT_MIN = Number(process.env.INV_WAIT_MIN ?? 3);
/** Acceptable difference between the save and a recorded time (QA: ±1 minute). */
const TOLERANCE_MS = 60_000;

/** "2026-09-26T17:54:44.843" (server local time, no zone) → Date in this machine's zone. */
const parseLocal = (s: string) => new Date(s.replace(/Z$/, ''));
/** "09/26/2026" + "05:54 PM" → Date (minute precision). */
function parseDashboard(date: string, time: string) {
  const [m, d, y] = date.split('/').map(Number);
  const [, hh, mm, ap] = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(time) ?? [];
  const h = (Number(hh) % 12) + (/pm/i.test(ap ?? '') ? 12 : 0);
  return new Date(y, m - 1, d, h, Number(mm));
}
const hms = (d: Date) => d.toTimeString().slice(0, 8);
/** Date → "07:12 PM", the app's time format. */
const ampm = (d: Date) =>
  d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
const sameMinute = (a: Date, b: Date) =>
  Math.floor(a.getTime() / 60_000) === Math.floor(b.getTime() / 60_000);

test('INV-AUTO-010 / INV-AUTO-011 / INV-AUTO-012 entry, invoice and UI date/time = save time, not page-load time', async ({
  context,
  api,
}) => {
  test.setTimeout((WAIT_MIN + 6) * 60_000);
  const { uhid } = await registerPatient(context);

  // 1. Open the page and leave it open.
  const page = await context.newPage();
  const entry = new InvestigationEntryPage(page);
  await entry.goto();
  const loadedAt = new Date();

  await test.step(`page open, waiting ${WAIT_MIN} min`, () =>
    // The wait is the test: the page must sit open before data is entered.
    // eslint-disable-next-line playwright/no-wait-for-timeout
    page.waitForTimeout(WAIT_MIN * 60_000));

  // 2. Enter patient + tests on the page that has been open, then save.
  await openEntry(page, uhid, testItems(TEST_SETS.simple), { navigate: false });
  const result = await entry.save();
  expect(result.saved, result.messages.map((m) => m.text).join(' | ')).toBe(true);
  const offset = await serverClockOffsetMs(api);
  const savedAtServer = new Date(result.savedAt.getTime() + offset);
  const loadedAtServer = new Date(loadedAt.getTime() + offset);

  // 3. Where the app recorded the time.
  const invoice = await invoiceForPatient(api, uhid);
  const recorded = parseLocal(invoice.entryDate);
  const ledger = await invoiceLedger(api, invoice.id);
  const dashboard = new InvestigationDashboardPage(await context.newPage());
  await dashboard.goto();
  const row = await dashboard.find(invoice.invoiceNo);
  const shown = parseDashboard(row.entryDate, row.entryTime);
  const windowTimes = [...result.invoiceText.matchAll(/\b\d{1,2}:\d{2}\s*(?:AM|PM)/gi)].map((m) =>
    m[0].replace(/\s+/g, ' ').toUpperCase(),
  );

  test.info().annotations.push(
    { type: 'server clock − PC clock', description: `${Math.round(offset / 1000)} s` },
    { type: 'page loaded (server time)', description: hms(loadedAtServer) },
    { type: 'save clicked (server time)', description: hms(savedAtServer) },
    {
      type: 'invoice entryDate / entryTime',
      description: `${invoice.entryDate} / ${invoice.entryTime}`,
    },
    { type: 'ledger tranDate', description: ledger.map((l) => l.tranDate).join(', ') },
    { type: 'dashboard Entry Date/Time', description: `${row.entryDate} ${row.entryTime}` },
    {
      type: 'invoice window',
      description: result.invoiceText
        ? result.invoiceText.slice(0, 400)
        : '(none opened — this server prints invoices to its own printer)',
    },
  );

  // INV-AUTO-010: the entry time is the save time (±1 min), not the page-load time.
  expect(
    Math.abs(recorded.getTime() - savedAtServer.getTime()),
    `entryDate ${invoice.entryDate} vs save ${hms(savedAtServer)} (server time)`,
  ).toBeLessThanOrEqual(TOLERANCE_MS);
  expect(
    recorded.getTime() - loadedAtServer.getTime(),
    `entryDate is ~${WAIT_MIN} min after the page load (${hms(loadedAtServer)}), not the load time`,
  ).toBeGreaterThan((WAIT_MIN - 1) * 60_000);

  // INV-AUTO-011 / 012: every date/time on the invoice record, and the UI (dashboard)
  // Entry Date/Time, agree with that entry time.
  expect(invoice.entryTime, 'invoice entryTime matches entryDate').toBe(ampm(recorded));
  const ledgerDrift = ledger.map((l) =>
    Math.abs(parseLocal(l.tranDate).getTime() - recorded.getTime()),
  );
  expect(Math.max(...ledgerDrift), 'ledger tranDate vs entryDate (ms)').toBeLessThanOrEqual(5_000);
  expect(sameMinute(shown, recorded), `dashboard ${row.entryDate} ${row.entryTime}`).toBe(true);
  // If the app opened an invoice window, its time must match too.
  expect(
    result.invoiceText === '' || windowTimes.includes(invoice.entryTime.toUpperCase()),
    `invoice window shows ${invoice.entryTime} (times found: ${windowTimes.join(', ') || 'none'})`,
  ).toBe(true);
});
