# OPD Investigation Entry — `/diagnostic/investigation`

Navigation: Dashboard → **DIAGNOSTIC** → **OPD Investigation Entry**

| TC ID        | Test Scenario                               | Test Data / Steps                                                                                                                             | Expected Result                                                                                      | Priority |
| ------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| INV-AUTO-001 | Same investigation entry from multiple tabs | Same Patient + Age + Mobile + Ref. Doctor + Test; the same user opens 2/3 browser tabs and clicks Save (POST) in all of them at the same time | Only one investigation entry / invoice is created. The other tabs must not create a duplicate entry. | Critical |

## Automation

| TC ID        | Spec                                                                                                                                             | Status                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| INV-AUTO-001 | `modules/diagnostic/tests/investigation-entry.spec.ts` (`npx playwright test --project=diagnostic --grep INV-AUTO-001`; `INV_TABS=2` for 2 tabs) | Passing (2026-09-26). Findings: losing tabs get no message; Area is silently required — see README DIAG-BR02/BR05. |
