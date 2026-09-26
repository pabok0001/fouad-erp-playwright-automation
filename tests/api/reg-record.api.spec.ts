import { test, expect } from '../../fixtures/api';
import { apiPath } from '../../utils/apiAuth';

// Read-only checks against patient registration records (RegRecord).
test.describe('API · RegRecord', () => {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const range = { fromDate: since.toISOString(), toDate: new Date().toISOString() };

  test('GetByRegDates returns records for the last 7 days', async ({ api }) => {
    const res = await api.post(apiPath('RegRecord/GetByRegDates'), { data: range });
    await expect(res).toBeOK();
    const body = await res.json();
    expect(body.succeeded).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('RegNo lookup returns the matching patient', async ({ api }) => {
    const list = await (await api.post(apiPath('RegRecord/GetByRegDates'), { data: range })).json();
    // eslint-disable-next-line playwright/no-skipped-test -- runtime skip when there's no recent data
    test.skip(!list.data?.length, 'no patients registered in the last 7 days');

    const uhid = list.data[0].uhid;
    const res = await api.get(apiPath(`RegRecord/RegNo/${uhid}`));
    await expect(res).toBeOK();
    const body = await res.json();
    expect(body.succeeded).toBe(true);
    expect(body.data.uhid).toBe(uhid);
    expect(body.data.fullName).toBeTruthy();
  });

  // The API answers 200 with an empty record (uhid 0, all fields null) instead of 404.
  test('RegNo lookup for a non-existent UHID has no data', async ({ api }) => {
    const res = await api.get(apiPath('RegRecord/RegNo/999999999'));
    const body = await res.json().catch(() => ({}));
    expect(body.data?.uhid ?? 0).toBe(0);
    expect(body.data?.fullName ?? null).toBeNull();
  });
});
