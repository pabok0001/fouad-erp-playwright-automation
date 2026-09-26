import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { env } from '../../utils/env';
import { STORAGE_STATE } from '../../playwright.config';

setup('authenticate as admin', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait(env.user, env.password);
  await expect(page).not.toHaveURL(/Account\/Login/);
  await expect(page.getByText('Administrator')).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});
