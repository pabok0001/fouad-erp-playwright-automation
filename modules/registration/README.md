# Registration

> Status: Draft · Explored: 2026-09-26 · Folder: `modules/registration/` · API spec: `tests/api/reg-record.api.spec.ts` ·

Hierarchy: **Module → Page → Workflow → Business Rule → Test Scenario → Automation Candidate**.

## 1. Pages

| ID      | Page (menu name)                 | URL                         | Purpose                                                    |
| ------- | -------------------------------- | --------------------------- | ---------------------------------------------------------- |
| REG-P01 | PATIENT REGISTRATION             | `/hospital/newregistration` | List of registered patients, filtered by registration date |
| REG-P02 | Create Patient (via **Add New**) | `/hospital/patients/new`    | Register a new patient or look one up by UHID / mobile     |

REG-P02 has three tabs: **Patient**, **Contact Person**, **Corporate Client** (only Patient is mapped so far).

## 2. Workflows

| ID      | Workflow                               | Page(s)   | Steps (short)                                                                            |
| ------- | -------------------------------------- | --------- | ---------------------------------------------------------------------------------------- |
| REG-W01 | Register a new patient                 | P01 → P02 | Add New → fill Patient tab → Confirm Registeration → success dialog with Patient ID → OK |
| REG-W02 | Find registrations by date             | P01       | Set Show From / Show To → Show → list updates (pager "x-y of n")                         |
| REG-W03 | Search the patient list                | P01       | Type in Search → rows filter                                                             |
| REG-W04 | Look up an existing patient            | P02       | Enter UHID or Mobile No → Search → form loads the patient; CLEAR resets                  |
| REG-W05 | Print patient ID card                  | P02       | After W04 or W01 → Print ID CARD (disabled until a patient is loaded)                    |
| REG-W06 | Fill contact person / corporate client | P02       | Next / Previews move between tabs                                                        |

## 3. Business rules

Source: **Observed** = seen in the app · **To confirm** = needs the BA/product owner.

| ID       | Rule                                                                                       | Workflow | Source                                  |
| -------- | ------------------------------------------------------------------------------------------ | -------- | --------------------------------------- |
| REG-BR01 | Required: Full Name, Gender, DOB, Blood Group, Mobile No (marked `*`, show "Required")     | W01      | Observed                                |
| REG-BR02 | Successful save shows "New Patient SuccessFully Save, Patient ID NNNN"                     | W01      | Observed                                |
| REG-BR03 | DOB is picked from the calendar only (the field is readonly)                               | W01      | Observed                                |
| REG-BR04 | Age Year / Month / Day are calculated from DOB                                             | W01      | To confirm                              |
| REG-BR05 | District and Thana are chosen from a search list (autocomplete); Thana depends on District | W01      | Observed / To confirm (dependency)      |
| REG-BR06 | Mobile No format (length 11, starts with `01`)                                             | W01      | To confirm                              |
| REG-BR07 | Duplicate check: same mobile / NID for an existing patient is warned or blocked            | W01      | To confirm                              |
| REG-BR08 | DOB in the future is not allowed                                                           | W01      | To confirm                              |
| REG-BR09 | List defaults to today's date range; Show From must not be after Show To                   | W02      | Observed (default) / To confirm (order) |
| REG-BR10 | Print ID CARD is disabled until a patient is loaded                                        | W04, W05 | Observed                                |
| REG-BR11 | A new patient appears in the list and in the API (`RegRecord/GetByRegDates`) for today     | W01, W02 | To confirm                              |

## 4. Test scenarios

| ID       | Scenario                                                                          | Rule(s)    | Type                | Priority |
| -------- | --------------------------------------------------------------------------------- | ---------- | ------------------- | -------- |
| REG-TS01 | Register a patient with all valid data → Patient ID returned                      | BR01, BR02 | Positive            | P1       |
| REG-TS02 | Register with only the required fields                                            | BR01       | Positive            | P1       |
| REG-TS03 | Confirm with the form empty → each required field shows "Required", nothing saved | BR01       | Negative            | P1       |
| REG-TS04 | Leave out each required field one at a time                                       | BR01       | Negative            | P2       |
| REG-TS05 | Pick a DOB → age Year/Month/Day filled correctly                                  | BR03, BR04 | Positive            | P2       |
| REG-TS06 | Future DOB / DOB = today                                                          | BR08       | Boundary            | P2       |
| REG-TS07 | Mobile No: 10 digits, 12 digits, letters, not starting with `01`                  | BR06       | Negative            | P2       |
| REG-TS08 | Register the same mobile / NID twice                                              | BR07       | Negative            | P2       |
| REG-TS09 | District → Thana list shows only that district's thanas                           | BR05       | Positive            | P3       |
| REG-TS10 | New patient is listed for today on REG-P01 and found by Search                    | BR11       | Integration         | P1       |
| REG-TS11 | New patient returned by `RegRecord/RegNo/{uhid}` API with the same name           | BR11       | Integration         | P1       |
| REG-TS12 | Date filter: last 7 days returns rows; From after To handled                      | BR09       | Positive / Negative | P2       |
| REG-TS13 | Look up a patient by UHID and by mobile; CLEAR resets the form                    | W04        | Positive            | P2       |
| REG-TS14 | Print ID CARD disabled before lookup, enabled after                               | BR10       | UI                  | P3       |
| REG-TS15 | Look up a non-existent UHID → clear "not found" feedback                          | W04        | Negative            | P3       |

## 5. Automation candidates

| Scenario | Decision               | Layer           | Creates data?           | Spec                                 | Status                           |
| -------- | ---------------------- | --------------- | ----------------------- | ------------------------------------ | -------------------------------- |
| REG-TS01 | Automate               | UI              | Yes                     | `tests/patient-registration.spec.ts` | Done                             |
| REG-TS02 | Automate               | UI              | Yes                     | same file                            | To do                            |
| REG-TS03 | Automate               | UI              | No                      | same file                            | To do                            |
| REG-TS04 | Automate (data-driven) | UI              | No                      | same file                            | To do                            |
| REG-TS05 | Automate               | UI              | No                      | same file                            | To do (after BR04 confirmed)     |
| REG-TS06 | Automate               | UI              | Maybe (if accepted)     | same file                            | To do (after BR08 confirmed)     |
| REG-TS07 | Automate (data-driven) | UI              | Maybe                   | same file                            | To do (after BR06 confirmed)     |
| REG-TS08 | Automate               | UI              | Yes                     | same file                            | To do (after BR07 confirmed)     |
| REG-TS09 | Later                  | UI              | No                      | —                                    | Needs District/Thana master data |
| REG-TS10 | Automate (extend TS01) | UI              | — (uses TS01's patient) | same file                            | To do                            |
| REG-TS11 | Automate (extend TS01) | UI + API        | — (uses TS01's patient) | same file                            | To do                            |
| REG-TS12 | Automate               | API (done) + UI | No                      | `tests/api/reg-record.api.spec.ts`   | API done, UI to do               |
| REG-TS13 | Automate               | UI              | No                      | new `patient-lookup.spec.ts`         | To do                            |
| REG-TS14 | Automate (with TS13)   | UI              | No                      | `patient-lookup.spec.ts`             | To do                            |
| REG-TS15 | Automate               | UI              | No                      | `patient-lookup.spec.ts`             | To do                            |

Priority order to build: TS03 → TS10/TS11 → TS13–15 (all no new data) → TS02 → rest once the "To confirm" rules are answered.

## Open questions

- BR04, BR06–BR09, BR11: expected behaviour (please confirm).
- Is it OK to create real patients on this server for every run, or should create-tests run only on demand?
- Contact Person and Corporate Client tabs: which fields are required, and when are they used?
- ACTION column on the list: which actions exist (edit / view / print)? No rows today to check.
