import { test, expect } from '../../../../fixtures/api';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { invoiceCount, settledInvoiceCount } from '../utils/investigationApi';
import {
  TEST_SETS,
  openEntry,
  registerPatient,
  sumRates,
  testItems,
} from '../utils/investigationFlow';

// Duplicate protection on /diagnostic/investigation — test cases: ../testcases/investigation.md
// ⚠️ Each test registers a fresh patient and POSTs one real invoice for them. A fresh patient
// keeps runs independent: the app refuses the same entry for the same patient for 10 minutes.

/** Browser tabs that post the same entry (INV_TABS=2 to run the 2-tab variant). */
const TABS = Number(process.env.INV_TABS ?? 3);
/** Gap between tab clicks in the "almost simultaneous" variation (INV_STAGGER_MS). */
const STAGGER_MS = Number(process.env.INV_STAGGER_MS ?? 300);
const TESTS = testItems(TEST_SETS.multiTab);
const TOTAL = sumRates(TESTS);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** "already saved as FKH…" (race in flight) or "Duplicate entry … already invoiced as FKH…" */
const DUPLICATE = /already (?:saved|invoiced) as (FKH\d+).*not saved again/i;

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

test.describe('Diagnostic · OPD Investigation Entry · duplicate protection', () => {
  test.describe.configure({ timeout: 360_000 });

  for (const v of VARIATIONS) {
    test(`${v.id} ${v.title} creates exactly one invoice`, async ({ context, api }) => {
      const { uhid, fullName } = await registerPatient(context);
      const before = await invoiceCount(api, uhid);
      test
        .info()
        .annotations.push(
          { type: 'patient', description: `UHID ${uhid} ${fullName} (invoices before: ${before})` },
          { type: 'tests', description: `${TESTS.map((t) => t.name).join(' + ')} = ${TOTAL} Tk` },
        );

      // One tab = one page in the same browser context, i.e. the same logged-in user.
      const tabs: InvestigationEntryPage[] = [];
      for (let i = 0; i < TABS; i++) {
        const tab = await openEntry(context, uhid, TESTS);
        // The app adds tube charges itself, so net ≥ tests; cash is pre-filled with the net.
        const t = await tab.totals();
        expect(t.netPayable, 'net payable covers the selected tests').toBeGreaterThanOrEqual(TOTAL);
        expect(t.cash).toBe(t.netPayable);
        tab.page.on('popup', (p) => p.close().catch(() => {}));
        await tab.watchMessages();
        tabs.push(tab);
      }

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
      // In-flight race → info "This invoice was already saved as FKH… It was not saved again.";
      // just after → danger "Duplicate entry: … already invoiced as FKH… not saved again".
      const texts = feedback.map((msgs) => msgs.map((m) => m.text).join(' | '));
      const winner = saved.indexOf(true);
      expect.soft(texts[winner], `tab ${winner + 1} (saved) message`).toMatch(/Successful Save/i);
      const losers = tabs.map((_, i) => i).filter((i) => i !== winner);
      const invoiceNos = losers.map((i) => DUPLICATE.exec(texts[i])?.[1]);
      losers.forEach((i, k) => {
        expect
          .soft(texts[i], `tab ${i + 1} (not saved) shows the duplicate message`)
          .toMatch(DUPLICATE);
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

  test('INV-AUTO-023 double-clicking POST creates only one invoice', async ({ context, api }) => {
    const items = testItems(TEST_SETS.simple);
    const { uhid, fullName } = await registerPatient(context);
    const entry = await openEntry(context, uhid, items);
    const result = await entry.save({ clicks: 2 });
    const created = (await settledInvoiceCount(api, uhid, 0)) - 0;
    test.info().annotations.push(
      { type: 'patient', description: `UHID ${uhid} ${fullName}` },
      {
        type: 'messages',
        description: result.messages.map((m) => `[${m.kind}] ${m.text}`).join(' | ') || '(none)',
      },
      { type: 'result', description: `Created entries = ${created}` },
    );
    expect(created, 'invoices created by a double-click').toBe(1);
    expect.soft(result.saved, 'a "Successful Save!" message was shown').toBe(true);
  });
});
