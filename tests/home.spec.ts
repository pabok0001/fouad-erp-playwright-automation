import { test, expect } from './fixtures/pages';

test('home page has title', async ({ homePage, page }) => {
  await homePage.goto();
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started navigates to installation', async ({ homePage }) => {
  await homePage.goto();
  await homePage.clickGetStarted();
});
