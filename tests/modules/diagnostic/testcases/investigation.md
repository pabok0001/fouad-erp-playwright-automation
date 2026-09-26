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

## Full test case list (QA, 2026-09-26)

**Automation priority (first batch):** 001 multi-tab · 002 concurrent · 004 multiple tests · 005 discount ·
006 fully paid · 007 due · 010 delayed save → entry date/time · 011 invoice date/time · 023 double-click · 030 invoice calculation.

Realistic test set: CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray. Date/time tolerance: ±1 minute of the save time.

| TC ID        | Test Scenario                                        | Test Data / Steps                                                                 | Expected Result                                                                                  | Priority |
| ------------ | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| INV-AUTO-001 | Same investigation entry from multiple tabs          | Same Patient + Age + Mobile + Ref. Doctor + Test; 2/3 tabs; Save at the same time | Created entries = 1, duplicate entries = 0                                                       | Critical |
| INV-AUTO-002 | Duplicate entry from two tabs with same patient/test | Tab-1 এবং Tab-2 থেকে একই patient-এর একই test select করে প্রায় একই সময়ে Save     | 1st successful request entry করবে; subsequent request duplicate হিসেবে blocked হবে               | Critical |
| INV-AUTO-003 | Same patient, different test                         | একই patient-এর জন্য CBC এবং FBS আলাদা entry                                       | দুটো valid test entry তৈরি হবে                                                                   | High     |
| INV-AUTO-004 | Multiple diagnostic tests entry                      | CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray select করে একসাথে entry            | Selected সব test সঠিকভাবে investigation list/invoice-এ থাকবে                                     | High     |
| INV-AUTO-005 | Entry with discount                                  | Multiple tests select করে discount amount/percentage apply করে Save               | Discount সঠিকভাবে calculate হবে এবং invoice/UI-তে reflected হবে                                  | High     |
| INV-AUTO-006 | Paid investigation                                   | Test amount-এর সম্পূর্ণ payment দিয়ে Save                                        | Status = Paid, Due = 0                                                                           | High     |
| INV-AUTO-007 | Due investigation                                    | Total amount-এর চেয়ে কম payment দিয়ে Save                                       | Status = Due, Due amount সঠিক থাকবে                                                              | High     |
| INV-AUTO-008 | Paid after discount                                  | Multiple tests + discount + full discounted amount payment                        | Status = Paid এবং Total/Discount/Paid/Due calculation সঠিক                                       | High     |
| INV-AUTO-009 | Due after discount                                   | Multiple tests + discount + partial payment                                       | Discounted total অনুযায়ী Due calculate হবে                                                      | High     |
| INV-AUTO-010 | Entry Date & Time after page remains open            | Page open রেখে কয়েক মিনিট অপেক্ষা → তারপর patient/test entry → Save              | Entry Date & Time Save/entry করার সময়ের কাছাকাছি হবে; page load time হবে না                     | Critical |
| INV-AUTO-011 | Invoice Date & Time validation                       | Page load → wait → Save → Invoice খুলে Date & Time check                          | Invoice-এর date/time actual entry/save time-এর সাথে consistent হবে                               | Critical |
| INV-AUTO-012 | UI vs Invoice Date & Time                            | Save করার পর UI date/time এবং generated invoice-এর date/time compare              | দুটির timestamp consistent হবে                                                                   | High     |
| INV-AUTO-013 | Same patient with different reference doctor         | Same patient/test কিন্তু different Ref. Doctor                                    | Business rule অনুযায়ী separate valid entry হলে সঠিকভাবে create হবে                              | Medium   |
| INV-AUTO-014 | Mandatory patient validation                         | Patient select না করে test entry/save                                             | Required validation দেখাবে এবং entry তৈরি হবে না                                                 | High     |
| INV-AUTO-015 | Mandatory test validation                            | Patient select করে কোনো test select না করে Save                                   | Validation দেখাবে; entry তৈরি হবে না                                                             | High     |
| INV-AUTO-016 | Invalid/zero payment                                 | Payment 0 দিয়ে Save                                                              | System business rule অনুযায়ী Due/validation handle করবে; incorrect Paid status হবে না           | Medium   |
| INV-AUTO-017 | Payment greater than payable amount                  | Payable amount-এর চেয়ে বেশি payment enter                                        | System overpayment prevent/validate করবে                                                         | High     |
| INV-AUTO-018 | Discount greater than total                          | Total-এর চেয়ে বেশি discount enter                                                | Invalid discount prevent হবে; entry create হবে না                                                | High     |
| INV-AUTO-019 | Multiple tests with different prices                 | CBC + FBS + TSH + X-Ray                                                           | প্রত্যেক test-এর price এবং grand total সঠিক                                                      | High     |
| INV-AUTO-020 | Remove test before save                              | Multiple tests select → একটি test remove → Save                                   | Removed test invoice/entry-তে থাকবে না                                                           | Medium   |
| INV-AUTO-021 | Change patient before save                           | Patient select → tests select → patient change                                    | Previous patient's test data incorrectly carry হবে না                                            | Medium   |
| INV-AUTO-022 | Refresh before save                                  | Data entry করে page refresh                                                       | Unsaved data business rule অনুযায়ী clear/retain হবে; accidental investigation entry তৈরি হবে না | Medium   |
| INV-AUTO-023 | Double-click Save                                    | Save button দ্রুত 2 বার click                                                     | Duplicate investigation/invoice তৈরি হবে না                                                      | Critical |
| INV-AUTO-024 | Save button during slow response                     | Save click করে response আসার আগে আবার click                                       | Duplicate request/entry হবে না; button/request properly controlled হবে                           | Critical |
| INV-AUTO-025 | Browser Back/Forward after save                      | Save → Back → Forward                                                             | Duplicate entry তৈরি হবে না                                                                      | Medium   |
| INV-AUTO-026 | Same patient + same test after successful entry      | First entry successfully create → আবার same data দিয়ে entry                      | Duplicate prevention rule অনুযায়ী system block করবে                                             | Critical |
| INV-AUTO-027 | Different patient same test                          | Patient A → CBC; Patient B → CBC                                                  | দুই patient-এর পৃথক valid entries হবে                                                            | High     |
| INV-AUTO-028 | Same patient + different test combination            | প্রথমে CBC+FBS → পরে TSH+Lipid Profile                                            | Business rule অনুযায়ী valid new investigation entry তৈরি হবে                                    | High     |
| INV-AUTO-029 | Special characters in patient/reference data         | Valid patient with special characters where applicable                            | Data correctly save/display হবে; UI break করবে না                                                | Low      |
| INV-AUTO-030 | Invoice calculation verification                     | Multiple tests + discount + paid/due                                              | Total − Discount = Net Amount; Net Amount − Paid = Due                                           | Critical |

## Automation

| Spec (`tests/modules/diagnostic/tests/`) | Covers                       |
| ---------------------------------------- | ---------------------------- |
| `investigation-entry.spec.ts`            | 001, 002, 023 (duplicates)   |
| `investigation-billing.spec.ts`          | 004, 005, 006, 007, 030      |
| `investigation-datetime.spec.ts`         | 010 + 011 (one delayed save) |

Reusable parts: `pages/InvestigationEntryPage.ts` (patient/test selection, discount, payment, totals, save),
`pages/InvestigationDashboardPage.ts` (status, entry date/time), `utils/investigationFlow.ts` (register patient,
fill an entry), `utils/investigationApi.ts` (invoice, ledger, billed tests, server clock),
`data/investigation-tests.json` (test items, sets, discount cap).

```
npx playwright test --project=diagnostic                                     # whole diagnostic suite (~12 min)
npx playwright test --project=diagnostic --grep INV-AUTO-005                 # one test case
INV_TABS=2 npx playwright test --project=diagnostic --grep INV-AUTO-00[12]   # 2-tab variant
INV_STAGGER_MS=1000 npx playwright test --project=diagnostic --grep INV-AUTO-002
INV_WAIT_MIN=5 npx playwright test --project=diagnostic --grep INV-AUTO-010  # wait 5 min instead of 3
```

⚠️ Every INV-AUTO test registers a fresh patient and creates one real invoice.

| TC ID            | Status (2026-09-26) | Result                                                                                                                                                 |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| INV-AUTO-001     | Pass                | 3 tabs at once → created 1, duplicates 0. Saving tab "Successful Save!"; others: info "This invoice was already saved as FKH… It was not saved again." |
| INV-AUTO-002     | Pass                | T1 / +300 / +600 ms → created 1, duplicates 0. Later tabs: info "already saved…" or danger "Duplicate entry … Same entry is allowed after <+10 min>"   |
| INV-AUTO-004     | Pass                | CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray all in grid at their rates and on the invoice (plus 3 vacutainers + Urine C/S Pot); Sub Total 3649      |
| INV-AUTO-005     | Pass                | 10 % of Discountable 1680 = 168; Net 3481; ledger Discount Cr 168; Paid                                                                                |
| INV-AUTO-006     | Pass                | Full payment 576 → Status **Paid**, due 0                                                                                                              |
| INV-AUTO-007     | Pass                | Paid 376 of 576 → Status **Due**, due 200 (UI, ledger, invoice list)                                                                                   |
| INV-AUTO-010/011 | Pass                | Page open 3 min; save 19:18:42 (server) → entryDate 19:18:42.313, ledger + dashboard 07:18 PM agree; page load 19:15:41 not used                       |
| INV-AUTO-023     | Pass                | Double-click POST → 1 invoice                                                                                                                          |
| INV-AUTO-030     | Pass                | Sub 3649 − Disc 200 = Net 3449; Paid 2449 → Due 1000; ledger Dr 3649 − Cr (200 + 2449) = 1000; Status Due                                              |

Findings (details in README):

- **Discount cap 15 %** of Discountable (General Discount): above it Disc(Tk) resets to 0 with no message (BR10).
- **Overpayment** (cash > Net) resets cash to 0 → the whole bill becomes Due, with no message (BR11). Relevant for INV-AUTO-017/018.
- **API bug**: `GetInvoiceByInvoiceNo` reports due 0 for Due invoices; the invoice list API is correct (BR14).
- **Clock**: server clock is ~79 s behind the test PC; time checks convert to server time (BR15).
- **Invoice document**: printed on the server's printer — no invoice reaches the browser, the Print API returns 500. INV-AUTO-011
  therefore checks the invoice record (entryDate/entryTime, ledger tranDate, dashboard) instead of a printed page (BR15).
- Area is silently required (BR02); D.Date/D.Time in the grid are per-test delivery times (BR08).
