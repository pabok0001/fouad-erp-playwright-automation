# CLAUDE.md

Playwright + TypeScript E2E automation for the Fouad Al-Khateeb Hospital HMS
(EMSL, Blazor Server) at `https://202.4.101.118:5555`.

## Commands

- `npm test` — full run (auth setup project logs in, then chromium specs)
- `npm run test:headed` / `test:ui` / `test:debug`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `lint:fix` — ESLint (flat config + `eslint-plugin-playwright`); `npm run format` — Prettier.
  `typescript` is aliased to `@typescript/typescript6` (typescript-eslint needs the TS 6 API);
  `tsc` itself is TS 7 via `@typescript/native`. `Markdown/` and `api/swagger.json` are Prettier-ignored.
- `npm run codegen` — record against the live site (ignores TLS errors)
- Single spec: `npx playwright test tests/smoke/dashboard.spec.ts`

## Conventions

- Module-wise layout: Page Objects in `pages/<module>/` (login/dashboard in `pages/common/`),
  specs in `tests/<module>/`, analysis in `docs/modules/<module>.md` (see its `_TEMPLATE.md`).
  One class per screen.
- Prefer `getByRole` / `getByText` locators; module tiles need case-insensitive
  regex names (see `DashboardPage.module`).
- Credentials come only from `.env` via `utils/env.ts`; never hard-code them.
- Specs use the stored session from `.auth/admin.json`; login-form tests opt out
  with `test.use({ storageState: { cookies: [], origins: [] } })`.

## App gotchas

- Enter the login page through `/`, not `/Account/Login` directly.
- Don't rely on `networkidle` (SignalR keeps the connection busy); use
  `waitForURL` or element expectations.
- `.env` password contains `#` — keep it single-quoted.
- MudBlazor forms: find controls by label via `.mud-input-control` (see
  `PatientRegistrationPage.control`); selected MudSelect inputs become hidden.
- DOB picker is readonly: year → month → day clicks. Registration creates real data.

## API & performance

- `npm run test:api` — Playwright `api` project (`tests/api/`), base `API_BASE_URL` (port 5556).
- Auth = `x-api-key: <userApiKey>` from `POST /api/v1/identity/token`; use the `api` fixture in `fixtures/api.ts`.
- Missing records return 200 with an empty object (`uhid: 0`), not 404.
- `npm run perf:smoke` / `perf:load` — k6 scripts in `perf/`. Import local files with a `.ts` extension (k6 requires it);
  `perf/` has its own tsconfig. Keep perf journeys read-only. Don't run `perf:load` without the user's OK.
- Bash heredocs in this environment collapse `\` to `\` — write files with backslashes using the Write/Edit tools.
