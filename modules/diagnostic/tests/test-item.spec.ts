/* eslint-disable playwright/no-conditional-in-test, playwright/no-conditional-expect --
   Re-runs branch on what already exists in the master so real records aren't duplicated. */
import { APIRequestContext } from '@playwright/test';
import { test, expect } from '../../../fixtures/api';
import { TestItemPage } from '../pages/TestItemPage';
import { apiPath } from '../../../utils/apiAuth';
import { loadTestItemData, TEST_ITEM_DATA_FILE } from '../utils/testItemData';

// Data-driven from data/test-items.md. Records are created ACTIVE and are NOT deleted
// (agreed with the project owner). Re-runs verify existing records instead of re-creating.
const { investigations, edgeCases, searchTerms } = loadTestItemData();

interface ApiTestItem {
  id: string;
  name: string | null;
  testCode: string | null;
  rate: number;
  testGroupName: string | null;
  vacutainerName: string | null;
  isActive: boolean;
}

async function allTestItems(api: APIRequestContext): Promise<ApiTestItem[]> {
  const res = await api.get(apiPath('TestItem/GetAllTestItems'));
  await expect(res, 'GetAllTestItems').toBeOK();
  return (await res.json()).data ?? [];
}

/** Records matching a case's code, or its exact name when the code is blank. */
async function matching(api: APIRequestContext, code: string, name: string) {
  const items = await allTestItems(api);
  return code.trim()
    ? items.filter((i) => (i.testCode ?? '').trim() === code.trim())
    : items.filter((i) => (i.name ?? '') === name);
}

const note = (type: string, description: string) => {
  test.info().annotations.push({ type, description });
  console.log(`  [${type}] ${description}`);
};

test.describe(`Diagnostic · Test Item (data: ${TEST_ITEM_DATA_FILE})`, () => {
  test.beforeAll(() => {
    expect(investigations.length, 'investigation table in the data file').toBeGreaterThan(0);
  });

  test.describe('Create investigations', () => {
    for (const inv of investigations) {
      test(`#${inv.no} ${inv.name} (${inv.code})`, async ({ page, api }) => {
        const existing = await matching(api, inv.code, inv.name);

        if (existing.length === 0) {
          const ti = new TestItemPage(page);
          await ti.goto();
          await ti.openAddNew();
          await ti.fill(inv);
          const result = await ti.submit();
          expect(
            result.saved,
            `save "${inv.name}": ${result.messages.concat(result.validationErrors).join(' | ')}`,
          ).toBe(true);
          note('created', `${inv.code} ${inv.name}`);
        } else {
          note('exists', `${inv.code} already in master — verifying only`);
        }

        const [saved] = await matching(api, inv.code, inv.name);
        expect(saved, `record ${inv.code} in API`).toBeTruthy();
        expect(saved.name).toBe(inv.name);
        expect(saved.rate).toBe(Number(inv.rate));
        expect(saved.testGroupName).toBe(inv.group);
        expect(saved.vacutainerName).toBe(inv.vacutainer);
        expect(saved.isActive).toBe(inv.isActive);
      });
    }
  });

  test.describe('Validation & edge cases', () => {
    for (const c of edgeCases) {
      test(`${c.title} → ${c.expected}`, async ({ page, api }) => {
        const before = await matching(api, c.code, c.name);
        const isDuplicateCase = /duplicate/i.test(c.title) && !/case/i.test(c.title);

        // A "must reject" record that already exists (and isn't a duplicate test) was
        // wrongly saved on an earlier run — that's still a failure.
        if (c.outcome === 'reject' && !isDuplicateCase) {
          expect(before, `"${c.title}" record was saved on an earlier run`).toHaveLength(0);
        }
        if (c.outcome !== 'reject' && before.length > 0) {
          note('exists', `${c.code || c.name} saved on an earlier run (rate ${before[0].rate})`);
          if (c.outcome === 'accept') expect(before[0].rate).toBe(Number(c.rate));
          return;
        }

        const ti = new TestItemPage(page);
        await ti.goto();
        await ti.openAddNew();
        await ti.fill(c);
        const result = await ti.submit();
        const after = await matching(api, c.code, c.name);
        const feedback =
          result.messages.concat(result.validationErrors).join(' | ') || '(no message)';

        if (c.outcome === 'reject') {
          expect(result.saved, `should be rejected, app said: ${feedback}`).toBe(false);
          expect(after, 'no new record in API').toHaveLength(before.length);
          note('rejected', feedback);
        } else if (c.outcome === 'accept') {
          expect(result.saved, `should be accepted, app said: ${feedback}`).toBe(true);
          expect(after[0]?.rate).toBe(Number(c.rate));
          note('accepted', `rate stored as ${after[0]?.rate}`);
        } else {
          // "Check …" / "Validate …": no fixed rule — record what the app did.
          note(result.saved ? 'observed: saved' : 'observed: rejected', feedback);
        }
      });
    }
  });

  test.describe('Search (list matches on the search term)', () => {
    for (const term of searchTerms) {
      test(`search "${term}"`, async ({ page }) => {
        const ti = new TestItemPage(page);
        await ti.goto();
        await ti.searchFor(term);

        const rows = (await ti.rows.allInnerTexts()).map((r) => r.replace(/\s+/g, ' ').trim());
        // eslint-disable-next-line playwright/prefer-locator -- `pager` is already a Locator
        note('results', await ti.pager.innerText());
        expect(rows.length, `rows for "${term}"`).toBeGreaterThan(0);

        const needle = term.toLowerCase();
        for (const row of rows) {
          // Rates render with thousands separators ("1,200"), so compare without commas too.
          const hay = row.toLowerCase();
          expect
            .soft(
              hay.includes(needle) || hay.replace(/,/g, '').includes(needle),
              `row "${row.slice(0, 60)}" contains "${term}"`,
            )
            .toBe(true);
        }
      });
    }
  });
});
