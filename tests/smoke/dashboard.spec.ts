import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';

const MODULES = [
  'UHID WINDOW', 'MANAGEMENT DASHBOARD FOR ADMINISTRATION', 'REGISTRATION',
  'HOSPITAL', 'EMR', 'DIET & NUTRITION', 'OPD', 'RX', 'PHARMACY', 'DIAGNOSTIC',
  'RE-AGENT MANAGEMENT', 'HR', 'PAYROLL', 'ACCOUNT', 'SUPPLY CHAIN',
  'MARKETING', 'MIS', 'ADMINISTRATIVE',
];

test.describe('Dashboard smoke', () => {
  test('logged-in admin sees hospital dashboard', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    await expect(dashboard.hospitalName).toBeVisible();
    await expect(page.getByText('Administrator')).toBeVisible();
    await expect(dashboard.userMenu).toBeVisible();
  });

  test('all main modules are listed', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    for (const name of MODULES) {
      await expect(dashboard.module(name), `module ${name}`).toBeVisible();
    }
  });
});
