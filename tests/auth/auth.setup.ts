import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/common/LoginPage';
import { env } from '../../utils/env';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate as admin', async ({ page }) => {
  // Everything else depends on this login, so allow for a slow server.
  setup.setTimeout(120_000);
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait(env.user, env.password);
  await expect(page).not.toHaveURL(/Account\/Login/);
  await expect(page.getByText('Administrator')).toBeVisible({ timeout: 30_000 });
  await page.context().storageState({ path: STORAGE_STATE });
});
