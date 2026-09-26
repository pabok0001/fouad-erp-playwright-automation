import { Page, Locator, expect } from '@playwright/test';

/** A snackbar the app showed: `kind` is its colour class (success / info / danger / warning). */
export interface SnackbarMessage {
  kind: string;
  text: string;
}

/**
 * OPD Investigation Entry (/diagnostic/investigation).
 * Bootstrap-styled Blazor form (not MudBlazor). The Doctor / Test search lists render
 * as plain text rows under the search box (no ARIA roles), so options are picked by text.
 * Everything runs over SignalR — there is no HTTP request to intercept on POST.
 */
export class InvestigationEntryPage {
  readonly page: Page;
  readonly uhid: Locator;
  readonly searchButton: Locator;
  readonly fullName: Locator;
  /** Required — without it POST silently does nothing (no message, no red border). */
  readonly area: Locator;
  readonly doctor: Locator;
  readonly testSearch: Locator;
  /** Rows in the selected-tests grid. */
  readonly rows: Locator;
  readonly subTotal: Locator;
  readonly netPayable: Locator;
  readonly cashPayment: Locator;
  readonly dueAmount: Locator;
  readonly post: Locator;

  constructor(page: Page) {
    this.page = page;
    this.uhid = page.getByRole('textbox', { name: 'UHID', exact: true });
    this.searchButton = page.getByRole('button', { name: 'Search', exact: true });
    this.fullName = page.getByRole('textbox', { name: 'Name', exact: true });
    this.area = page.getByRole('searchbox', { name: 'Area Search...' });
    this.doctor = page.getByRole('searchbox', { name: 'Doctor Search...' });
    this.testSearch = page.getByRole('searchbox', { name: 'Search Test...' });
    this.rows = page.locator('table tbody tr.table-row-selectable');
    this.subTotal = this.amount('Sub Total');
    this.netPayable = this.amount('Net Payable');
    this.cashPayment = this.amount('Payment (Cash)');
    this.dueAmount = this.amount('Due Amount');
    this.post = page.getByRole('button', { name: 'POST', exact: true });
  }

  /** The amount input that follows a label in the totals panel ("Sub Total", "Net Payable", …). */
  private amount(label: string): Locator {
    return this.page.getByText(label, { exact: true }).locator('xpath=following::input[1]');
  }

  /** An entry in a search dropdown — same text as a grid cell, so table cells are excluded. */
  private option(text: string | RegExp): Locator {
    return this.page.getByText(text).and(this.page.locator(':not(td):not(th)')).first();
  }

  async goto() {
    await this.page.goto('/diagnostic/investigation');
    await expect(this.uhid).toBeVisible();
    await expect(this.post).toBeVisible();
    // A full-page loading overlay sits over the form until the initial data arrives.
    await expect(this.page.locator('.loading-container')).toBeHidden({ timeout: 30_000 });
  }

  /** Look a patient up by UHID; resolves with the full name the form loaded. */
  async loadPatient(uhid: number | string): Promise<string> {
    await this.uhid.fill(String(uhid));
    await this.searchButton.click();
    await expect(this.fullName, `patient ${uhid} loaded`).not.toHaveValue('', { timeout: 20_000 });
    return this.fullName.inputValue();
  }

  /** Type into "Area" and pick the entry that matches. */
  async selectArea(query: string, match: RegExp) {
    await this.area.fill(query);
    await this.option(match).click();
    await expect(this.area).toHaveValue(match);
  }

  /** Type into "Referred by" and pick the doctor whose name matches. */
  async selectDoctor(query: string, match: RegExp) {
    await this.doctor.fill(query);
    await this.option(match).click();
    await expect(this.doctor).toHaveValue(match);
  }

  /**
   * Type into "Test" and pick the entry whose name is exactly `name` (so "Lipid Profile"
   * doesn't pick "LIPID PROFILE (FASTING)"); waits for its grid row. Some names carry a
   * trailing "*" in the app (e.g. "CBC (Govt. Fixed Rate)*") — pass the name without it.
   */
  async addTest(query: string, name: string) {
    const exact = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*?\\s*$`);
    await this.testSearch.fill(query);
    await this.option(exact).click();
    await expect(
      this.rows.filter({ has: this.page.locator('td').filter({ hasText: exact }) }),
    ).toHaveCount(1);
  }

  /**
   * Start recording the app's snackbar messages. Call before POST: snackbars
   * (`div.snackbar.snackbar-success|info|danger`, bottom of the page) vanish after a few
   * seconds, so a DOM observer catches them where polling could miss one.
   */
  async watchMessages() {
    await this.page.evaluate(() => {
      const w = window as unknown as { __snackbars?: SnackbarMessage[] };
      w.__snackbars = [];
      const record = (el: HTMLElement) => {
        const text = (el.innerText ?? '').replace(/\s+/g, ' ').trim();
        const kind = /snackbar-(success|info|danger|warning)/.exec(el.className)?.[1] ?? 'other';
        if (text && !w.__snackbars!.some((s) => s.text === text))
          w.__snackbars!.push({ kind, text });
      };
      new MutationObserver((mutations) => {
        for (const m of mutations) {
          const nodes = m.type === 'attributes' ? [m.target] : [...m.addedNodes];
          for (const n of nodes) {
            if (!(n instanceof HTMLElement)) continue;
            if (n.classList.contains('snackbar')) record(n);
            n.querySelectorAll?.<HTMLElement>('.snackbar').forEach(record);
          }
        }
      }).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });
    });
  }

  /** Snackbar messages recorded since `watchMessages()`. */
  async messages(): Promise<SnackbarMessage[]> {
    return this.page.evaluate(
      () => (window as unknown as { __snackbars?: SnackbarMessage[] }).__snackbars ?? [],
    );
  }

  /** Wait up to `ms` for the first snackbar, then return every one seen. */
  async collectFeedback(ms = 15_000): Promise<SnackbarMessage[]> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline && (await this.messages()).length === 0)
      await this.page.waitForTimeout(250);
    await this.page.waitForTimeout(1_000);
    return this.messages();
  }

  /** True once the form has been reset (no selected tests) — what a successful POST does. */
  async isCleared(): Promise<boolean> {
    return (await this.rows.count()) === 0;
  }
}
