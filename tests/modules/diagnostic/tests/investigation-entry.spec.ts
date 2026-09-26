import type { BrowserContext } from '@playwright/test';
import { test, expect } from '../../../../fixtures/api';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { invoiceCount, settledInvoiceCount } from '../utils/investigationApi';
import { PatientRegistrationPage } from '../../registration/pages/PatientRegistrationPage';
import { randomPatient } from '../../registration/utils/patientData';

// Test cases: tests/modules/diagnostic/testcases/investigation.md
// ⚠️ Each run registers a fresh patient and POSTs a real investigation invoice for them.
// A fresh patient keeps runs independent: the app silently refuses a repeat POST of the
// same test for the same patient within a few minutes (see README, DIAG-BR06).

/** Browser tabs that post the same entry (INV_TABS=2 to run the 2-tab variant). */
const TABS = Number(process.env.INV_TABS ?? 3);
/** Gap between tab clicks in the "almost simultaneous" variation (INV_STAGGER_MS). */
const STAGGER_MS = Number(process.env.INV_STAGGER_MS ?? 300);
const AREA = { query: 'Sadar', match: /Sadar \(Cox's Bazar\)/ };
const DOCTOR = { query: 'RUPASH', match: /RUPASH PAUL/ };
/** One entry with all three tests (names exactly as the Test search lists them). */
const TESTS = [
  { query: 'CBC', name: 'CBC (Govt. Fixed Rate)', rate: 400 },
  { query: 'RBS', name: 'Random blood Sugar (RBS)', rate: 140 },
  { query: 'Lipid', name: 'Lipid Profile', rate: 800 },
];
const TOTAL = TESTS.reduce((sum, t) => sum + t.rate, 0);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Register a fresh patient through the registration module; returns the UHID. */
async function registerPatient(context: BrowserContext) {
  const reg = new PatientRegistrationPage(await context.newPage());
  const patient = randomPatient();
  await reg.gotoList();
  await reg.openAddNew();
  await reg.fillForm(patient);
  const uhid = await reg.confirm();
  await reg.page.close();
  return { uhid, fullName: patient.fullName };
}

/** Open `TABS` tabs (same session) with the identical entry filled in, ready to save. */
async function openFilledTabs(context: BrowserContext, uhid: string) {
  const tabs: InvestigationEntryPage[] = [];
  for (let i = 0; i < TABS; i++) {
    const tab = new InvestigationEntryPage(await context.newPage());
    await tab.goto();
    await tab.loadPatient(uhid);
    await tab.selectArea(AREA.query, AREA.match);
    await tab.selectDoctor(DOCTOR.query, DOCTOR.match);
    for (const t of TESTS) await tab.addTest(t.query, t.name);
    // The app adds tube charges on its own (Vacutainer Needle / Gray / Red 4ml), so the
    // net is the tests plus those; cash is pre-filled with the full net (due 0).
    const net = Number((await tab.netPayable.inputValue()).replace(/,/g, ''));
    expect(net, 'net payable covers the selected tests').toBeGreaterThanOrEqual(TOTAL);
    await expect(tab.cashPayment).toHaveValue(String(net));
    if (i === 0) {
      test.info().annotations.push({
        type: 'bill',
        description: `${await tab.rows.count()} rows, net ${net} Tk (tests ${TOTAL} + auto charges ${net - TOTAL})`,
      });
    }
    // A successful POST opens the invoice print in a popup — close it so it can't block the run.
    tab.page.on('dialog', (d) => d.accept().catch(() => {}));
    tab.page.on('popup', (p) => p.close().catch(() => {}));
    tabs.push(tab);
  }
  return tabs;
}

const VARIATIONS = [
  {
    id: 'INV-AUTO-001',
    title: `same entry saved from ${TABS} tabs at the same moment`,
    delayFor: () => 0,
  },
  {
    id: 'INV-AUTO-002',
    title: `same entry saved from ${TABS} tabs almost simultaneously (${STAGGER_MS} ms apart)`,
    delayFor: (i: number) => i * STAGGER_MS,
  },
];

test.describe('Diagnostic · OPD Investigation Entry · multi-tab duplicate prevention', () => {
  for (const v of VARIATIONS) {
    test(`${v.id} ${v.title} creates exactly one invoice`, async ({ context, api }) => {
      test.setTimeout(360_000);
      const { uhid, fullName } = await registerPatient(context);
      const before = await invoiceCount(api, uhid);
      test
        .info()
        .annotations.push(
          { type: 'patient', description: `UHID ${uhid} ${fullName} (invoices before: ${before})` },
          { type: 'tests', description: `${TESTS.map((t) => t.name).join(' + ')} = ${TOTAL} Tk` },
        );

      const tabs = await openFilledTabs(context, uhid);
      for (const tab of tabs) await tab.watchMessages();

      // Tab 1 saves at T1; the others at T1 + i × delay, then watch every tab.
      const t1 = Date.now();
      const clickedAt: number[] = [];
      await Promise.all(
        tabs.map(async (tab, i) => {
          await sleep(v.delayFor(i));
          clickedAt[i] = Date.now() - t1;
          await tab.post.click({ noWaitAfter: true });
        }),
      );
      const feedback = await Promise.all(tabs.map((tab) => tab.collectFeedback()));

      const saved: boolean[] = [];
      for (const [i, tab] of tabs.entries()) {
        saved.push(await tab.isCleared());
        test.info().annotations.push({
          type: `tab ${i + 1}`,
          description: `clicked at T1+${clickedAt[i]} ms; ${saved[i] ? 'saved (form cleared)' : 'not saved'}; ${feedback[i].map((m) => `[${m.kind}] ${m.text}`).join(' | ') || '(no message)'}`,
        });
        await test.info().attach(`tab-${i + 1}-after-save.png`, {
          body: await tab.page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        });
      }

      const created = (await settledInvoiceCount(api, uhid, before)) - before;
      const duplicates = Math.max(created - 1, 0);
      const summary = tabs
        .map((_, i) => `[tab ${i + 1} @+${clickedAt[i]}ms] ${saved[i] ? 'saved' : 'not saved'}`)
        .join(' ');
      test.info().annotations.push({
        type: 'result',
        description: `Created entries = ${created}, duplicate entries = ${duplicates}`,
      });

      expect(created, `created entries for UHID ${uhid}. ${summary}`).toBe(1);
      expect(duplicates, `duplicate entries. ${summary}`).toBe(0);
      expect(saved.filter(Boolean), `tabs that saved. ${summary}`).toHaveLength(1);

      // The saving tab says so; every other tab says it was a duplicate of that invoice.
      // Two wordings exist: a POST racing the save in flight gets an info snackbar
      // ("This invoice was already saved as FKH… It was not saved again."), a POST after
      // it gets a danger one ("Duplicate entry: … already invoiced as FKH… not saved again").
      const texts = feedback.map((msgs) => msgs.map((m) => m.text).join(' | '));
      const winner = saved.indexOf(true);
      expect.soft(texts[winner], `tab ${winner + 1} (saved) message`).toMatch(/Successful Save/i);
      const losers = tabs.map((_, i) => i).filter((i) => i !== winner);
      const invoiceNos = losers.map(
        (i) => /already (?:saved|invoiced) as (FKH\d+)/i.exec(texts[i])?.[1],
      );
      losers.forEach((i, k) => {
        expect
          .soft(texts[i], `tab ${i + 1} (not saved) shows the duplicate message`)
          .toMatch(/already (?:saved|invoiced) as FKH\d+.*not saved again/i);
        expect
          .soft(invoiceNos[k], `tab ${i + 1} names the invoice that was saved`)
          .toBe(invoiceNos[0]);
      });
      test.info().annotations.push({
        type: 'invoice',
        description: `${invoiceNos[0] ?? '(not named)'} saved by tab ${winner + 1}`,
      });
    });
  }
});
