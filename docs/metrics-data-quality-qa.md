# Metrics Summary Data Quality QA

Use this checklist after uploading a large mixed test set, such as 40+ utility bills, invoices, CSV files, and spreadsheets.

- Metrics Summary does not display `null`, `undefined`, `NaN`, or empty unit values.
- Numeric OCR values such as `20`, `50`, or `100` are not displayed as units.
- Missing units display as `Missing unit`.
- Numeric unit values display as `Invalid unit` and are marked for review.
- Water records are grouped once as tracked-only, including both `m3` and `m³`.
- Fuel Usage card displays readable grouped totals, for example `Diesel: 7,959 liters`.
- Fuel Usage card does not include records with missing or invalid units.
- Fuel Usage card shows a review note when invalid fuel records exist.
- Calculation Issues separates Missing Data, Missing Factor, and Informational issues.
- Missing Data issues show `Fix Record` and do not show `Create Factor`.
- Missing Factor issues show `Create Factor`.
- Water tracked-only issues show no action button.
- CO2 Emissions card shows multi-record traceability as `Calculated from X activity records`.
- `View calculation details` scrolls to the calculation/source details section.
- Data Records shows `Missing unit` or `Invalid unit` for incomplete historical records.
- Source references do not include `null`; missing source references show `Source unavailable`.
- Preview import validation blocks missing or invalid units before import.
