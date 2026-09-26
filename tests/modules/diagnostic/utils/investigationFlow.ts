import { expect } from '@playwright/test';
import type { APIRequestContext, BrowserContext, Page, TestInfo } from '@playwright/test';
import data from '../data/investigation-tests.json';
import { InvestigationEntryPage, type Totals } from '../pages/InvestigationEntryPage';
import { InvestigationDashboardPage } from '../pages/InvestigationDashboardPage';
import { invoiceForPatient, invoiceLedger } from './investigationApi';
import {
  PatientRegistrationPage,
  type PatientData,
} from '../../registration/pages/PatientRegistrationPage';
import { randomPatient } from '../../registration/utils/patientData';

export type TestKey = keyof typeof data.tests;
export interface TestItem {
  query: string;
  name: string;
  rate: number;
  discountable: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pick = (d: { query: string; name: string }) => ({
  query: d.query,
  match: new RegExp(escapeRe(d.name)),
});

export const AREA = pick(data.area);
export const DOCTOR = pick(data.doctor);
/** A second referring doctor, for "different Ref. Doctor" cases. */
export const OTHER_DOCTOR = pick(data.otherDoctor);
export const TEST_SETS = data.sets as Record<keyof typeof data.sets, TestKey[]>;
export const ALL_TESTS: TestItem[] = Object.values(data.tests);
/** General Discount cap, as a percentage of Discountable(TK). */
export const MAX_DISCOUNT_PERCENT = data.discount.maxPercent;

export const testItems = (keys: TestKey[]): TestItem[] => keys.map((k) => data.tests[k]);
export const sumRates = (items: TestItem[]) => items.reduce((s, t) => s + t.rate, 0);
export const sumDiscountable = (items: TestItem[]) =>
  items.filter((t) => t.discountable).reduce((s, t) => s + t.rate, 0);

/** Register a fresh patient through the registration module; returns UHID + name. */
export async function registerPatient(
  context: BrowserContext,
  overrides: Partial<PatientData> = {},
) {
  const reg = new PatientRegistrationPage(await context.newPage());
  const patient = { ...randomPatient(), ...overrides };
  await reg.gotoList();
  await reg.openAddNew();
  await reg.fillForm(patient);
  const uhid = await reg.confirm();
  await reg.page.close();
  return { uhid, fullName: patient.fullName, mobile: patient.mobile };
}

/**
 * Open the entry page (optionally on an existing page) with patient, area, doctor and tests
 * filled in, ready to POST. Accepts any JS dialog the app raises.
 */
export async function openEntry(
  pageOrContext: Page | BrowserContext,
  uhid: string,
  items: TestItem[],
  { navigate = true, doctor = DOCTOR }: { navigate?: boolean; doctor?: typeof DOCTOR } = {},
) {
  const page = 'newPage' in pageOrContext ? await pageOrContext.newPage() : pageOrContext;
  const entry = new InvestigationEntryPage(page);
  if (navigate) await entry.goto();
  await entry.loadPatient(uhid);
  await entry.selectArea(AREA.query, AREA.match);
  await entry.selectDoctor(doctor.query, doctor.match);
  for (const t of items) await entry.addTest(t.query, t.name);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  return entry;
}

export const formatTotals = (t: Totals) =>
  `sub ${t.subTotal}, discountable ${t.discountable}, disc ${t.discountPercent}% = ${t.discountTk} Tk, net ${t.netPayable}, cash ${t.cash}, due ${t.due}`;

/**
 * Save, then gather the patient's newest invoice from the API (detail + ledger) and its
 * dashboard row, recording everything as annotations. `count` = invoices the patient should
 * have after this save.
 */
export async function saveAndVerify(
  context: BrowserContext,
  api: APIRequestContext,
  info: TestInfo,
  entry: InvestigationEntryPage,
  uhid: string,
  { count = 1, label = '' }: { count?: number; label?: string } = {},
) {
  const totals = await entry.totals();
  const result = await entry.save();
  const said = result.messages.map((m) => `[${m.kind}] ${m.text}`).join(' | ');
  expect(result.saved, `save ${label} — messages: ${said}`).toBe(true);
  const invoice = await invoiceForPatient(api, uhid, count);
  const ledger = await invoiceLedger(api, invoice.id);
  const dashboard = new InvestigationDashboardPage(await context.newPage());
  await dashboard.goto();
  const row = await dashboard.find(invoice.invoiceNo);
  await dashboard.page.close();
  const p = label ? `${label} ` : '';
  info.annotations.push(
    { type: `${p}UI totals at save`, description: formatTotals(totals) },
    {
      type: `${p}invoice`,
      description: `${invoice.invoicePrefix}${invoice.invoiceNo}, entry ${invoice.entryDate}, due ${invoice.dueAmount} (GetInvoiceByInvoiceNo says ${invoice.dueAmountByInvoiceNo}), doctor ${invoice.refDoctorName}`,
    },
    {
      type: `${p}ledger`,
      description: ledger
        .map((l) => `${l.description}: Dr ${l.debit} / Cr ${l.credit}`)
        .join(' · '),
    },
    {
      type: `${p}dashboard`,
      description: `status "${row.status}", ${row.entryDate} ${row.entryTime}, name "${row.fullName}"`,
    },
  );
  const debit = ledger.reduce((s, l) => s + l.debit, 0);
  const credit = ledger.reduce((s, l) => s + l.credit, 0);
  return { totals, invoice, ledger, row, debit, credit, messages: result.messages };
}
