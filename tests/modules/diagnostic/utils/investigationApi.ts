import { APIRequestContext, expect } from '@playwright/test';
import { apiPath } from '../../../../utils/apiAuth';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
