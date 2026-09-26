import { APIRequestContext, expect } from '@playwright/test';
import { apiPath } from '../../../../utils/apiAuth';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Server clock minus this machine's clock, in ms, from the HTTP `Date` header (1 s precision).
 * The app stamps entries with the server clock — on 2026-09-26 it ran 79 s behind this PC —
 * so time checks must compare against server time, not the local clock.
 */
export async function serverClockOffsetMs(api: APIRequestContext): Promise<number> {
  const before = Date.now();
  const res = await api.get(apiPath('InvoiceTypes'));
  const after = Date.now();
  const header = res.headers()['date'];
  expect(header, 'API response Date header').toBeTruthy();
  // The header truncates to the second; +500 ms centres it.
  return new Date(header).getTime() + 500 - (before + after) / 2;
}

/**
 * Patients the registration automation created ("… At123456") in the last `days` — for
 * tests that never save, so they needn't register a new patient.
 */
export async function existingAutomationPatients(
  api: APIRequestContext,
  count: number,
  days = 30,
): Promise<{ uhid: string; fullName: string }[]> {
  const res = await api.post(apiPath('RegRecord/GetByRegDates'), {
    data: {
      fromDate: new Date(Date.now() - days * 86_400_000).toISOString(),
      toDate: new Date().toISOString(),
    },
  });
  await expect(res, 'GetByRegDates').toBeOK();
  const found = (((await res.json()).data ?? []) as { uhid: number; fullName: string }[])
    .filter((p) => /At\d{6}$/i.test(p.fullName ?? ''))
    .slice(0, count)
    .map((p) => ({ uhid: String(p.uhid), fullName: p.fullName }));
  expect(found, `${count} automation patients from the last ${days} days`).toHaveLength(count);
  return found;
}

/** Number of invoices entered today (all users) — for tests with no patient to count by. */
export async function invoicesToday(api: APIRequestContext): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000 - 1);
  const res = await api.post(apiPath('InvestigationInvoice/GetInvoiceByStartAndEndDate'), {
    data: { startTime: start.toISOString(), endTime: end.toISOString(), flag: 0, dueFlag: 0 },
  });
  await expect(res, 'GetInvoiceByStartAndEndDate').toBeOK();
  return (((await res.json()).data ?? []) as unknown[]).length;
}

/** Number of investigation invoices on record for a UHID. */
export async function invoiceCount(api: APIRequestContext, uhid: number | string): Promise<number> {
  const res = await api.post(apiPath('InvestigationInvoice/GetInvoiceByUHID'), {
    data: { uhid: Number(uhid) },
  });
  await expect(res, 'GetInvoiceByUHID').toBeOK();
  return (((await res.json()).data ?? []) as unknown[]).length;
}

/**
 * Invoice count after concurrent POSTs have had time to land: polls until the count rises
 * above `before` (or `timeoutMs` passes), then waits `settleMs` more so late duplicates
 * from slower tabs are counted too.
 */
export async function settledInvoiceCount(
  api: APIRequestContext,
  uhid: number | string,
  before: number,
  { timeoutMs = 45_000, settleMs = 10_000 } = {},
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline && (await invoiceCount(api, uhid)) <= before) await sleep(3_000);
  await sleep(settleMs);
  return invoiceCount(api, uhid);
}

export interface Invoice {
  id: string;
  invoicePrefix: string;
  invoiceNo: number;
  uhid: number;
  /** Server local time without zone, e.g. "2026-09-26T17:54:44.843". */
  entryDate: string;
  /** e.g. "05:54 PM". */
  entryTime: string;
  fullName: string;
  refDoctorName: string;
  entryBy: string;
  /** Due from the date-range list (GetInvoiceByStartAndEndDate) — the correct figure. */
  dueAmount: number;
  /**
   * Due as GetInvoiceByInvoiceNo reports it. ⚠️ Observed 0 even for Due invoices
   * (2026-09-26, FKH26117077/78) — kept only to report the inconsistency.
   */
  dueAmountByInvoiceNo: number;
}

export interface LedgerLine {
  description: string;
  debit: number;
  credit: number;
  tranDate: string;
}

/**
 * The patient's newest invoice, with full detail, once the patient has `count` invoices.
 * Specs register a fresh patient each run, so these are exactly the invoices the test created.
 */
export async function invoiceForPatient(
  api: APIRequestContext,
  uhid: number | string,
  count = 1,
): Promise<Invoice> {
  let list: { id: string; invoiceNo: number }[] = [];
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const res = await api.post(apiPath('InvestigationInvoice/GetInvoiceByUHID'), {
      data: { uhid: Number(uhid) },
    });
    await expect(res, 'GetInvoiceByUHID').toBeOK();
    list = (await res.json()).data ?? [];
    if (list.length >= count) break;
    await sleep(2_000);
  }
  expect(list, `invoices for UHID ${uhid}`).toHaveLength(count);
  const newest = list.reduce((a, b) => (b.invoiceNo > a.invoiceNo ? b : a));
  const res = await api.post(apiPath('InvestigationInvoice/GetInvoiceByInvoiceNo'), {
    data: { invoiceNo: newest.invoiceNo, id: newest.id },
  });
  await expect(res, 'GetInvoiceByInvoiceNo').toBeOK();
  const detail = (await res.json()).data as Omit<Invoice, 'dueAmountByInvoiceNo'>;

  // The due amount comes from the day's invoice list, which reports it correctly.
  const day = new Date(detail.entryDate);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(start.getTime() + 86_400_000 - 1);
  const listRes = await api.post(apiPath('InvestigationInvoice/GetInvoiceByStartAndEndDate'), {
    data: { startTime: start.toISOString(), endTime: end.toISOString(), flag: 0, dueFlag: 0 },
  });
  await expect(listRes, 'GetInvoiceByStartAndEndDate').toBeOK();
  const row = (((await listRes.json()).data ?? []) as { id: string; dueAmount: number }[]).find(
    (r) => r.id === detail.id,
  );
  expect(row, `invoice ${detail.invoiceNo} in the day's list`).toBeTruthy();
  return { ...detail, dueAmount: row!.dueAmount, dueAmountByInvoiceNo: detail.dueAmount };
}

/** Ledger lines of an invoice: "Service Cost" (debit), "Payment(Cash)" (credit), discounts… */
export async function invoiceLedger(
  api: APIRequestContext,
  invoiceId: string,
): Promise<LedgerLine[]> {
  const res = await api.post(apiPath('InvestigationInvoice/GetLedgersByInvoiceId'), {
    data: { invoiceId },
  });
  await expect(res, 'GetLedgersByInvoiceId').toBeOK();
  return (await res.json()).data ?? [];
}

/**
 * Discount flag of each test item in the master (TestItem/GetAllTestItems → isDiscountAllow),
 * keyed "name|rate" — names aren't unique ("Urine C/S" exists at 700 and 1500).
 */
export async function discountAllowed(api: APIRequestContext): Promise<Map<string, boolean>> {
  const res = await api.get(apiPath('TestItem/GetAllTestItems'));
  await expect(res, 'GetAllTestItems').toBeOK();
  const items = ((await res.json()).data ?? []) as {
    name: string | null;
    rate: number;
    isDiscountAllow: boolean;
  }[];
  return new Map(
    items.map((i) => [`${(i.name ?? '').trim().replace(/\*$/, '')}|${i.rate}`, i.isDiscountAllow]),
  );
}

/** Test names billed for a patient (trailing "*" removed). */
export async function testsForPatient(
  api: APIRequestContext,
  uhid: number | string,
): Promise<string[]> {
  const res = await api.post(apiPath('InvestigationInvoice/GetDistinctTestListByUHID'), {
    data: { uhid: Number(uhid) },
  });
  await expect(res, 'GetDistinctTestListByUHID').toBeOK();
  return (((await res.json()).data ?? []) as { name: string }[]).map((t) =>
    t.name.replace(/\*$/, ''),
  );
}
