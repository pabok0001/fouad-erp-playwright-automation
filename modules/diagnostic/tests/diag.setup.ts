import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '../../../pages/common/LoginPage';
import { moduleUser } from '../../../utils/env';
import { DIAG_STORAGE_STATE } from '../../../playwright.config';

// Logs in as the Diagnostic user (DIAG_USER / DIAG_PASSWORD) and stores the session.
setup('authenticate as diagnostic user', async ({ page }) => {
  setup.setTimeout(120_000);
  const { user, password } = moduleUser('DIAG');
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait(user, password);
  await expect(page).not.toHaveURL(/Account\/Login/);
  await expect(page.getByRole('heading', { name: /FOUAD AL-KHATEEB HOSPITAL/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.context().storageState({ path: DIAG_STORAGE_STATE });
});
