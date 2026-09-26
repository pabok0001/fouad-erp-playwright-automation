import { Page, Locator, expect } from '@playwright/test';
import type { TestItemInput } from '../utils/testItemData';

export interface SubmitResult {
  /** App showed "TestItem Saved". */
  saved: boolean;
  /** Snackbar messages shown after Submit. */
  messages: string[];
  /** Field validation errors shown inside the dialog. */
  validationErrors: string[];
}

/**
 * Diagnostic → Test Item (/diagnosis/testitems): the lab investigation master.
 * "Add New" opens a MudBlazor dialog; Submit shows a "TestItem Saved" snackbar.
 * The list's Search box matches on test NAME only.
 */
export class TestItemPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly addNew: Locator;
  readonly search: Locator;
  readonly rows: Locator;
  readonly pager: Locator;
  readonly dialog: Locator;
  readonly popover: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'TEST ITEM' });
    this.addNew = page.getByRole('button', { name: 'Add New' });
    this.search = page.getByRole('textbox', { name: 'Search' });
    this.rows = page.locator('table tbody tr').filter({ has: page.locator('td') });
    this.pager = page.getByText(/^\d+-\d+ of \d+$/);
    this.dialog = page.getByRole('dialog');
    this.popover = page.locator('.mud-popover-open');
  }

  async goto() {
    await this.page.goto('/diagnosis/testitems');
    await expect(this.heading).toBeVisible();
    await expect(this.pager).toBeVisible();
  }

  /** Total row count from the pager ("1-10 of 789" → 789). */
  async total(): Promise<number> {
    const text = await this.pager.innerText();
    return Number(text.match(/of (\d+)/)?.[1] ?? 0);
  }

  async searchFor(term: string) {
    const before = await this.pager.innerText();
    await this.search.fill(term);
    // Wait for the grid to re-filter (pager text changes) — or settle if it didn't.
    await expect(this.pager).not.toHaveText(before, { timeout: 5_000 }).catch(() => {});
  }

  async openAddNew() {
    await this.addNew.click();
    await expect(this.dialog).toBeVisible();
    await expect(this.dialog.getByRole('button', { name: 'Submit' })).toBeVisible();
  }

  private field(name: string) {
    return this.dialog.getByRole('textbox', { name, exact: true });
  }

  async selectGroup(group: string) {
    // Group is the first MudSelect in the dialog (its label has no accessible name).
    await this.dialog.locator('.mud-input-control').first().locator('.mud-input').first().click();
    const escaped = group.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await this.popover.locator('.mud-list-item').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`, 'i') }).first().click();
    await expect(this.popover).toBeHidden();
  }

  async selectVacutainer(vacutainer: string) {
    const input = this.field('Default Vacutainer');
    await input.fill(vacutainer.replace(/\*$/, ''));
    const escaped = vacutainer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const option = this.popover.locator('.mud-list-item').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }).first();
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();
    await expect(input).toHaveValue(vacutainer);
  }

  async fill(item: TestItemInput) {
    if (item.group) await this.selectGroup(item.group);
    await this.field('Test Code').fill(item.code);
    await this.field('Test Name').fill(item.name);
    if (item.vacutainer) await this.selectVacutainer(item.vacutainer);
    await this.field('Test Rate/Cost').fill(item.rate);
    const active = this.dialog.getByRole('checkbox', { name: 'IsActive' });
    if ((await active.isChecked()) !== item.isActive) await active.click();
  }

  /** Click Submit and report what the app did. Closes the dialog if it stayed open. */
  async submit(): Promise<SubmitResult> {
    const snackbar = this.page.locator('.mud-snackbar');
    await this.dialog.getByRole('button', { name: 'Submit' }).click();

    // Either a snackbar appears or the dialog stays open with validation errors.
    await expect(snackbar.first().or(this.dialog.locator('.mud-input-error').first()))
      .toBeVisible({ timeout: 10_000 })
      .catch(() => {});
    await this.page.waitForTimeout(500); // let any second snackbar render

    const messages = (await snackbar.allInnerTexts()).map((m) => m.trim()).filter(Boolean);
    const validationErrors = (await this.dialog.locator('.mud-input-helper-text.mud-input-error').allInnerTexts().catch(() => []))
      .map((m) => m.trim())
      .filter(Boolean);
    const saved = messages.some((m) => /saved/i.test(m));

    if (await this.dialog.isVisible()) {
      await this.dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(this.dialog).toBeHidden();
    }
    // Dismiss snackbars so they don't leak into the next check.
    for (const close of await this.page.getByRole('button', { name: 'Close snackbar' }).all()) {
      await close.click().catch(() => {});
    }
    return { saved, messages, validationErrors };
  }
}
