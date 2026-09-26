# Diagnosis Test Items

## Page
`/diagnosis/testitems`

## Test Data

| SL | Test Item Name | Short Name | Category | Sample Type | Unit | Reference Range | Status |
|---:|---|---|---|---|---|---|---|
| 1 | Complete Blood Count | CBC | Hematology | Blood | - | - | Active |
| 2 | Hemoglobin | Hb | Hematology | Blood | g/dL | 12–16 | Active |
| 3 | Total WBC Count | WBC | Hematology | Blood | cells/µL | 4,000–11,000 | Active |
| 4 | Platelet Count | PLT | Hematology | Blood | cells/µL | 150,000–450,000 | Active |
| 5 | Blood Glucose Fasting | FBS | Biochemistry | Blood | mg/dL | 70–100 | Active |
| 6 | Blood Glucose Random | RBS | Biochemistry | Blood | mg/dL | 70–140 | Active |
| 7 | Serum Creatinine | Creatinine | Biochemistry | Serum | mg/dL | 0.6–1.3 | Active |
| 8 | Blood Urea | Urea | Biochemistry | Serum | mg/dL | 15–45 | Active |
| 9 | Serum Uric Acid | Uric Acid | Biochemistry | Serum | mg/dL | 3.5–7.2 | Active |
| 10 | Total Cholesterol | TC | Biochemistry | Serum | mg/dL | <200 | Active |
| 11 | Triglycerides | TG | Biochemistry | Serum | mg/dL | <150 | Active |
| 12 | HDL Cholesterol | HDL | Biochemistry | Serum | mg/dL | >40 | Active |
| 13 | LDL Cholesterol | LDL | Biochemistry | Serum | mg/dL | <100 | Active |
| 14 | SGPT / ALT | ALT | Biochemistry | Serum | U/L | 7–56 | Active |
| 15 | SGOT / AST | AST | Biochemistry | Serum | U/L | 10–40 | Active |
| 16 | Serum Bilirubin | Bilirubin | Biochemistry | Serum | mg/dL | 0.2–1.2 | Active |
| 17 | Thyroid Stimulating Hormone | TSH | Hormone | Serum | µIU/mL | 0.4–4.0 | Active |
| 18 | Free T4 | FT4 | Hormone | Serum | ng/dL | 0.8–1.8 | Active |
| 19 | Urine Routine Examination | Urine R/E | Clinical Pathology | Urine | - | - | Active |
| 20 | Stool Routine Examination | Stool R/E | Clinical Pathology | Stool | - | - | Active |
| 21 | Chest X-Ray | CXR | Radiology | X-Ray | - | - | Active |
| 22 | Ultrasonography Whole Abdomen | USG W/A | Radiology | Ultrasound | - | - | Active |
| 23 | Electrocardiogram | ECG | Cardiology | ECG | - | - | Active |
| 24 | HbA1c | HbA1c | Biochemistry | Blood | % | <5.7 | Active |
| 25 | C-Reactive Protein | CRP | Immunology | Serum | mg/L | <10 | Active |

## Duplicate Test Data

| Test Item Name | Short Name | Expected |
|---|---|---|
| Serum Creatinine | Creatinine | Duplicate validation |
| Hemoglobin | Hb | Duplicate validation |
| Blood Glucose Fasting | FBS | Duplicate validation |
| Total Cholesterol | TC | Duplicate validation |

## Validation Test Data

| Test Case | Test Item Name |
|---|---|
| Empty | |
| Single Character | A |
| Numeric Only | 12345 |
| Special Character | @@@### |
| Leading Space | ` Serum Creatinine` |
| Trailing Space | `Serum Creatinine ` |
| Long Name | Complete Blood Count Test Item With Very Long Name For Validation Testing |
| Special Characters | C-Reactive Protein (CRP) |
| Slash Character | SGPT / ALT |
| Ampersand | T3 & T4 |

## Status Test Data

| Test Item Name | Status |
|---|---|
| Active CBC Test | Active |
| Inactive CBC Test | Inactive |
| Active Creatinine Test | Active |
| Inactive Creatinine Test | Inactive |

## Search Test Data

```text
CBC
Creatinine
Blood
Serum
Hematology
Biochemistry
HbA1c
Urine
X-Ray
ECG
CRP


# Diagnostic Investigation

## Page
`/diagnostic/investigation`

## Investigation Test Data

| SL | Investigation Name | Short Name | Department | Sample Type | Unit | Status |
|---:|---|---|---|---|---|---|
| 1 | Complete Blood Count | CBC | Hematology | Blood | - | Active |
| 2 | Hemoglobin | Hb | Hematology | Blood | g/dL | Active |
| 3 | Total WBC Count | WBC | Hematology | Blood | cells/µL | Active |
| 4 | Platelet Count | PLT | Hematology | Blood | cells/µL | Active |
| 5 | Blood Glucose Fasting | FBS | Biochemistry | Blood | mg/dL | Active |
| 6 | Blood Glucose Random | RBS | Biochemistry | Blood | mg/dL | Active |
| 7 | Serum Creatinine | Creatinine | Biochemistry | Serum | mg/dL | Active |
| 8 | Blood Urea | Urea | Biochemistry | Serum | mg/dL | Active |
| 9 | Serum Uric Acid | Uric Acid | Biochemistry | Serum | mg/dL | Active |
| 10 | Total Cholesterol | TC | Biochemistry | Serum | mg/dL | Active |
| 11 | Triglycerides | TG | Biochemistry | Serum | mg/dL | Active |
| 12 | HDL Cholesterol | HDL | Biochemistry | Serum | mg/dL | Active |
| 13 | LDL Cholesterol | LDL | Biochemistry | Serum | mg/dL | Active |
| 14 | SGPT / ALT | ALT | Biochemistry | Serum | U/L | Active |
| 15 | SGOT / AST | AST | Biochemistry | Serum | U/L | Active |
| 16 | Serum Bilirubin | Bilirubin | Biochemistry | Serum | mg/dL | Active |
| 17 | Thyroid Stimulating Hormone | TSH | Hormone | Serum | µIU/mL | Active |
| 18 | Free T4 | FT4 | Hormone | Serum | ng/dL | Active |
| 19 | Urine Routine Examination | Urine R/E | Clinical Pathology | Urine | - | Active |
| 20 | Stool Routine Examination | Stool R/E | Clinical Pathology | Stool | - | Active |
| 21 | Chest X-Ray | CXR | Radiology | X-Ray | - | Active |
| 22 | Ultrasonography Whole Abdomen | USG W/A | Radiology | Ultrasound | - | Active |
| 23 | Electrocardiogram | ECG | Cardiology | ECG | - | Active |
| 24 | HbA1c | HbA1c | Biochemistry | Blood | % | Active |
| 25 | C-Reactive Protein | CRP | Immunology | Serum | mg/L | Active |
| 26 | Serum Calcium | Calcium | Biochemistry | Serum | mg/dL | Active |
| 27 | Serum Sodium | Sodium | Biochemistry | Serum | mmol/L | Active |
| 28 | Serum Potassium | Potassium | Biochemistry | Serum | mmol/L | Active |
| 29 | Serum Albumin | Albumin | Biochemistry | Serum | g/dL | Active |
| 30 | Alkaline Phosphatase | ALP | Biochemistry | Serum | U/L | Active |

## Investigation Category Data

| Category | Sample Investigations |
|---|---|
| Hematology | CBC, Hemoglobin, WBC, Platelet Count |
| Biochemistry | FBS, RBS, Creatinine, Urea, Cholesterol |
| Clinical Pathology | Urine R/E, Stool R/E |
| Hormone | TSH, Free T4 |
| Immunology | CRP |
| Radiology | Chest X-Ray, USG Whole Abdomen |
| Cardiology | ECG |

## Duplicate Test Data

| Investigation Name | Short Name | Expected |
|---|---|---|
| Complete Blood Count | CBC | Duplicate validation |
| Serum Creatinine | Creatinine | Duplicate validation |
| Blood Glucose Fasting | FBS | Duplicate validation |
| Thyroid Stimulating Hormone | TSH | Duplicate validation |

## Validation Test Data

| Test Case | Investigation Name |
|---|---|
| Empty | |
| Single Character | A |
| Numeric Only | 12345 |
| Special Character | @@@### |
| Leading Space | ` Serum Creatinine` |
| Trailing Space | `Serum Creatinine ` |
| Long Name | Complete Blood Count Investigation Test Item With Very Long Name For Validation |
| Special Characters | C-Reactive Protein (CRP) |
| Slash Character | SGPT / ALT |
| Ampersand | T3 & T4 |

## Status Test Data

| Investigation Name | Status |
|---|---|
| Active CBC Investigation | Active |
| Inactive CBC Investigation | Inactive |
| Active Creatinine Investigation | Active |
| Inactive Creatinine Investigation | Inactive |

## Search Test Data

```text
CBC
Creatinine
Blood
Serum
Hematology
Biochemistry
TSH
Urine
X-Ray
ECG
CRP
Cholesterol

