import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'blob-report/',
      'perf/results/',
      'scripts/audit/output/',
      '.auth/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
    // Playwright fixtures that use no other fixtures are written `async ({}, use) => …`.
    rules: { 'no-empty-pattern': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    // Page Objects, fixtures and helpers call async expect() too.
    files: ['pages/**/*.ts', 'fixtures/**/*.ts', 'utils/**/*.ts'],
    plugins: { playwright },
    rules: { 'playwright/missing-playwright-await': 'error' },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // page.evaluate() callbacks in the audit scripts run in the browser.
    files: ['scripts/audit/**/*.cjs'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
);
