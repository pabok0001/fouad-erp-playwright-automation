import type { BrowserContext, Page } from '@playwright/test';
import data from '../data/investigation-tests.json';
import { InvestigationEntryPage } from '../pages/InvestigationEntryPage';
import { PatientRegistrationPage } from '../../registration/pages/PatientRegistrationPage';
import { randomPatient } from '../../registration/utils/patientData';

export type TestKey = keyof typeof data.tests;
export interface TestItem {
  query: string;
  name: string;
  rate: number;
  discountable: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const AREA = { query: data.area.query, match: new RegExp(escapeRe(data.area.name)) };
export const DOCTOR = { query: data.doctor.query, match: new RegExp(escapeRe(data.doctor.name)) };
export const TEST_SETS = data.sets as Record<keyof typeof data.sets, TestKey[]>;
export const ALL_TESTS: TestItem[] = Object.values(data.tests);
/** General Discount cap, as a percentage of Discountable(TK). */
export const MAX_DISCOUNT_PERCENT = data.discount.maxPercent;

export const testItems = (keys: TestKey[]): TestItem[] => keys.map((k) => data.tests[k]);
export const sumRates = (items: TestItem[]) => items.reduce((s, t) => s + t.rate, 0);
export const sumDiscountable = (items: TestItem[]) =>
  items.filter((t) => t.discountable).reduce((s, t) => s + t.rate, 0);

/** Register a fresh patient through the registration module; returns UHID + name. */
export async function registerPatient(context: BrowserContext) {
  const reg = new PatientRegistrationPage(await context.newPage());
  const patient = randomPatient();
  await reg.gotoList();
  await reg.openAddNew();
  await reg.fillForm(patient);
  const uhid = await reg.confirm();
  await reg.page.close();
  return { uhid, fullName: patient.fullName, mobile: patient.mobile };
}

/**
 * Open the entry page (optionally on an existing page) with patient, area, doctor and tests
 * filled in, ready to POST. Closes the post-save invoice window automatically.
 */
export async function openEntry(
  pageOrContext: Page | BrowserContext,
  uhid: string,
  items: TestItem[],
  { navigate = true }: { navigate?: boolean } = {},
) {
  const page = 'newPage' in pageOrContext ? await pageOrContext.newPage() : pageOrContext;
  const entry = new InvestigationEntryPage(page);
  if (navigate) await entry.goto();
  await entry.loadPatient(uhid);
  await entry.selectArea(AREA.query, AREA.match);
  await entry.selectDoctor(DOCTOR.query, DOCTOR.match);
  for (const t of items) await entry.addTest(t.query, t.name);
  page.on('dialog', (d) => d.accept().catch(() => {}));
  return entry;
}
