# Pharmacy Module – Sample Data

Sob page e same product ar ID use kora hoyeche, jate data gulo ekta arekta r sathe mile.

---

## 1. `/pharmacy/products`

| Product ID | Product Name | Generic Name | Brand | Category | Strength | Unit | Reorder Level | Status |
|---|---|---|---|---|---|---|---|---|
| PRD-001 | Napa | Paracetamol | Beximco | Tablet | 500 mg | Strip (10) | 50 | Active |
| PRD-002 | Seclo | Omeprazole | Square | Capsule | 20 mg | Strip (14) | 40 | Active |
| PRD-003 | Ceftron | Ceftriaxone | Incepta | Injection | 1 gm | Vial | 30 | Active |
| PRD-004 | Monas | Montelukast | ACME | Tablet | 10 mg | Strip (10) | 25 | Active |
| PRD-005 | Normal Saline | Sodium Chloride | Opsonin | IV Fluid | 0.9% 500 ml | Bag | 100 | Active |
| PRD-006 | Azithrocin | Azithromycin | Beximco | Tablet | 500 mg | Strip (3) | 20 | Inactive |

---

## 2. `/pharmacy/brandnames`

| Brand ID | Brand Name | Manufacturer | Country | Contact Person | Phone | Status |
|---|---|---|---|---|---|---|
| BR-01 | Beximco | Beximco Pharmaceuticals Ltd. | Bangladesh | Rahim Uddin | 01711-000001 | Active |
| BR-02 | Square | Square Pharmaceuticals PLC | Bangladesh | Karim Hossain | 01711-000002 | Active |
| BR-03 | Incepta | Incepta Pharmaceuticals Ltd. | Bangladesh | Nasrin Akter | 01711-000003 | Active |
| BR-04 | ACME | The ACME Laboratories Ltd. | Bangladesh | Jamal Ahmed | 01711-000004 | Active |
| BR-05 | Opsonin | Opsonin Pharma Ltd. | Bangladesh | Sumon Das | 01711-000005 | Active |

---

## 3. `/pharmacy/stock-record-new`

**Purchase Info:** GRN No: GRN-2026-0915 | Supplier: Beximco Pharmaceuticals Ltd. | Invoice No: INV-88421 | Date: 15-09-2026

| Product | Batch No | Mfg Date | Expiry Date | Qty | Free Qty | Purchase Price (৳) | MRP (৳) | Total (৳) |
|---|---|---|---|---|---|---|---|---|
| Napa 500 mg | NP2608A | 08-2026 | 07-2028 | 200 | 10 | 9.50 | 12.00 | 1,900.00 |
| Seclo 20 mg | SC2607B | 07-2026 | 06-2028 | 100 | 5 | 70.00 | 84.00 | 7,000.00 |
| Ceftron 1 gm | CF2605C | 05-2026 | 04-2028 | 50 | 0 | 160.00 | 190.00 | 8,000.00 |
| Monas 10 mg | MN2606D | 06-2026 | 05-2028 | 80 | 4 | 135.00 | 160.00 | 10,800.00 |

**Sub Total:** ৳27,700.00 | **Discount:** ৳700.00 | **VAT:** ৳0.00 | **Grand Total:** ৳27,000.00

---

## 4. `/pharmacy/pharmacy-sale` (OPD / Walk-in Sale)

**Invoice No:** PS-2026-10245 | **Date:** 24-09-2026 | **Customer:** Md. Arif Hasan | **Phone:** 01812-345678 | **Doctor:** Dr. Farhana Islam

| Product | Batch No | Expiry | Qty | Unit Price (৳) | Discount (%) | Total (৳) |
|---|---|---|---|---|---|---|
| Napa 500 mg | NP2608A | 07-2028 | 2 strip | 12.00 | 0 | 24.00 |
| Seclo 20 mg | SC2607B | 06-2028 | 1 strip | 84.00 | 5 | 79.80 |
| Monas 10 mg | MN2606D | 05-2028 | 1 strip | 160.00 | 5 | 152.00 |

**Sub Total:** ৳255.80 | **Paid:** ৳260.00 | **Change:** ৳4.20 | **Payment Method:** Cash

---

## 5. `/pharmacy/pharmacy-ipd-sale` (Indoor Patient)

**Invoice No:** IPD-PS-2026-0512 | **Date:** 24-09-2026 | **Patient ID:** IPD-45872 | **Patient Name:** Shahana Begum | **Ward/Bed:** Female Ward / B-12 | **Consultant:** Dr. Mahmudul Hasan

| Product | Batch No | Qty | Unit Price (৳) | Total (৳) | Issued By |
|---|---|---|---|---|---|
| Ceftron 1 gm | CF2605C | 2 vial | 190.00 | 380.00 | Nurse Rupa |
| Normal Saline 500 ml | NS2604E | 3 bag | 95.00 | 285.00 | Nurse Rupa |
| Napa 500 mg | NP2608A | 1 strip | 12.00 | 12.00 | Nurse Rupa |

**Total:** ৳677.00 | **Payment Status:** Added to Patient Bill (Due)

---

## 6. `/pharmacy/product-return`

| Return ID | Return Date | Return Type | Ref Invoice | Product | Batch No | Qty | Unit Price (৳) | Refund (৳) | Reason |
|---|---|---|---|---|---|---|---|---|---|
| RT-0101 | 22-09-2026 | Customer Return | PS-2026-10231 | Seclo 20 mg | SC2607B | 1 strip | 84.00 | 84.00 | Doctor changed prescription |
| RT-0102 | 23-09-2026 | IPD Return | IPD-PS-2026-0498 | Normal Saline 500 ml | NS2604E | 2 bag | 95.00 | 190.00 | Patient discharged |
| RT-0103 | 23-09-2026 | Supplier Return | GRN-2026-0870 | Azithrocin 500 mg | AZ2501F | 20 strip | 105.00 | 2,100.00 | Near expiry |
| RT-0104 | 24-09-2026 | Supplier Return | GRN-2026-0915 | Ceftron 1 gm | CF2605C | 3 vial | 160.00 | 480.00 | Damaged vial |

---

## 7. `/pharmacy/outlet-indent`

**Indent No:** IND-2026-0331 | **Date:** 24-09-2026 | **Requested By:** OT Outlet (Sub-store) | **Request To:** Main Pharmacy Store | **Priority:** Urgent

| Product | Current Stock (Outlet) | Requested Qty | Approved Qty | Status |
|---|---|---|---|---|
| Ceftron 1 gm | 5 vial | 30 vial | 25 vial | Approved |
| Normal Saline 500 ml | 12 bag | 60 bag | 60 bag | Approved |
| Napa 500 mg | 20 strip | 50 strip | 50 strip | Approved |
| Monas 10 mg | 0 strip | 10 strip | 0 | Rejected (not needed in OT) |

**Remarks:** Weekend surgery schedule er jonno extra stock dorkar.

---

## 8. `/pharmacy/PhStock-Tranfer`

| Transfer No | Date | From Store | To Store | Ref Indent | Product | Batch No | Qty | Status | Received By |
|---|---|---|---|---|---|---|---|---|---|
| TRF-0781 | 24-09-2026 | Main Store | OT Outlet | IND-2026-0331 | Ceftron 1 gm | CF2605C | 25 vial | Received | Nurse Mitu |
| TRF-0781 | 24-09-2026 | Main Store | OT Outlet | IND-2026-0331 | Normal Saline 500 ml | NS2604E | 60 bag | Received | Nurse Mitu |
| TRF-0781 | 24-09-2026 | Main Store | OT Outlet | IND-2026-0331 | Napa 500 mg | NP2608A | 50 strip | Received | Nurse Mitu |
| TRF-0782 | 24-09-2026 | Main Store | Emergency Outlet | IND-2026-0332 | Seclo 20 mg | SC2607B | 20 strip | In Transit | — |

---

## 9. `/pharmacy/exists-product-update`

| Product ID | Product Name | Field Updated | Old Value | New Value | Updated By | Update Date | Reason |
|---|---|---|---|---|---|---|---|
| PRD-001 | Napa 500 mg | MRP | ৳10.00 | ৳12.00 | Admin (Rafiq) | 20-09-2026 | Company price revision |
| PRD-002 | Seclo 20 mg | Reorder Level | 25 | 40 | Pharmacist (Tania) | 21-09-2026 | High demand |
| PRD-004 | Monas 10 mg | Category | Syrup | Tablet | Admin (Rafiq) | 22-09-2026 | Data entry correction |
| PRD-006 | Azithrocin 500 mg | Status | Active | Inactive | Admin (Rafiq) | 23-09-2026 | Supplier discontinued |
| PRD-005 | Normal Saline | Rack Location | R-02 | R-07 | Store Keeper (Babul) | 24-09-2026 | Store re-arrangement |