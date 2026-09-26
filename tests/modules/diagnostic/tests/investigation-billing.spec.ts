import { test, expect } from '../../../../fixtures/api';
import {
  discountAllowed,
  existingAutomationPatients,
  testsForPatient,
} from '../utils/investigationApi';
import {
  ALL_TESTS,
  MAX_DISCOUNT_PERCENT,
  TEST_SETS,
  formatTotals,
  openEntry,
  registerPatient,
  saveAndVerify,
  sumDiscountable,
  sumRates,
  testItems,
} from '../utils/investigationFlow';

// Tests, discount and Paid/Due on /diagnostic/investigation — test cases: ../testcases/investigation.md
// ⚠️ Tests that save register a fresh patient and create one real invoice each; tests that only
// check the form (017, 018) reuse an existing automation patient and never save.
//
// App rules this suite relies on (observed 2026-09-26, see README DIAG-BR07/BR09–BR12):
// - the app adds tube charges (Vacutainer …, Urine C/S Pot) as extra rows; they count in Sub Total;
// - discounts apply to "Discountable(TK)" only: tests with isDiscountAllow in the master;
// - General Discount is capped at 15% of Discountable (more → Disc(Tk) resets to 0);
// - Payment (Cash) is pre-filled with Net Payable; Due = Net Payable − Cash.

const REALISTIC = testItems(TEST_SETS.realistic); // CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray
const TWO_TESTS = testItems(TEST_SETS.pairA); // CBC, FBS
const DISCOUNTABLE = sumDiscountable(REALISTIC);

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

    await saveAndVerify(context, api, test.info(), entry, uhid);
    const billed = await testsForPatient(api, uhid);
    test.info().annotations.push({ type: 'billed tests', description: billed.join(', ') });
    for (const t of REALISTIC) expect.soft(billed, `${t.name} on the invoice`).toContain(t.name);
  });

  test('INV-AUTO-005 percentage discount is calculated and reflected', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);
    const pct = 10;
    await entry.setDiscountPercent(pct);

    const t = await entry.totals();
    expect(t.discountable, 'Discountable = tests with isDiscountAllow').toBe(DISCOUNTABLE);
    expect(t.discountTk, `${pct}% of ${DISCOUNTABLE}`).toBe(Math.round((DISCOUNTABLE * pct) / 100));
    expect(t.netPayable, 'Net = Sub Total − Discount').toBe(t.subTotal - t.discountTk);
    expect(t.cash, 'cash pre-filled with net').toBe(t.netPayable);

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'due on the invoice').toBe(0);
    expect(saved.debit - saved.credit, 'ledger balance (debits − credits) = due').toBe(0);
    const discountLine = saved.ledger.find((l) => /disc/i.test(l.description));
    expect.soft(discountLine, 'a discount line in the ledger').toBeTruthy();
    expect.soft(discountLine?.credit, 'discount credited in the ledger').toBe(t.discountTk);
  });

  test('INV-AUTO-006 full payment → Status Paid, Due 0', async ({ context, api }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, TWO_TESTS);
    const t = await entry.totals();
    expect(t.cash, 'cash = net (full payment)').toBe(t.netPayable);
    expect(t.due).toBe(0);

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
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

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'due on the invoice').toBe(net - paid);
    expect(saved.debit - saved.credit, 'ledger balance = due').toBe(net - paid);
    expect(saved.row.status, 'dashboard status').toMatch(/due/i);
  });

  test('INV-AUTO-008 discount + full payment → Paid; Total/Discount/Paid/Due correct', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);
    await entry.setDiscountPercent(10);
    const t = await entry.totals();
    expect(t.netPayable, 'Net = Total − Discount').toBe(t.subTotal - t.discountTk);
    expect(t.cash, 'full discounted amount paid').toBe(t.netPayable);
    expect(t.due).toBe(0);

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    const credit = (re: RegExp) =>
      saved.ledger.filter((l) => re.test(l.description)).reduce((s, l) => s + l.credit, 0);
    expect(saved.debit, 'ledger total (Service Cost)').toBe(t.subTotal);
    expect(credit(/disc/i), 'ledger discount').toBe(t.discountTk);
    expect(credit(/payment/i), 'ledger paid').toBe(t.netPayable);
    expect(saved.invoice.dueAmount, 'invoice due').toBe(0);
    expect(saved.row.status, 'dashboard status').toBe('Paid');
  });

  test('INV-AUTO-009 discount + partial payment → Due from the discounted total', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, REALISTIC);
    await entry.setDiscountPercent(10);
    const net = (await entry.totals()).netPayable;
    const paid = net - 500;
    await entry.setCash(paid);
    const t = await entry.totals();
    expect(t.due, 'Due = discounted Net − Paid').toBe(t.netPayable - paid);

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'invoice due').toBe(t.due);
    expect(saved.debit - saved.credit, 'ledger balance = due').toBe(t.due);
    expect(saved.row.status, 'dashboard status').toMatch(/due/i);
  });

  test('INV-AUTO-016 zero payment → saved as Due for the full amount, never Paid', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, TWO_TESTS);
    await entry.setCash(0);
    const t = await entry.totals();
    expect(t.cash, 'cash').toBe(0);
    expect(t.due, 'UI due = whole net').toBe(t.netPayable);

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.invoice.dueAmount, 'invoice due = net').toBe(t.netPayable);
    expect(saved.row.status, 'dashboard status is not Paid').not.toBe('Paid');
    expect(saved.row.status, 'dashboard status').toMatch(/due/i);
  });

  test('INV-AUTO-017 payment greater than payable is not accepted (form only, no save)', async ({
    context,
    api,
  }) => {
    const [patient] = await existingAutomationPatients(api, 1);
    const entry = await openEntry(context, patient.uhid, TWO_TESTS);
    const net = (await entry.totals()).netPayable;
    await entry.watchMessages();
    await entry.setCash(net + 500);
    const t = await entry.totals();
    const messages = await entry.messages();
    test
      .info()
      .annotations.push(
        { type: 'typed', description: `cash ${net + 500} against net ${net}` },
        { type: 'form after', description: formatTotals(t) },
        { type: 'messages', description: messages.map((m) => m.text).join(' | ') || '(none)' },
      );
    expect(t.cash, 'cash never exceeds net payable').toBeLessThanOrEqual(net);
    expect(t.due, 'due is never negative').toBeGreaterThanOrEqual(0);
  });

  test('INV-AUTO-018 discount greater than total is not accepted (form only, no save)', async ({
    context,
    api,
  }) => {
    const [patient] = await existingAutomationPatients(api, 1);
    const entry = await openEntry(context, patient.uhid, REALISTIC);
    const before = await entry.totals();
    await entry.watchMessages();
    await entry.setDiscountTk(before.subTotal + 100);
    const t = await entry.totals();
    const messages = await entry.messages();
    test.info().annotations.push(
      {
        type: 'typed',
        description: `discount ${before.subTotal + 100} Tk against total ${before.subTotal}`,
      },
      { type: 'form after', description: formatTotals(t) },
      { type: 'messages', description: messages.map((m) => m.text).join(' | ') || '(none)' },
    );
    expect(t.discountTk, 'discount stays within the cap').toBeLessThanOrEqual(
      (t.discountable * MAX_DISCOUNT_PERCENT) / 100,
    );
    expect(t.netPayable, 'net payable never negative').toBeGreaterThan(0);
    expect(t.netPayable, 'net = total − accepted discount').toBe(t.subTotal - t.discountTk);
  });

  test('INV-AUTO-019 tests with different prices: each price and the grand total are correct', async ({
    context,
    api,
  }) => {
    const items = testItems(TEST_SETS.priced); // CBC, FBS, TSH, X-Ray
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, items);
    const rows = await entry.gridRows();
    for (const t of items)
      expect.soft(rows.find((r) => r.name === t.name)?.rate, `${t.name} price`).toBe(t.rate);
    const t = await entry.totals();
    expect(t.subTotal, 'grand total = sum of all rows').toBe(rows.reduce((s, r) => s + r.total, 0));

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.debit, 'ledger Service Cost = grand total').toBe(t.subTotal);
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

    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
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
