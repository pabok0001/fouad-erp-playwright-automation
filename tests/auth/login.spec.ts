import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

// These tests exercise the login form itself, so start without a session.
test.use({ storageState: { cookies: [], origins: [] } });

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/Account\/Login/);
});

test('invalid password is rejected', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login('admin', 'wrong-password');
  await expect(login.errorAlert).toContainText('Invalid login attempt');
  await expect(page).toHaveURL(/Account\/Login/);
});
