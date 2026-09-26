| # | Investigation Name | Investigation Code | Department | Sample Type | Unit | Rate | Status |
|---|---|---|---|---|---|---:|---|
| 1 | Complete Blood Count (CBC) | LAB-CBC-001 | Hematology | Blood | Test | 500.00 | Active |
| 2 | Hemoglobin (Hb) | LAB-HB-002 | Hematology | Blood | g/dL | 200.00 | Active |
| 3 | ESR | LAB-ESR-003 | Hematology | Blood | mm/hr | 150.00 | Active |
| 4 | Blood Sugar - Fasting | LAB-FBS-004 | Biochemistry | Blood | mmol/L | 250.00 | Active |
| 5 | Blood Sugar - 2 Hours After Breakfast | LAB-PPBS-005 | Biochemistry | Blood | mmol/L | 250.00 | Active |
| 6 | Serum Creatinine | LAB-CREA-006 | Biochemistry | Blood | mg/dL | 300.00 | Active |
| 7 | Lipid Profile | LAB-LIPID-007 | Biochemistry | Blood | Test | 800.00 | Active |
| 8 | Liver Function Test (LFT) | LAB-LFT-008 | Biochemistry | Blood | Test | 1200.00 | Active |
| 9 | Kidney Function Test (KFT) | LAB-KFT-009 | Biochemistry | Blood | Test | 1000.00 | Active |
| 10 | Thyroid Stimulating Hormone (TSH) | LAB-TSH-010 | Hormone | Blood | µIU/mL | 600.00 | Active |
| 11 | Free T3 | LAB-FT3-011 | Hormone | Blood | pg/mL | 650.00 | Active |
| 12 | Free T4 | LAB-FT4-012 | Hormone | Blood | ng/dL | 650.00 | Active |
| 13 | Urine R/E | LAB-URE-013 | Clinical Pathology | Urine | Test | 200.00 | Active |
| 14 | Urine C/S | LAB-UCS-014 | Microbiology | Urine | Test | 700.00 | Active |
| 15 | Stool R/E | LAB-SRE-015 | Clinical Pathology | Stool | Test | 250.00 | Active |
| 16 | Blood Group & Rh Typing | LAB-BGR-016 | Hematology | Blood | Test | 200.00 | Active |
| 17 | HbA1c | LAB-HBA1C-017 | Biochemistry | Blood | % | 700.00 | Active |
| 18 | Serum Uric Acid | LAB-UA-018 | Biochemistry | Blood | mg/dL | 350.00 | Active |
| 19 | Serum Calcium | LAB-CAL-019 | Biochemistry | Blood | mg/dL | 350.00 | Active |
| 20 | Vitamin D (25-OH) | LAB-VITD-020 | Immunology | Blood | ng/mL | 1500.00 | Active |

| Test Case | Investigation Name | Code | Rate | Expected |
|---|---|---|---:|---|
| Duplicate Name | Complete Blood Count (CBC) | LAB-CBC-001 | 500 | Duplicate should be prevented |
| Duplicate Code | Serum Creatinine | LAB-CREA-006 | 300 | Duplicate code should be prevented |
| Empty Name | [Blank] | LAB-EMPTY-001 | 300 | Required validation |
| Empty Code | Test Investigation | [Blank] | 300 | Required validation |
| Zero Rate | Zero Rate Test | LAB-ZERO-001 | 0 | Validate based on business rule |
| Negative Rate | Negative Rate Test | LAB-NEG-001 | -100 | Should not allow |
| Decimal Rate | Decimal Rate Test | LAB-DEC-001 | 125.50 | Should accept |
| Long Name | Complete Blood Count Investigation With Differential Leukocyte Count And Platelet Analysis | LAB-LONG-001 | 1500 | Check max length/UI |
| Special Character | CBC & ESR (Routine) | LAB-SPL-001 | 500 | Check special character handling |
| Numeric Name | 123456789 | LAB-NUM-001 | 100 | Validate name rules |
| Spaces Only | `     ` | LAB-SPACE-001 | 100 | Should not accept |
| Duplicate With Case | complete blood count (cbc) | LAB-CBC-CASE | 500 | Check case sensitivity |


Search Term
-----------
CBC
Blood
Serum
Urine
Thyroid
LAB-CBC-001
500
Complete
Creatinine
Vitamin

