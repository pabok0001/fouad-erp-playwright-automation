import { Page, Locator, expect } from '@playwright/test';

/** One invoice as the OPD investigation dashboard lists it. */
export interface DashboardRow {
  billNo: string;
  /** As shown, MM/DD/YYYY. */
  entryDate: string;
  /** As shown, hh:mm AM/PM. */
  entryTime: string;
  fullName: string;
  userName: string;
  /** "Paid", "Due", … */
  status: string;
}

/**
 * OPD investigation Dashboard (/diagnostic/investigation-dashboard): MudDataGrid of invoices
 * for a date range (defaults to the current month). The Search box filters as you type.
 */
export class InvestigationDashboardPage {
  readonly page: Page;
  readonly search: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    this.page = page;
    this.search = page.getByRole('textbox', { name: 'Search' });
    this.rows = page.locator('table tbody tr.mud-table-row');
  }

  async goto() {
    await this.page.goto('/diagnostic/investigation-dashboard');
    await expect(this.search).toBeVisible();
    await expect(this.rows.first()).toBeVisible({ timeout: 30_000 });
  }

  /** Find an invoice by bill number and read its row. */
  async find(billNo: number | string): Promise<DashboardRow> {
    await this.search.fill(String(billNo));
    const row = this.rows.filter({
      has: this.page.locator('td[data-label="Bill No"]', { hasText: String(billNo) }),
    });
    await expect(row, `bill ${billNo} on the dashboard`).toHaveCount(1, { timeout: 20_000 });
    const cell = async (label: string) =>
      (await row.locator(`td[data-label="${label}"]`).innerText()).trim();
    return {
      billNo: await cell('Bill No'),
      entryDate: await cell('Entry Date'),
      entryTime: await cell('Entry Time'),
      fullName: await cell('Full Name'),
      userName: await cell('UserName'),
      status: await cell('Status'),
    };
  }
}
