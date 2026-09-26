# Module analysis

Every module lives in one folder, `tests/modules/<module>/`, with the same layout:

```
tests/modules/<module>/
  README.md     # analysis: Page → Workflow → Business Rule → Test Scenario → Automation Candidate
  testcases/    # test cases written by the QA team (one file per page)
  data/         # test-data tables (Markdown), parsed by utils/
  pages/        # Page Objects for this module's screens
  tests/        # Playwright specs (+ <module>.setup.ts if the module has its own login user)
  utils/        # module-specific data loaders / helpers
```

Analysis follows [\_TEMPLATE.md](_TEMPLATE.md). Pages are explored read-only with the stored admin session
(`npm run explore -- <module> <path> …`); nothing is saved while mapping a module.

| #   | Module (dashboard tile)                 | Prefix | Folder / status                                                                                                                 |
| --- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | UHID WINDOW                             | UHID   | —                                                                                                                               |
| 2   | MANAGEMENT DASHBOARD FOR ADMINISTRATION | MGMT   | —                                                                                                                               |
| 3   | REGISTRATION                            | REG    | [tests/modules/registration/](../../tests/modules/registration/README.md) — analysis draft, 1 spec                              |
| 4   | HOSPITAL                                | HOSP   | —                                                                                                                               |
| 5   | EMR                                     | EMR    | —                                                                                                                               |
| 6   | DIET & NUTRITION                        | DIET   | —                                                                                                                               |
| 7   | OPD                                     | OPD    | —                                                                                                                               |
| 8   | RX                                      | RX     | —                                                                                                                               |
| 9   | PHARMACY                                | PHAR   | —                                                                                                                               |
| 10  | DIAGNOSTIC                              | DIAG   | [tests/modules/diagnostic/](../../tests/modules/diagnostic/README.md) — 54 pages mapped, INV-AUTO-001/002 (investigation entry) |
| 11  | RE-AGENT MANAGEMENT                     | REAG   | —                                                                                                                               |
| 12  | HR                                      | HR     | —                                                                                                                               |
| 13  | PAYROLL                                 | PAY    | —                                                                                                                               |
| 14  | ACCOUNT                                 | ACC    | —                                                                                                                               |
| 15  | SUPPLY CHAIN                            | SCM    | —                                                                                                                               |
| 16  | MARKETING                               | MKT    | —                                                                                                                               |
| 17  | MIS                                     | MIS    | —                                                                                                                               |
| 18  | ADMINISTRATIVE                          | ADM    | —                                                                                                                               |

Shared screens (login, dashboard) live in `pages/common/`, `tests/auth/` and `tests/smoke/`; REST API specs in `tests/api/`.
