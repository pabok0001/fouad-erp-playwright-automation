import { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly hospitalName: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.hospitalName = page.getByRole('heading', { name: /FOUAD AL-KHATEEB HOSPITAL/i });
    this.userMenu = page.getByRole('button', { name: 'Open user menu' });
  }

  async goto() {
    await this.page.goto('/');
    await this.hospitalName.waitFor();
  }

  /**
   * A top-level module tile, e.g. "REGISTRATION", "OPD", "Pharmacy".
   * Tiles are buttons; the DOM text is mixed-case (CSS uppercases it),
   * so match case-insensitively on the whole name.
   */
  module(name: string): Locator {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.page.getByRole('button', { name: new RegExp(`^${escaped}$`, 'i') });
  }

  async openModule(name: string) {
    await this.module(name).click();
  }
}
