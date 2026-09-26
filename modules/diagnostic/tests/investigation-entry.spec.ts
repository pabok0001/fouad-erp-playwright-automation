import { test, expect } from '../../../fixtures/api';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { invoiceCount, settledInvoiceCount } from '../utils/investigationApi';
import { PatientRegistrationPage } from '../../registration/pages/PatientRegistrationPage';
import { randomPatient } from '../../registration/utils/patientData';

// Test cases: modules/diagnostic/testcases/investigation.md
// ⚠️ Each run registers a fresh patient and POSTs a real investigation invoice for them.
// A fresh patient keeps runs independent: the app silently refuses a repeat POST of the
// same test for the same patient within a few minutes (see README, DIAG-BR06).

/** Browser tabs that post the same entry at once (INV_TABS=2 to run the 2-tab variant). */
const TABS = Number(process.env.INV_TABS ?? 3);
const AREA = { query: 'Sadar', match: /Sadar \(Cox's Bazar\)/ };
const DOCTOR = { query: 'RUPASH', match: /RUPASH PAUL/ };
const TEST_ITEM = { query: 'CBC', label: 'CBC (Govt. Fixed Rate)' };

test.describe('Diagnostic · OPD Investigation Entry', () => {
  test(`INV-AUTO-001 same entry posted from ${TABS} tabs at once creates only one invoice`, async ({
    context,
    api,
  }) => {
    test.setTimeout(300_000);

    // Fresh patient for this run.
    const reg = new PatientRegistrationPage(await context.newPage());
    const patient = randomPatient();
    await reg.gotoList();
    await reg.openAddNew();
    await reg.fillForm(patient);
    const uhid = await reg.confirm();
    await reg.page.close();
    const before = await invoiceCount(api, uhid);
    test.info().annotations.push({
      type: 'patient',
      description: `UHID ${uhid} ${patient.fullName} (invoices before: ${before})`,
    });

    // One tab = one page in the same browser context, i.e. the same logged-in user.
    const tabs: InvestigationEntryPage[] = [];
    for (let i = 0; i < TABS; i++) {
      const tab = new InvestigationEntryPage(await context.newPage());
      await tab.goto();
      await tab.loadPatient(uhid);
      await tab.selectArea(AREA.query, AREA.match);
      await tab.selectDoctor(DOCTOR.query, DOCTOR.match);
      await tab.addTest(TEST_ITEM.query, TEST_ITEM.label);
      await expect(tab.netPayable).not.toHaveValue('0');
      await expect(tab.cashPayment).toHaveValue(await tab.netPayable.inputValue());
      // A successful POST opens the invoice print in a popup — close it so it can't block the run.
      tab.page.on('dialog', (d) => d.accept().catch(() => {}));
      tab.page.on('popup', (p) => p.close().catch(() => {}));
      tabs.push(tab);
    }

    // Fire every POST at the same moment, then watch each tab for its response.
    await Promise.all(tabs.map((tab) => tab.post.click({ noWaitAfter: true })));
    const feedback = await Promise.all(tabs.map((tab) => tab.collectFeedback()));
    const cleared: boolean[] = [];
    for (const [i, tab] of tabs.entries()) {
      cleared.push(await tab.isCleared());
      test.info().annotations.push({
        type: `tab ${i + 1}`,
        description: `${cleared[i] ? 'form cleared (saved)' : 'form NOT cleared'}; messages: ${feedback[i].join(' | ') || '(none)'}`,
      });
      await test.info().attach(`tab-${i + 1}-after-post.png`, {
        body: await tab.page.screenshot({ fullPage: true }),
        contentType: 'image/png',
      });
    }

    const after = await settledInvoiceCount(api, uhid, before);
    const summary = tabs
      .map(
        (_, i) =>
          `[${i + 1}] ${cleared[i] ? 'saved' : 'not saved'}: ${feedback[i].join(' | ') || '-'}`,
      )
      .join(' ');
    expect(
      after - before,
      `invoices created for UHID ${uhid} by ${TABS} simultaneous POSTs (before ${before}, after ${after}). Tabs: ${summary}`,
    ).toBe(1);
    expect(cleared.filter(Boolean), `tabs whose form was cleared (saved): ${summary}`).toHaveLength(
      1,
    );
  });
});
