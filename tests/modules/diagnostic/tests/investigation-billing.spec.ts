import { test, expect } from '../../../../fixtures/api';
import type { APIRequestContext, TestInfo } from '@playwright/test';
import type { Totals } from '../pages/InvestigationEntryPage';
import { InvestigationDashboardPage } from '../pages/InvestigationDashboardPage';
import {
  discountAllowed,
  invoiceForPatient,
  invoiceLedger,
  testsForPatient,
} from '../utils/investigationApi';
import {
  ALL_TESTS,
  MAX_DISCOUNT_PERCENT,
  TEST_SETS,
  openEntry,
  registerPatient,
  sumDiscountable,
  sumRates,
  testItems,
} from '../utils/investigationFlow';
import type { BrowserContext } from '@playwright/test';

// Tests, discount and Paid/Due on /diagnostic/investigation — test cases: ../testcases/investigation.md
// ⚠️ Each INV-AUTO test registers a fresh patient and saves one real invoice for them.
//
// App rules this suite relies on (observed 2026-09-26, see README DIAG-BR07/BR09–BR12):
// - the app adds tube charges (Vacutainer …, Urine C/S Pot) as extra rows; they count in Sub Total;
// - discounts apply to "Discountable(TK)" only: tests with isDiscountAllow in the master;
// - General Discount is capped at 15% of Discountable (more → Disc(Tk) resets to 0);
// - Payment (Cash) is pre-filled with Net Payable; Due = Net Payable − Cash.

const REALISTIC = testItems(TEST_SETS.realistic); // CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray
const TWO_TESTS = testItems(['CBC', 'FBS']);
const DISCOUNTABLE = sumDiscountable(REALISTIC);

const fmt = (t: Totals) =>
  `sub ${t.subTotal}, discountable ${t.discountable}, disc ${t.discountPercent}% = ${t.discountTk} Tk, net ${t.netPayable}, cash ${t.cash}, due ${t.due}`;

/** Save, then gather the invoice from the API and the dashboard, recording everything. */
async function saveAndFetch(
  context: BrowserContext,
  api: APIRequestContext,
  info: TestInfo,
  entry: Awaited<ReturnType<typeof openEntry>>,
  uhid: string,
) {
  const before = await entry.totals();
  const result = await entry.save();
  expect(result.saved, `save messages: ${result.messages.map((m) => m.text).join(' | ')}`).toBe(
    true,
  );
  const invoice = await invoiceForPatient(api, uhid);
  const ledger = await invoiceLedger(api, invoice.id);
  const dashboard = new InvestigationDashboardPage(await context.newPage());
  await dashboard.goto();
  const row = await dashboard.find(invoice.invoiceNo);
  info.annotations.push(
    { type: 'UI totals at save', description: fmt(before) },
    {
      type: 'invoice',
      description: `${invoice.invoicePrefix}${invoice.invoiceNo}, entry ${invoice.entryDate}, due ${invoice.dueAmount} (GetInvoiceByInvoiceNo says ${invoice.dueAmountByInvoiceNo})`,
    },
    {
      type: 'ledger',
      description: ledger
        .map((l) => `${l.description}: Dr ${l.debit} / Cr ${l.credit}`)
        .join(' · '),
    },
    { type: 'dashboard', description: `status "${row.status}", ${row.entryDate} ${row.entryTime}` },
  );
  const debit = ledger.reduce((s, l) => s + l.debit, 0);
  const credit = ledger.reduce((s, l) => s + l.credit, 0);
  return { totals: before, invoice, ledger, row, debit, credit };
}

test.describe('Diagnostic · OPD Investigation Entry · tests, discount, Paid/Due', () => {
  test.describe.configure({ timeout: 300_000 });

  test('DATA-CHECK investigation-tests.json matches the TestItem master (rates, discount flags)', async ({
    api,
  }) => {
    const master = await discountAllowed(api);
    for (const t of ALL_TESTS) {
      const key = `${t.name}|${t.rate}`;
      expect.soft(master.has(key), `${t.name} at ${t.rate} Tk exists in the master`).toBe(true);
      expect.soft(master.get(key), `${t.name} discountable flag`).toBe(t.discountable);
    }
  });

  test('INV-AUTO-004 multiple tests in one entry are all billed', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);

    const rows = await entry.gridRows();
    for (const t of REALISTIC) {
      const row = rows.find((r) => r.name === t.name);
      expect.soft(row, `${t.name} in the grid`).toBeTruthy();
      expect.soft(row?.rate, `${t.name} rate`).toBe(t.rate);
    }
    const totals = await entry.totals();
    expect(totals.subTotal, 'Sub Total = sum of grid rows').toBe(
      rows.reduce((s, r) => s + r.total, 0),
    );
    expect(totals.subTotal).toBeGreaterThanOrEqual(sumRates(REALISTIC));

    await saveAndFetch(context, api, test.info(), entry, uhid);
    const billed = await testsForPatient(api, uhid);
    test.info().annotations.push({ type: 'billed tests', description: billed.join(', ') });
    for (const t of REALISTIC) expect.soft(billed, `${t.name} on the invoice`).toContain(t.name);
  });

  test('INV-AUTO-005 percentage discount is calculated and reflected', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);
    const pct = 10;
    const discountable = DISCOUNTABLE;
    await entry.setDiscountPercent(pct);

    const t = await entry.totals();
    expect(t.discountable, 'Discountable = non-govt test rates').toBe(discountable);
    expect(t.discountTk, `${pct}% of ${discountable}`).toBe(Math.round((discountable * pct) / 100));
    expect(t.netPayable, 'Net = Sub Total − Discount').toBe(t.subTotal - t.discountTk);
    expect(t.cash, 'cash pre-filled with net').toBe(t.netPayable);

    const saved = await saveAndFetch(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'due on the invoice').toBe(0);
    expect(saved.debit - saved.credit, 'ledger balance (debits − credits) = due').toBe(0);
    const discountLine = saved.ledger.find((l) => /disc/i.test(l.description));
    expect.soft(discountLine, 'a discount line in the ledger').toBeTruthy();
    expect
      .soft(discountLine && Math.max(discountLine.debit, discountLine.credit))
      .toBe(t.discountTk);
  });

  test('INV-AUTO-006 full payment → Status Paid, Due 0', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, TWO_TESTS);
    const t = await entry.totals();
    expect(t.cash, 'cash = net (full payment)').toBe(t.netPayable);
    expect(t.due).toBe(0);

    const saved = await saveAndFetch(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'due on the invoice').toBe(0);
    expect(saved.row.status, 'dashboard status').toBe('Paid');
  });

  test('INV-AUTO-007 partial payment → Status Due, Due = Net − Paid', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, TWO_TESTS);
    const net = (await entry.totals()).netPayable;
    const paid = net - 200;
    await entry.setCash(paid);
    const t = await entry.totals();
    expect(t.cash, 'cash entered').toBe(paid);
    expect(t.due, 'UI Due = Net − Paid').toBe(net - paid);

    const saved = await saveAndFetch(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'due on the invoice').toBe(net - paid);
    expect(saved.debit - saved.credit, 'ledger balance = due').toBe(net - paid);
    expect(saved.row.status, 'dashboard status').toMatch(/due/i);
  });

  test('INV-AUTO-030 invoice calculation: Total − Discount = Net; Net − Paid = Due', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);
    // Within the 15% cap: 200 of 1680 discountable.
    const discountTk = 200;
    expect(discountTk).toBeLessThanOrEqual((DISCOUNTABLE * MAX_DISCOUNT_PERCENT) / 100);
    await entry.setDiscountTk(discountTk);
    const afterDiscount = await entry.totals();
    expect(afterDiscount.discountTk, 'discount entered').toBe(discountTk);
    expect(afterDiscount.netPayable, 'Net = Total − Discount').toBe(
      afterDiscount.subTotal - discountTk,
    );
    const paid = afterDiscount.netPayable - 1000;
    await entry.setCash(paid);
    const t = await entry.totals();
    expect(t.due, 'Due = Net − Paid').toBe(t.netPayable - paid);

    const saved = await saveAndFetch(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'invoice due').toBe(t.due);
    expect(saved.debit - saved.credit, 'ledger balance = due').toBe(t.due);
    const payment = saved.ledger.filter((l) => /payment/i.test(l.description));
    expect
      .soft(
        payment.reduce((s, l) => s + l.credit, 0),
        'payment credited in the ledger',
      )
      .toBe(paid);
    expect(saved.row.status, 'dashboard status').toMatch(/due/i);
  });
});
