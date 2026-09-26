# Diagnostic

> Status: Draft (Page level done) · Explored: 2026-09-26 · Folder: `tests/modules/diagnostic/` (testcases/, data/, pages/, tests/, utils/)

Hierarchy: **Module → Page → Workflow → Business Rule → Test Scenario → Automation Candidate**.
IDs use the prefix `DIAG`: `P` page, `W` workflow, `BR` business rule, `TS` scenario.

The sidebar lists 55 entries; two ("OPD Package Item" and "OPD Package Mapping") open the same URL, so the module has
**54 pages**. All were opened read-only on 2026-09-26 with the admin session (`npm run explore -- diagnostic …`).

## 1. Pages

Pages are grouped by what they do. **Kind**: `Entry` = creates/changes business records · `Dashboard` = read-only
list with date filter · `Master` = setup data with Add New / Reload / Search · `Config` = settings.

### 1a. Investigation entry & billing (OPD / IPD)

| ID       | Page (menu name)              | URL                                         | Kind      | Purpose / main controls                                                                                                                                        |
| -------- | ----------------------------- | ------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-P01 | OPD Investigation Entry       | `/diagnostic/investigation`                 | Entry     | Create an OPD investigation invoice. Find patient by UHID / Mobile / Admission No / Employee No / RxId; pick Doctor, OPD, tests; POST, Print, Print RX         |
| DIAG-P02 | Dashboard                     | `/diagnostic/investigation-dashboard`       | Dashboard | OPD invoices by date range (Start/End Date, Search, Select Type). Columns: Bill No, Entry Date/Time, Full Name, Gender, Mobile, UserName, Status. ~14,945 rows |
| DIAG-P03 | IPD Investigation Entry       | `/diagnostic/ipd-investigation-invoice`     | Entry     | Convert IPD investigation indents into invoices. Columns: IndentNo, Cabin Type/No, Priority, Indent by, Name, Rate, Package Rate, Qty, Status, Remarks         |
| DIAG-P04 | Investigation Dashboard (IPD) | `/diagnostic/ipd-investigation-dashboard`   | Dashboard | IPD invoices by date range. Same as P02 plus Cabin No and Patient Status. ~1,968 rows                                                                          |
| DIAG-P05 | Edit Invoice                  | `/diagnosis/edit-investigation-invoice`     | Entry     | Load an invoice (Invoice No / Mobile / Name) and change its items, IsUrgent, total; Save, Print                                                                |
| DIAG-P06 | Discount                      | `/diagnostic/investigation-discount`        | Entry     | Apply a discount to an invoice: Enter Invoice No → Total Tk, Total Paid, Due, Disc(%), Disc.Tk → Save / Reset                                                  |
| DIAG-P07 | Cancel and Refund Service     | `/diagnostic/investigation-cancel`          | Entry     | Cancel invoice items with remarks (Cancel Item). Columns: Invoice No, Test Code/Name, Rate, Qty, Total, Cancel Remarks                                         |
| DIAG-P08 | Approve Cancel and Refund     | `/diagnostic/investigation-cancel-approval` | Entry     | Approve a pending cancellation by Invoice No                                                                                                                   |
| DIAG-P09 | Due Collection                | `/diagnostic/due-collection`                | Entry     | Collect outstanding dues on an invoice; item table plus Debit/Credit ledger; Save, Print                                                                       |
| DIAG-P10 | Corporate Due Collection      | `/diagnostic/corporate-client-collection`   | Entry     | Collect dues per corporate client: date range + client search → select bills → "Collect Selected Item: (n)"                                                    |

### 1b. Sample flow

| ID       | Page (menu name)               | URL                                         | Kind      | Purpose / main controls                                                                                                                                                        |
| -------- | ------------------------------ | ------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DIAG-P11 | Sample Collection              | `/diagnostic/sample-collection`             | Entry     | Collect samples for an invoice: Scan/search, date, status filter (New / Collected / Partial / All); Print Token, Print Label. Columns include Lab No, Tube Name, Sample Status |
| DIAG-P12 | Sample Acknowledgement (LAB)   | `/diagnostic/sample-acknowledgement-lab`    | Entry     | Lab receives samples: date range, Scan Lab No, Not Acknowledged / Acknowledged filter → Acknowledge Sample / Reject Sample                                                     |
| DIAG-P13 | Radiology Dept Acknowledgement | `/diagnostic/radiological-dept-acknowledge` | Entry     | Radiology receives its investigations: date range, Search. Columns: InvoiceNo, Entry Date, PatientName, Investigation Name, Status, Cabin or bed                               |
| DIAG-P14 | Sample Status Dashboard        | `/diagnostic/samplelog-dashboard`           | Dashboard | Sample log by date: UHID, InvoiceNo, Patient, Age, Gender, Ref Doctor, TestName, LabNo, Status, "Test Running at Machine", IsUrgent                                            |

### 1c. Results & reports

| ID       | Page (menu name)                            | URL                                                     | Kind      | Purpose / main controls                                                                                                                               |
| -------- | ------------------------------------------- | ------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-P15 | LAB Result Entry                            | `/diagnosis/pathology-result-entry`                     | Entry     | Enter pathology results. **Page rendered empty in the read-only snapshot — needs a Lab No / invoice to load; re-check at Workflow level**             |
| DIAG-P16 | Microbiology Report                         | `/diagnostic/cs-report`                                 | Entry     | Culture & sensitivity report: tabs MICROSCOPIC (Pus Cells, Epithelial Cells), CULTURE RESULT (G/NG), ANTIBIOGRAM (antibiotics → results); Save, Print |
| DIAG-P17 | Microbiology Report Dashboard               | `/diagnosis/cs-report-dashboard`                        | Dashboard | C&S reports by date: InvoiceNo, UHID, FullName, Cabin No, Entry Date, Test Name, Report Doctor, Print Date                                            |
| DIAG-P18 | Pathology Report Published                  | `/diagnosis/pathology-report-published`                 | Dashboard | Published lab reports by date: InvoiceNo, FullName, LabNo, TestGroupName, TestNames, Status, Print Time, User Name, Preview By                        |
| DIAG-P19 | Lab Report Published Group Wise 2           | `/diagnosis/lab-report-published2`                      | Dashboard | Same as P18 but with Report Print Title (group-wise print)                                                                                            |
| DIAG-P20 | Pathology Report (Descriptive) Finalization | `/diagnostic/pathology-descriptive-report-finalization` | Entry     | Finalise descriptive (free-text) pathology reports: date range, Pending / Done filter                                                                 |
| DIAG-P21 | Pathology Report (Descriptive) Published    | `/diagnostic/pathology-descriptive-report-published`    | Dashboard | Published descriptive reports: InvoiceNo, PatientName, Investigation Name, Status, Cabin No, Print Time, User Name                                    |
| DIAG-P22 | Radiological Report Finalization            | `/diagnostic/radiological-report-finalization`          | Entry     | Finalise radiology reports: date range, Pending / Done filter                                                                                         |
| DIAG-P23 | Radiological Report Published               | `/diagnostic/radiological-report-published`             | Dashboard | Published radiology reports: InvoiceNo, PatientName, Investigation Name, Status, Print Time, Cabin No, User Name                                      |
| DIAG-P24 | Report Delivery                             | `/diagnosis/report-delivery`                            | Entry     | Hand reports to patients: Not Received / Received filter, Delivery. Columns: Invoice No, Patient, Test Names, Print Status/Date/User, Payment Status  |

### 1d. Test master data

| ID       | Page (menu name)                       | URL                                   | Kind   | Purpose / main controls                                                                                                                                                                 |
| -------- | -------------------------------------- | ------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-P25 | Parent Group                           | `/diagnosis/parent-group`             | Master | Top-level test grouping (Id, Name)                                                                                                                                                      |
| DIAG-P26 | Test Group                             | `/diagnosis/testgroups`               | Master | Test groups with movement/token settings: NAME, MOVEMENT ROOM No, MOVEMENT ORDER, TOKEN ORDER                                                                                           |
| DIAG-P27 | Test Item                              | `/diagnosis/testitems`                | Master | Investigations catalogue (788 rows): TestCode, NAME, Rate, DISPLAY ORDER, GROUP NAME, Process Time, VacutainerName, IsDiscountAllow. Grid has Sort / Filter / Columns.                  |
| DIAG-P28 | Report Parameter                       | `/diagnosis/report-parameter`         | Master | Result parameters per test: Test Name, Report Param, Test Sample, Short, TestMethod, Normal value, Min, Max, DisplayOrder, InputType, CSV Value, Default, group/bold/italic flags, Unit |
| DIAG-P29 | Report Parameter Value                 | `/diagnosis/report-parameter-value`   | Master | Pick-list values for parameters: Report Parameter Name, TestName, Value, Is Default; Export                                                                                             |
| DIAG-P30 | Test Method                            | `/diagnosis/test-method`              | Master | Method names (Name)                                                                                                                                                                     |
| DIAG-P31 | Test Samples                           | `/diagnostic/machinegroup-testsample` | Master | Specimen per test: SL No, Test Name, Label Text, Specimen                                                                                                                               |
| DIAG-P32 | Sample Status                          | `/diagnosis/sample-status`            | Master | Sample status names (ID, Name); Export                                                                                                                                                  |
| DIAG-P33 | Sample Carrier                         | `/diagnosis/sample-carrier`           | Master | Staff who carry samples (Staff Name, Name)                                                                                                                                              |
| DIAG-P34 | Age Group                              | `/diagnostic/ReportingAgeGroup`       | Master | Age bands for reference ranges: Name, AgeLowLimitInMonths, AgeHigherLimit (≤ / <)                                                                                                       |
| DIAG-P35 | OPD Package Item / OPD Package Mapping | `/diagnosis/opd-package-item`         | Master | OPD investigation packages (Name, Action); New / Save. Two menu entries, one page                                                                                                       |

### 1e. Machine setup

| ID       | Page (menu name)               | URL                                           | Kind   | Purpose / main controls                                                                                                                            |
| -------- | ------------------------------ | --------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-P36 | Pathological Machines          | `/diagnosis/PathologicalMachine`              | Master | Analyzers: Name, Machine Code, Report Title                                                                                                        |
| DIAG-P37 | Pathological Machine Group     | `/diagnosis/PathologicalMachineGroup`         | Master | Machine groups (NAME)                                                                                                                              |
| DIAG-P38 | Machine Group And Test Mapping | `/diagnosis/MachineGroupAndTestMappings`      | Master | Which tests run on which machine group: Machine GroupName, TestName, Specimen                                                                      |
| DIAG-P39 | Vacu And Machine Group Mapping | `/diagnosis/Vacutainer-MachineGroup-Mappings` | Master | Vacutainer (tube) per machine group and test                                                                                                       |
| DIAG-P40 | Mapping With Machine Parameter | `/diagnostic/PathMachineOutputParameter`      | Master | Machine output parameter → report parameter: Machine, TestName, Output Parameter, Report Parameter, LabelText, Specimen, Normal value, Sample Type |

### 1f. Microbiology (culture & sensitivity) masters

| ID       | Page (menu name) | URL                           | Kind   | Purpose              |
| -------- | ---------------- | ----------------------------- | ------ | -------------------- |
| DIAG-P41 | Microb Bacteria  | `/diagnosis/microbiobacteria` | Master | Organism names       |
| DIAG-P42 | CS Blood Message | `/diagnosis/CSMessase`        | Master | Standard C&S remarks |
| DIAG-P43 | CS Growth Type   | `/diagnosis/CSGrowthType`     | Master | Growth types         |
| DIAG-P44 | Antibiotics (CS) | `/diagnosis/CSAntibiotic`     | Master | Antibiotic names     |

### 1g. Report configuration

| ID       | Page (menu name)                      | URL                                        | Kind   | Purpose / main controls                                                                                  |
| -------- | ------------------------------------- | ------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------- |
| DIAG-P45 | Lab Report PDF Configuration          | `/pdf-config`                              | Config | PDF layout settings; Save Configuration                                                                  |
| DIAG-P46 | Report Print Configuration Group Wise | `/diagnostic/report-title-setting`         | Config | Report titles: Srl.No, Report Title, UserName; New / Save                                                |
| DIAG-P47 | Pathology Report Configs              | `/diagnosis/pathology-reportconfigs`       | Config | Per-test report layout (largest table): Test Id, Name, Title, Result, Unit, Ref. Value, Method, Width    |
| DIAG-P48 | Report Delivery Time Set              | `/diagnostic/Report-Delivery-Time-Setting` | Config | Expected delivery time rules: T.D.S, Is Active, Is Weekend, W.S.T, Entry Time, Delivery Time; New / Save |

### 1h. People

| ID       | Page (menu name)          | URL                                    | Kind   | Purpose / main controls                                                                                                |
| -------- | ------------------------- | -------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| DIAG-P49 | Radiologists              | `/diagnostic/radiologist-list`         | Master | Radiologist list with fee columns (OPD Maiden/New/Old/Report, IPD VISIT, Extra Amount, Speciality); Export, Permission |
| DIAG-P50 | Pathologists              | `/diagnostic/pathologist-list`         | Master | Same layout as P49 for pathologists; Export                                                                            |
| DIAG-P51 | Medical Technologist      | `/diagnostic/Technologist`             | Master | Technologists: Image, ID, Name, Identity1–4                                                                            |
| DIAG-P52 | Report Verifier           | `/diagnostic/ReportVerifiers`          | Master | Report verifiers: Image, Name, Identity1/2/4                                                                           |
| DIAG-P53 | Radiologist Reporting Fee | `/diagnosis/radiologist-reporting-fee` | Master | Fee per doctor and test group: Doctor Name, Test Group, FeeInPercent, FeeInTk                                          |

### 1i. Linked from another module

| ID       | Page (menu name)        | URL                                   | Kind  | Purpose                                                                                                                                   |
| -------- | ----------------------- | ------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-P54 | Edit Patient Basic Info | `/hospital/patientinfoedit-dashboard` | Entry | Hospital-module page for correcting patient details (name, parents, address, IDs); Update Info. Belongs to Registration/Hospital analysis |

### Page-level observations

- **Common Master pattern** (25 pages): heading, Search box, **Add New** / **Reload** buttons, MudBlazor table with a pager,
  and per-row edit/delete icon buttons (unnamed in the accessibility tree). One shared Page Object can cover them.
- **Common Dashboard pattern** (12 pages): Start Date / End Date, Search, **Show** button, table. Also one shared Page Object.
- Test Item (P27) and the two investigation dashboards (P02, P04) use the richer MudDataGrid (Sort / Add Filter / Show Column
  Options per column); the others use the plain MudTable.
- The core lab chain is **P01 → P11 → P12 → P15 → P18/P19 → P24** (entry → sample → acknowledge → result → publish → deliver);
  radiology runs **P01 → P13 → P22 → P23**; microbiology **P01 → P11 → P12 → P16 → P17**.
- Existing test data in `data/` covers P27 (`testitme.md`), P01 (`InvestigationEntry.md`), P11
  (`SampleCollection.md`) and P12 (`sampleack.md`).
- Per-row action icons have no accessible names anywhere in the module — Page Objects will need row-scoped `.mud-icon-button`
  locators (by position or icon), which is worth raising with the dev team as an accessibility fix.

## 2. Workflows

Only pages with test cases in `testcases/` are worked out below; the rest wait for their test cases.

| ID       | Workflow                            | Page(s) | Steps (short)                                                                                                                                                                                                              |
| -------- | ----------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DIAG-W01 | Create an OPD investigation invoice | P01     | Enter UHID (or Mobile / Admission / Employee No / RxId) → Search → patient fields fill → pick Area, Referred by (doctor), Test(s) → totals & Payment (Cash) auto-fill → POST → invoice print opens in a popup, form resets |

## 3. Business rules

Source: **Observed** = seen in the app on 2026-09-26 · **To confirm** = needs the BA/product owner.

| ID        | Rule                                                                                                                                                                                                                                                                                                                                                                                             | Workflow | Source                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------- |
| DIAG-BR01 | UHID search fills Full Name, Age, DOB, Gender, Mobile from the registration record                                                                                                                                                                                                                                                                                                               | W01      | Observed                                                       |
| DIAG-BR02 | **Area** and **Referred by** are required. Without Area, POST does nothing — no message, no red border (silent validation) ⚠️ usability finding                                                                                                                                                                                                                                                  | W01      | Observed                                                       |
| DIAG-BR03 | Adding a test sets Sub Total / Net Payable and pre-fills Payment (Cash) with the net amount (Due 0)                                                                                                                                                                                                                                                                                              | W01      | Observed                                                       |
| DIAG-BR04 | Successful POST opens the invoice print in a new window and clears the form                                                                                                                                                                                                                                                                                                                      | W01      | Observed                                                       |
| DIAG-BR05 | Only one invoice is created when the same entry is saved from several tabs at once. The saving tab shows "Successful Save!" (green snackbar); the others show a snackbar naming the saved invoice: in-flight race → info "This invoice was already saved as FKH… It was not saved again.", just after → danger "Duplicate entry: … already invoiced as FKH… Same entry is allowed after <time>." | W01      | Observed (INV-AUTO-001/002)                                    |
| DIAG-BR06 | The same entry (patient + test qty) is refused for **10 minutes** after it was invoiced; the message gives the time it is allowed again                                                                                                                                                                                                                                                          | W01      | Observed (message: invoiced 05:52 PM → allowed after 06:02 PM) |
| DIAG-BR07 | Adding blood tests auto-adds tube charges (Vacutainer Needle / Gray / Red 4ml, 18 Tk each) as extra grid rows                                                                                                                                                                                                                                                                                    | W01      | Observed                                                       |
| DIAG-BR08 | Grid columns **D.Date / D.Time are the report delivery date/time**, set per test by the delivery-time mapping (P48 Report Delivery Time Set) — e.g. CBC/RBS rows show entry + 3 h. Tube-charge rows are not tests and show the entry time                                                                                                                                                        | W01      | Confirmed by QA (2026-09-26)                                   |
| DIAG-BR09 | Discount applies to **Discountable(TK)** only: tests whose master flag `isDiscountAllow` is true (e.g. not CBC Govt, Lipid Profile, Urine C/S 700; never tube charges). Disc(%) ↔ Disc(Tk) update each other on every keystroke                                                                                                                                                                  | W01      | Observed; flags from TestItem master                           |
| DIAG-BR10 | **General Discount is capped at 15 % of Discountable.** A higher Disc(Tk) is reset to 0 (Disc(%) stops at 15) and the app shows "You are not allowed to provide more than 15% from this category" | W01 | Observed (INV-AUTO-018; 1680 discountable → max 252 Tk) |
| DIAG-BR11 | Payment (Cash) is pre-filled with Net Payable; Due = Net − Cash. A cash amount **above** Net Payable is reset to **0** with "Please input correct value" — the whole bill then shows as Due until cash is re-entered | W01 | Observed (INV-AUTO-017) |
| DIAG-BR12 | Dashboard Status is **Paid** when due = 0, **Due** otherwise. Ledger: Service Cost (Dr = Sub Total), Discount (Cr), Payment(Cash) (Cr); Dr − Cr = due                                                                                                                                                                                                                                            | W01      | Observed (INV-AUTO-005/006/007/030)                            |
| DIAG-BR13 | Entry date/time = the moment of POST on the **server clock**, not page-load time; ledger tranDate and dashboard Entry Date/Time match it                                                                                                                                                                                                                                                         | W01      | Observed (INV-AUTO-010/011)                                    |
| DIAG-BR14 | ⚠️ API: `GetInvoiceByInvoiceNo` returns `dueAmount: 0` even for Due invoices; `GetInvoiceByStartAndEndDate` returns the correct due                                                                                                                                                                                                                                                              | —        | Observed — report to dev                                       |
| DIAG-BR15 | ⚠️ Environment: the server clock runs ~79 s behind this test PC (Windows Time service stopped on the PC). Printed invoices go to the server printer — no invoice document reaches the browser; `InvestigationInvoice/Print` API returns 500                                                                                                                                                      | —        | Observed 2026-09-26                                            |

## 4. Test scenarios

| ID        | Scenario                                                                                                      | Rule(s)    | Type        | Priority | Test case                   |
| --------- | ------------------------------------------------------------------------------------------------------------- | ---------- | ----------- | -------- | --------------------------- |
| DIAG-TS01 | Same entry (CBC + RBS + Lipid Profile) saved from 3 tabs at the same moment → exactly one invoice             | BR05       | Integration | Critical | INV-AUTO-001                |
| DIAG-TS05 | Same entry saved from 3 tabs almost simultaneously (Tab 1 at T1, others +300 / +600 ms) → exactly one invoice | BR05       | Integration | Critical | INV-AUTO-002                |
| DIAG-TS02 | POST without Area → no invoice, and the user is told why (today: nothing happens, no message)                 | BR02       | Negative    | P2       | (suggested)                 |
| DIAG-TS03 | Repeat POST of the same test within the duplicate window → refused with a message                             | BR06       | Negative    | P2       | (suggested)                 |
| DIAG-TS04 | Losing tabs in TS01/TS05 show the duplicate message with the saved invoice number                             | BR05       | UI          | P2       | INV-AUTO-001/002 (asserted) |
| DIAG-TS06 | Six tests (CBC, FBS, TSH, Lipid Profile, Urine C/S, X-Ray) in one entry are all billed                        | BR07       | Positive    | High     | INV-AUTO-004                |
| DIAG-TS07 | 10 % discount = 10 % of Discountable; Net = Sub − Discount; ledger has the discount line                      | BR09, BR12 | Positive    | High     | INV-AUTO-005                |
| DIAG-TS08 | Full payment → Paid, due 0                                                                                    | BR11, BR12 | Positive    | High     | INV-AUTO-006                |
| DIAG-TS09 | Partial payment → Due, due = Net − Paid                                                                       | BR11, BR12 | Positive    | High     | INV-AUTO-007                |
| DIAG-TS10 | Page open 3 min, then save → entry time = save time, invoice record consistent                                | BR13       | Integration | Critical | INV-AUTO-010/011            |
| DIAG-TS11 | Double-click POST → one invoice                                                                               | BR05       | Negative    | Critical | INV-AUTO-023                |
| DIAG-TS12 | Discount Tk + partial payment: Total − Discount = Net; Net − Paid = Due (UI, ledger, list API, dashboard)     | BR09–BR12  | Integration | Critical | INV-AUTO-030                |

## 5. Automation candidates

| Scenario             | Decision | Layer    | Creates data?                    | Spec                                   | Status                                                                                        |
| -------------------- | -------- | -------- | -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| DIAG-TS01            | Automate | UI + API | Yes: 1 patient + 1 invoice / run | `tests/investigation-entry.spec.ts`    | Done — passes (2026-09-26)                                                                    |
| DIAG-TS05            | Automate | UI + API | Yes: 1 patient + 1 invoice / run | same file                              | Done — passes (2026-09-26)                                                                    |
| DIAG-TS02            | Automate | UI       | No                               | same file                              | Waiting for a test case; currently fails silently, so expected behaviour must be agreed first |
| DIAG-TS03            | Later    | UI + API | Yes                              | —                                      | Needs the window length confirmed                                                             |
| DIAG-TS04            | Automate | UI       | —                                | `tests/investigation-entry.spec.ts`    | Done — asserted in INV-AUTO-001/002                                                           |
| DIAG-TS06–TS09, TS12 | Automate | UI + API | Yes: 1 patient + 1 invoice each  | `tests/investigation-billing.spec.ts`  | Done — pass (2026-09-26)                                                                      |
| DIAG-TS10            | Automate | UI + API | Yes: 1 patient + 1 invoice       | `tests/investigation-datetime.spec.ts` | Done — pass (2026-09-26); waits `INV_WAIT_MIN` (3) min                                        |
| DIAG-TS11            | Automate | UI + API | Yes: 1 patient + 1 invoice       | `tests/investigation-entry.spec.ts`    | Done — pass (2026-09-26)                                                                      |

INV-AUTO-001/002 design notes: each run registers a fresh patient (registration module) so BR06 cannot interfere; the tabs are
pages in one browser context (same user session); the POST clicks are fired with `Promise.all` (002 staggers them by `INV_STAGGER_MS`, default 300 ms); the result is checked
with `InvestigationInvoice/GetInvoiceByUHID` (before/after count) plus "form cleared" per tab. `INV_TABS=2` runs the
2-tab variant. Diagnostic screens need a ≥1400px-wide viewport (set in `playwright.config.ts`) — narrower, the totals
panel overlaps the form and swallows clicks.

## Open questions

- P15 LAB Result Entry showed no content when opened directly — does it need a Lab No first, or a different role?
- Which of the 54 pages are actually used at this hospital? (Mapping every master page is low value if half are unused.)
- Which roles use P11–P14 (sample flow) — is admin enough for automation, or do we need lab-user credentials?
