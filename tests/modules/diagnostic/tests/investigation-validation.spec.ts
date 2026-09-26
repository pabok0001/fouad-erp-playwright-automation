import { test, expect } from '../../../../fixtures/api';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { existingAutomationPatients, invoiceCount, invoicesToday } from '../utils/investigationApi';
import { AREA, DOCTOR, TEST_SETS, openEntry, testItems } from '../utils/investigationFlow';

// Mandatory-field validation on /diagnostic/investigation — test cases: ../testcases/investigation.md
// These POST an incomplete entry, which must NOT create an invoice. They reuse an existing
// automation patient (no registration) and check invoice counts before/after.

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe('Diagnostic · OPD Investigation Entry · mandatory fields', () => {
  test.describe.configure({ timeout: 180_000 });

  test('INV-AUTO-014 no patient selected → validation, no invoice', async ({ page, api }) => {
    const entry = new InvestigationEntryPage(page);
    await entry.goto();
    await entry.selectArea(AREA.query, AREA.match);
    await entry.selectDoctor(DOCTOR.query, DOCTOR.match);
    for (const t of testItems(TEST_SETS.simple)) await entry.addTest(t.query, t.name);
    const before = await invoicesToday(api);

    const result = await entry.save();
    await sleep(8_000); // give a wrongly accepted save time to reach the list
    const after = await invoicesToday(api);
    const invalid = await entry.invalidFields();
    test.info().annotations.push(
      {
        type: 'messages',
        description: result.messages.map((m) => `[${m.kind}] ${m.text}`).join(' | ') || '(none)',
      },
      { type: 'fields marked invalid', description: invalid.join(', ') || '(none)' },
      { type: "today's invoices before/after", description: `${before} → ${after}` },
    );

    expect(result.saved, 'no "Successful Save!"').toBe(false);
    expect(after, 'no new invoice today').toBe(before);
    expect(
      invalid.length + result.messages.filter((m) => m.kind !== 'success').length,
      'the user is told what is missing (invalid field or message)',
    ).toBeGreaterThan(0);
  });

  test('INV-AUTO-015 patient selected but no test → validation, no invoice', async ({
    context,
    api,
  }) => {
    const [patient] = await existingAutomationPatients(api, 1);
    const entry = await openEntry(context, patient.uhid, []);
    const before = await invoiceCount(api, patient.uhid);

    const result = await entry.save();
    await sleep(8_000);
    const after = await invoiceCount(api, patient.uhid);
    const invalid = await entry.invalidFields();
    test.info().annotations.push(
      { type: 'patient', description: `UHID ${patient.uhid} ${patient.fullName}` },
      {
        type: 'messages',
        description: result.messages.map((m) => `[${m.kind}] ${m.text}`).join(' | ') || '(none)',
      },
      { type: 'fields marked invalid', description: invalid.join(', ') || '(none)' },
      { type: 'patient invoices before/after', description: `${before} → ${after}` },
    );

    expect(result.saved, 'no "Successful Save!"').toBe(false);
    expect(after, 'no new invoice for the patient').toBe(before);
    expect(
      invalid.length + result.messages.filter((m) => m.kind !== 'success').length,
      'the user is told a test is required (invalid field or message)',
    ).toBeGreaterThan(0);
  });
});
