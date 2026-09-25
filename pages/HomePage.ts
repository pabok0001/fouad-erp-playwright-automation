import { type Page, type Locator, expect } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly getStartedLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickGetStarted() {
    await this.getStartedLink.click();
    await expect(this.page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  }
}
