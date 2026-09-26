# OPD Investigation Entry — `/diagnostic/investigation`

Navigation: Dashboard → **DIAGNOSTIC** → **OPD Investigation Entry**

## Multi-tab duplicate prevention

Common data: same Patient, Age, Mobile, Ref. Doctor and User in every tab.
Tests in one entry: **CBC (Govt. Fixed Rate)** 400 + **Random blood Sugar (RBS)** 140 + **Lipid Profile** 800
(the app adds Vacutainer Needle / Gray / Red 4ml at 18 Tk each → net 1394 Tk).

| TC ID        | Scenario                                           | Steps                                                                        | Expected                                   | Priority |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| INV-AUTO-001 | Same entry saved from 3 tabs at the same moment    | Tab 1 → Save, Tab 2 → Save, Tab 3 → Save, all at once                        | Created entries = 1, Duplicate entries = 0 | Critical |
| INV-AUTO-002 | Same entry saved from 3 tabs almost simultaneously | Tab 1 → Save at T1, Tab 2 → Save at T1 + 300 ms, Tab 3 → Save at T1 + 600 ms | Created entries = 1, Duplicate entries = 0 | Critical |

## Automation

Spec: `modules/diagnostic/tests/investigation-entry.spec.ts`

```
npx playwright test --project=diagnostic --grep INV-AUTO                        # both
INV_TABS=2 npx playwright test --project=diagnostic --grep INV-AUTO             # 2-tab variant
INV_STAGGER_MS=1000 npx playwright test --project=diagnostic --grep INV-AUTO-002  # wider gap
```

Each run registers a fresh patient and creates one real invoice per test.

| TC ID        | Status (2026-09-26) | Result                                                                                      |
| ------------ | ------------------- | ------------------------------------------------------------------------------------------- |
| INV-AUTO-001 | Pass                | Created 1, duplicates 0. Tab 1 saved; tabs 2 and 3 not saved, **no message shown**          |
| INV-AUTO-002 | Pass                | Created 1, duplicates 0. Tab 1 (T1) saved; tabs at +302 / +616 ms not saved, **no message** |

Findings (see README): losing tabs get no message (DIAG-BR05); Area is silently required (DIAG-BR02);
test rows show D.Time about 3 hours ahead of the real time (DIAG-BR08).
