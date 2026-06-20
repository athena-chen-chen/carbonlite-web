# CarbonLite Test Data Library

This library contains **50 synthetic test files** for CarbonLite upload, extraction, validation, duplicate detection, factor matching, and reporting tests.

All customer names, account numbers, addresses, quantities, and charges are fictional. Canadian provider names are used only to make the fixtures realistic; no affiliation or reproduction of an official bill is claimed.

## Coverage

- Electricity, natural gas, diesel, fuel receipts, water, and utility summaries
- CSV exports and Excel workbooks
- Reporting years 2024, 2025, and 2026
- Alberta, British Columbia, Ontario, New Brunswick, and multi-jurisdiction portfolios
- Clean extraction, missing dates, missing units, OCR errors, multiple facilities, multi-page documents, and incompatible units

## Duplicate and filename scenarios

- File **07** is an exact byte duplicate of file **01**, stored under a different filename.
- File **44** is an exact byte duplicate of file **39**, stored under a different filename.
- Files **09** and **10** are both named `utility_bill.pdf` in separate upload-batch folders, but contain different content.

## Expected results

| ID | File | Test scenario | Expected extraction |
|---:|---|---|---|
| 01 | `electricity/01_enmax_electricity_bill.pdf` | Clean bill | ELECTRICITY: 4280 kWh |
| 02 | `electricity/02_epcor_electricity_statement.pdf` | Clean alternate labels | ELECTRICITY: 12840 kWh |
| 03 | `electricity/03_fortisalberta_distribution_bill.pdf` | Missing dates | ELECTRICITY: 2205 kWh |
| 04 | `electricity/04_bc_hydro_commercial_bill.pdf` | Clean different jurisdiction | ELECTRICITY: 21440 kWh |
| 05 | `electricity/05_hydro_one_multi_site_bill.pdf` | Multi-page and multiple facilities | ELECTRICITY: 18420 kWh |
| 06 | `electricity/06_enmax_ocr_scan.pdf` | OCR errors: O/0 substitution and split unit | ELECTRICITY: 9O5O kW h |
| 07 | `duplicates/enmax_bill_exact_copy_different_name.pdf` | Exact duplicate of file 01 under a different filename | Duplicate hash should match file 01 |
| 08 | `electricity/08_fortisalberta_two_meter_bill.pdf` | Multi-page with two meters | ELECTRICITY: 15990 kWh |
| 09 | `name-collisions/batch-a/utility_bill.pdf` | Same filename, different content: batch A | ELECTRICITY: 6300 kWh |
| 10 | `name-collisions/batch-b/utility_bill.pdf` | Same filename, different content: batch B | ELECTRICITY: 9100 kWh |
| 11 | `natural-gas/11_atco_natural_gas_statement.pdf` | Clean gas statement | NATURAL_GAS: 2860 m3 |
| 12 | `natural-gas/12_enmax_natural_gas_bill.pdf` | Clean gas bill | NATURAL_GAS: 4410 m3 |
| 13 | `natural-gas/13_atco_gas_statement_missing_date.pdf` | Missing dates | NATURAL_GAS: 1730 m3 |
| 14 | `natural-gas/14_fortisbc_natural_gas_statement.pdf` | Clean BC jurisdiction | NATURAL_GAS: 3180 m3 |
| 15 | `natural-gas/15_atco_ocr_statement.pdf` | OCR error: S/5 substitution | NATURAL_GAS: 2,8S0 m³ |
| 16 | `natural-gas/16_enmax_multi_facility_gas_summary.pdf` | Multi-page facility summary | NATURAL_GAS: 5900 m3 |
| 17 | `natural-gas/17_atco_statement_without_unit.pdf` | Missing unit | NATURAL_GAS: 950 [missing unit] |
| 18 | `diesel/18_commercial_diesel_invoice.pdf` | Clean diesel invoice | DIESEL: 1240 L |
| 19 | `diesel/19_bulk_diesel_delivery_invoice.pdf` | Clean bulk delivery | DIESEL: 3500 litres |
| 20 | `diesel/20_diesel_delivery_ticket.pdf` | Delivery ticket | DIESEL: 2050 L |
| 21 | `diesel/21_diesel_invoice_ocr_copy.pdf` | OCR error and alternate unit | DIESEL: 875,O LTR |
| 22 | `diesel/22_diesel_invoice_missing_date.pdf` | Missing dates | DIESEL: 760 L |
| 23 | `diesel/23_diesel_invoice_in_tonnes.pdf` | Incompatible unit; must not auto-convert | DIESEL: 1.5 tonnes |
| 24 | `fuel-receipts/24_fleet_fuel_receipt.pdf` | Clean receipt | GASOLINE: 62.4 L |
| 25 | `fuel-receipts/25_fuel_card_receipt.pdf` | Clean receipt | DIESEL: 88.7 L |
| 26 | `fuel-receipts/26_faded_gasoline_receipt.pdf` | OCR error: B/8 substitution | GASOLINE: 4B.2 L |
| 27 | `fuel-receipts/27_receipt_missing_fuel_unit.pdf` | Missing unit | DIESEL: 105.3 [missing unit] |
| 28 | `fuel-receipts/28_combined_fuel_receipt.pdf` | Multi-product receipt | DIESEL: 230 L; GASOLINE: 94 L |
| 29 | `water/29_commercial_water_bill.pdf` | Clean water bill | WATER: 620 m3 |
| 30 | `water/30_water_utility_statement.pdf` | Clean municipal bill | WATER: 910 m3 |
| 31 | `water/31_water_services_statement.pdf` | Clean BC water bill | WATER: 780 m3 |
| 32 | `water/32_water_bill_missing_date.pdf` | Missing dates | WATER: 340 m3 |
| 33 | `water/33_water_statement_without_unit.pdf` | Missing unit | WATER: 415 [missing unit] |
| 34 | `utility-summaries/34_annual_utility_summary_2024.pdf` | Clean annual summary | ELECTRICITY: 58200 kWh; NATURAL_GAS: 22100 m3 |
| 35 | `utility-summaries/35_multi_facility_utility_report_2025.pdf` | Multi-page and multiple facilities | ELECTRICITY: 98400 kWh; WATER: 8140 m3 |
| 36 | `utility-summaries/36_ontario_energy_summary_2026.pdf` | Clean annual report | ELECTRICITY: 110200 kWh |
| 37 | `utility-summaries/37_mixed_utility_report_missing_units.pdf` | Missing units | ELECTRICITY: 44200 [missing unit]; NATURAL_GAS: 18900 [missing unit] |
| 38 | `utility-summaries/38_poorly_formatted_utility_rollup.pdf` | OCR errors and mixed labels | ELECTRIC1TY: 67,4OO kW h; NATURAL GAS: 12 8S0 m³; WATER: 4,220 m3 |
| 39 | `csv/39_clean_activity_export_2024.csv` | Clean normalized CSV | 3 data rows |
| 40 | `csv/40_multiple_facilities_2025.csv` | Multiple facilities | 3 data rows |
| 41 | `csv/41_missing_dates_and_units.csv` | Missing dates and units | 3 data rows |
| 42 | `csv/42_ocr_and_bad_headers.csv` | OCR errors and poor headers | 2 data rows |
| 43 | `csv/43_mixed_years_and_units.csv` | Multiple years and incompatible units | 3 data rows |
| 44 | `csv/44_clean_activity_export_copy.csv` | Exact duplicate of file 39 under a different filename | Exact SHA-256 duplicate of file 39 |
| 45 | `xlsx/45_electricity_workbook_2024_2026.xlsx` | Clean multi-year electricity workbook | 1 sheet(s) |
| 46 | `xlsx/46_natural_gas_multi_facility.xlsx` | Natural gas, multiple facilities | 1 sheet(s) |
| 47 | `xlsx/47_fuel_purchase_export.xlsx` | Diesel and gasoline workbook | 1 sheet(s) |
| 48 | `xlsx/48_water_and_utility_missing_fields.xlsx` | Missing dates, units, and optional metadata | 1 sheet(s) |
| 49 | `xlsx/49_operations_multisheet_report.xlsx` | Multiple sheets and irrelevant cost data | 3 sheet(s) |
| 50 | `xlsx/50_poor_formatting_and_ocr.xlsx` | Poor headers, OCR errors, and incompatible units | 1 sheet(s) |

## Testing guidance

1. Upload clean files first and verify activity type, quantity, unit, date, facility, and source reference.
2. Upload duplicate pairs and confirm hash-based duplicate protection.
3. Upload files with missing dates or units and confirm review warnings appear without hidden assumptions.
4. Confirm OCR-like values such as `9O5O` and `2,8S0` require review instead of silent correction.
5. Confirm diesel in tonnes is not silently converted to litres.
6. Confirm multi-page and multi-facility documents retain distinct source evidence.
7. Confirm reports keep 2024, 2025, and 2026 date filtering consistent.

See `manifest.csv` for machine-readable expectations.
