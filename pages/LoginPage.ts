import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.username = page.locator('input[name="Input.Email"]');
    this.password = page.locator('input[name="Input.Password"]');
    this.submit = page.getByRole('button', { name: 'Log In' });
    this.errorAlert = page.getByRole('alert');
  }

  /**
   * Go to the app root and let it redirect to the login page.
   * NOTE: hitting /Account/Login directly (without returnUrl) leaves the
   * Blazor form non-interactive on this server, so always enter via "/".
   */
  async goto() {
    await this.page.goto('/');
    await expect(this.page).toHaveURL(/Account\/Login/);
    // Give the Blazor circuit time to attach; SignalR may keep the network
    // busy, so don't fail if "networkidle" is never reached.
    await this.page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await expect(this.username).toBeVisible();
  }

  async login(user: string, pass: string) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }

  /** Full happy-path login that waits until the app leaves the login page. */
  async loginAndWait(user: string, pass: string) {
    await this.login(user, pass);
    await this.page.waitForURL((url) => !url.pathname.includes('/Account/Login'), { timeout: 30_000 });
  }
}
