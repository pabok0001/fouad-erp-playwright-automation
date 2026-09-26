import { Page, Locator, expect } from '@playwright/test';

/** A snackbar the app showed: `kind` is its colour class (success / info / danger / warning). */
export interface SnackbarMessage {
  kind: string;
  text: string;
}

/** The totals panel as numbers (thousands separators removed). */
export interface Totals {
  subTotal: number;
  /** Part of the sub total a discount can apply to (excludes govt fixed-rate tests and tube charges). */
  discountable: number;
  discountPercent: number;
  discountTk: number;
  netPayable: number;
  cash: number;
  due: number;
}

/** A row of the selected-tests grid. */
export interface GridRow {
  name: string;
  rate: number;
  total: number;
}

const toNumber = (s: string) => Number(s.replace(/,/g, '').trim() || 0);
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  readonly discountable: Locator;
  readonly discountPercent: Locator;
  readonly discountTk: Locator;
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
    this.discountable = this.amount('Discountable(TK)');
    this.discountPercent = this.amount('Disc(%)');
    this.discountTk = this.amount('Disc(Tk)');
    this.netPayable = this.amount('Net Payable');
    this.cashPayment = this.amount('Payment (Cash)');
    this.dueAmount = this.amount('Due Amount');
    this.post = page.getByRole('button', { name: 'POST', exact: true });
  }

  /**
   * The input after a totals-panel <label> ("Sub Total", "Disc(%)", …). Scoped to <label>
   * because the grid also has a "Disc(%)" column header.
   */
  private amount(label: string): Locator {
    return this.page
      .locator('label')
      .filter({ hasText: new RegExp(`^\\s*${escapeRe(label)}\\s*$`) })
      .first()
      .locator('xpath=following::input[1]');
  }

  /**
   * Type a number into a totals field. These are Blazor numeric inputs that recalculate on
   * each keystroke — `fill()` sets the value without the key events, so nothing updates.
   */
  private async typeAmount(field: Locator, value: number) {
    await field.click();
    await field.press('Control+A');
    await field.pressSequentially(String(value), { delay: 60 });
    await this.page.waitForTimeout(800); // let the round trip over SignalR finish
  }

  /** Discount as a percentage of the discountable amount. */
  async setDiscountPercent(pct: number) {
    await this.typeAmount(this.discountPercent, pct);
  }

  /** Discount in Taka; the app back-fills Disc(%). */
  async setDiscountTk(tk: number) {
    await this.typeAmount(this.discountTk, tk);
  }

  /** Cash received. A value above Net Payable is reset to 0 by the app. */
  async setCash(tk: number) {
    await this.typeAmount(this.cashPayment, tk);
  }

  async totals(): Promise<Totals> {
    const n = async (l: Locator) => toNumber(await l.inputValue());
    return {
      subTotal: await n(this.subTotal),
      discountable: await n(this.discountable),
      discountPercent: await n(this.discountPercent),
      discountTk: await n(this.discountTk),
      netPayable: await n(this.netPayable),
      cash: await n(this.cashPayment),
      due: await n(this.dueAmount),
    };
  }

  /** Selected-tests grid rows (tests plus the charges the app adds itself). */
  async gridRows(): Promise<GridRow[]> {
    const rows: GridRow[] = [];
    for (const row of await this.rows.all()) {
      const cells = (await row.locator('td').allInnerTexts()).map((c) => c.trim());
      // SL | Name | D.Date | D.Time | Rate | Disc(%) | G.TK | IsUrgent | Action
      rows.push({
        name: cells[1].replace(/\*$/, ''),
        rate: toNumber(cells[4]),
        total: toNumber(cells[6]),
      });
    }
    return rows;
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
    const exact = new RegExp(`^\\s*${escapeRe(name)}\\*?\\s*$`);
    const option = this.option(exact);
    // After a pick the app clears the box a moment later, which can wipe the next query
    // mid-typing — so retype until the option shows up.
    await expect(async () => {
      await this.testSearch.fill(query);
      await expect(option).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    await option.click();
    await expect(
      this.rows.filter({ has: this.page.locator('td').filter({ hasText: exact }) }),
    ).toHaveCount(1);
    await expect(this.testSearch, 'test search cleared after the pick').toHaveValue('');
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

  /**
   * Wait up to `ms` for the save outcome — "Successful Save!", a duplicate notice or an
   * error — then return every snackbar seen. Other snackbars ("Successful fetched!",
   * "Could not found printer.") can arrive first and don't end the wait.
   */
  async collectFeedback(ms = 20_000): Promise<SnackbarMessage[]> {
    const outcome = /Successful Save|already (saved|invoiced)|Duplicate|not saved|error|fail/i;
    const deadline = Date.now() + ms;
    while (Date.now() < deadline && !(await this.messages()).some((m) => outcome.test(m.text)))
      await this.page.waitForTimeout(250);
    await this.page.waitForTimeout(1_000);
    return this.messages();
  }

  /** True once the form has been reset (no selected tests) — what a successful POST does. */
  async isCleared(): Promise<boolean> {
    return (await this.rows.count()) === 0;
  }

  /**
   * POST the entry and wait for the result. Returns the snackbars shown, the local time the
   * click happened, and the text of the invoice window the app opens after a successful save
   * (empty if none opened). `clicks: 2` double-clicks POST (duplicate-click test).
   */
  async save({ clicks = 1 }: { clicks?: 1 | 2 } = {}) {
    await this.watchMessages();
    const invoiceWindow = this.page
      .context()
      .waitForEvent('page', { timeout: 20_000 })
      .catch(() => null);
    const savedAt = new Date();
    if (clicks === 2) await this.post.dblclick({ noWaitAfter: true });
    else await this.post.click({ noWaitAfter: true });
    const messages = await this.collectFeedback();
    const popup = await invoiceWindow;
    let invoiceText = '';
    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => {});
      await popup.waitForTimeout(3_000);
      invoiceText = (
        await popup
          .locator('body')
          .innerText()
          .catch(() => '')
      )
        .replace(/\s+/g, ' ')
        .trim();
      await popup.close().catch(() => {});
    }
    return {
      savedAt,
      messages,
      saved: messages.some((m) => /Successful Save/i.test(m.text)),
      invoiceText,
    };
  }
}
