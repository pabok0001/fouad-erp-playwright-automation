import { test, expect } from '../../../../fixtures/api';
import {
  existingAutomationPatients,
  invoiceCount,
  invoiceForPatient,
  settledInvoiceCount,
  testsForPatient,
} from '../utils/investigationApi';
import {
  OTHER_DOCTOR,
  TEST_SETS,
  openEntry,
  registerPatient,
  saveAndVerify,
  testItems,
} from '../utils/investigationFlow';

// Data integrity on /diagnostic/investigation — test cases: ../testcases/investigation.md
// ⚠️ Tests that save register fresh patients and create real invoices; 021/022 only use the
// form on existing automation patients and never save.

const CBC = testItems(['CBC']);
const FBS = testItems(['FBS']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('Diagnostic · OPD Investigation Entry · data integrity', () => {
  test.describe.configure({ timeout: 360_000 });

  test('INV-AUTO-003 same patient, different tests (CBC, then FBS) → two valid invoices', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    await saveAndVerify(context, api, test.info(), await openEntry(context, uhid, CBC), uhid, {
      label: 'CBC',
    });
    await saveAndVerify(context, api, test.info(), await openEntry(context, uhid, FBS), uhid, {
      count: 2,
      label: 'FBS',
    });
    const billed = await testsForPatient(api, uhid);
    expect(billed).toContain('CBC (Govt. Fixed Rate)');
    expect(billed).toContain('Fasting Blood Sugar(FBS)');
  });

  test('INV-AUTO-013 same patient + test, different Ref. Doctor → handled per the duplicate rule', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    const first = await saveAndVerify(
      context,
      api,
      test.info(),
      await openEntry(context, uhid, CBC),
      uhid,
      { label: 'doctor 1' },
    );
    const second = await openEntry(context, uhid, CBC, { doctor: OTHER_DOCTOR });
    const result = await second.save();
    const count = await settledInvoiceCount(api, uhid, 1, { timeoutMs: 15_000, settleMs: 5_000 });
    const text = result.messages.map((m) => m.text).join(' | ');
    const created = count === 2;
    /* eslint-disable playwright/no-conditional-in-test -- the rule is unconfirmed: the test
       accepts either outcome and checks that the one that happened is consistent. */
    const newest = created ? await invoiceForPatient(api, uhid, 2) : null;
    test.info().annotations.push(
      {
        type: 'doctor 2 save',
        description: `${created ? 'created' : 'not created'} — ${text || '(no message)'}`,
      },
      {
        type: 'outcome (rule to confirm)',
        description: created
          ? `separate invoice ${newest?.invoiceNo} for ${newest?.refDoctorName}`
          : `blocked as a duplicate of ${first.invoice.invoicePrefix}${first.invoice.invoiceNo}`,
      },
    );
    // Either outcome is acceptable per the test case, as long as it is consistent:
    // a new invoice carries the new doctor, or a refusal names the existing invoice.
    const consistent = created
      ? Boolean(newest && OTHER_DOCTOR.match.test(newest.refDoctorName))
      : new RegExp(`FKH${first.invoice.invoiceNo}`).test(text);
    /* eslint-enable playwright/no-conditional-in-test */
    expect(consistent, `consistent outcome: ${text}`).toBe(true);
    expect(count, 'never more than one extra invoice').toBeLessThanOrEqual(2);
  });

  test('INV-AUTO-020 a test removed before save is not billed', async ({ context, api }) => {
    const items = testItems(['CBC', 'FBS', 'TSH']);
    const { uhid } = await registerPatient(context);
    const entry = await openEntry(context, uhid, items);
    const before = await entry.totals();
    await entry.removeTest('Fasting Blood Sugar(FBS)');
    const after = await entry.totals();
    const rows = await entry.gridRows();
    test.info().annotations.push({
      type: 'grid after removing FBS',
      description: `${rows.map((r) => `${r.name} ${r.total}`).join(', ')}; sub ${before.subTotal} → ${after.subTotal}`,
    });
    expect(after.subTotal, 'sub total drops by at least the FBS rate').toBeLessThanOrEqual(
      before.subTotal - 140,
    );

    await saveAndVerify(context, api, test.info(), entry, uhid);
    const billed = await testsForPatient(api, uhid);
    test.info().annotations.push({ type: 'billed', description: billed.join(', ') });
    expect(billed, 'FBS not on the invoice').not.toContain('Fasting Blood Sugar(FBS)');
    expect(billed).toContain('CBC (Govt. Fixed Rate)');
    expect(billed).toContain('TSH');
    // FBS brought the grey (fluoride) tube; with FBS gone that charge should go too.
    expect
      .soft(billed, "FBS's tube charge (Vacutainer Gray) removed with it")
      .not.toContain('Vacutainer Gray');
  });

  test('INV-AUTO-021 changing the patient does not carry the previous patient’s tests', async ({
    context,
    api,
  }) => {
    const [a, b] = await existingAutomationPatients(api, 2);
    const entry = await openEntry(context, a.uhid, testItems(TEST_SETS.pairA));
    const rowsA = (await entry.gridRows()).map((r) => r.name);
    const nameB = await entry.loadPatient(b.uhid);
    const rowsB = (await entry.gridRows()).map((r) => r.name);
    test.info().annotations.push(
      { type: 'patient A', description: `${a.uhid} ${a.fullName}: ${rowsA.join(', ')}` },
      {
        type: 'after switching to B',
        description: `${b.uhid} ${nameB}: ${rowsB.join(', ') || '(empty grid)'}`,
      },
    );
    expect(nameB, 'form now shows patient B').toBe(b.fullName);
    expect(rowsB, "patient A's tests are not left on patient B's entry").toEqual([]);
  });

  test('INV-AUTO-022 refreshing before save clears the form and creates nothing', async ({
    context,
    api,
  }) => {
    const [patient] = await existingAutomationPatients(api, 1);
    const before = await invoiceCount(api, patient.uhid);
    const entry = await openEntry(context, patient.uhid, testItems(TEST_SETS.pairA));
    await entry.page.reload();
    await expect(entry.post).toBeVisible();
    await sleep(5_000);
    await expect(entry.uhid, 'UHID cleared').toHaveValue('');
    await expect(entry.fullName, 'patient cleared').toHaveValue('');
    await expect(entry.rows, 'no tests left').toHaveCount(0);
    expect(await invoiceCount(api, patient.uhid), 'no invoice created').toBe(before);
  });

  test('INV-AUTO-027 different patients, same test → one valid invoice each', async ({
    context,
    api,
  }) => {
    const a = await registerPatient(context);
    const b = await registerPatient(context);
    await saveAndVerify(context, api, test.info(), await openEntry(context, a.uhid, CBC), a.uhid, {
      label: 'patient A',
    });
    await saveAndVerify(context, api, test.info(), await openEntry(context, b.uhid, CBC), b.uhid, {
      label: 'patient B',
    });
    expect(await invoiceCount(api, a.uhid), 'patient A invoices').toBe(1);
    expect(await invoiceCount(api, b.uhid), 'patient B invoices').toBe(1);
  });

  test('INV-AUTO-028 same patient, new test combination (CBC+FBS, then TSH+Lipid) → new invoice', async ({
    context,
    api,
  }) => {
    const { uhid } = await registerPatient(context);
    await saveAndVerify(
      context,
      api,
      test.info(),
      await openEntry(context, uhid, testItems(TEST_SETS.pairA)),
      uhid,
      { label: 'CBC+FBS' },
    );
    await saveAndVerify(
      context,
      api,
      test.info(),
      await openEntry(context, uhid, testItems(TEST_SETS.pairB)),
      uhid,
      { count: 2, label: 'TSH+Lipid' },
    );
    const billed = await testsForPatient(api, uhid);
    for (const name of [
      'CBC (Govt. Fixed Rate)',
      'Fasting Blood Sugar(FBS)',
      'TSH',
      'Lipid Profile',
    ])
      expect.soft(billed, `${name} billed`).toContain(name);
  });

  test('INV-AUTO-029 special characters in patient data are saved and shown intact', async ({
    context,
    api,
  }) => {
    const stamp = Date.now().toString().slice(-6);
    const fullName = `Nur-E-Alam O'Brien (Jr.) & Sons AT${stamp}`;
    const { uhid } = await registerPatient(context, {
      fullName,
      fatherName: 'Md. Abdul-Karim (Late)',
      address: `House #12/B, Road-3 "Kolatoli", Cox's Bazar & Co.`,
    });
    const entry = await openEntry(context, uhid, CBC);
    await expect(entry.fullName, 'entry form name').toHaveValue(fullName);
    const saved = await saveAndVerify(context, api, test.info(), entry, uhid);
    expect(saved.invoice.fullName, 'invoice name').toBe(fullName);
    expect(saved.row.fullName, 'dashboard name').toContain(fullName);
  });
});
