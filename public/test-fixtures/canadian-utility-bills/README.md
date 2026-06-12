# CarbonLite Canadian Utility Test Fixtures

This directory contains 20 synthetic files for upload, extraction, duplicate detection, validation, and import testing.

- All customer names, account numbers, addresses, usage values, and charges are fictional.
- Canadian utility/provider names are used only to make test documents recognizable; there is no affiliation or claim that these files reproduce official bills.
- Files 02 and 14 are exact byte duplicates of files 01 and 13.
- Several fixtures intentionally contain missing dates, missing units, bad headers, negative quantities, mixed units, and OCR-like formatting.
- See `manifest.csv` for the expected behavior of each fixture.
