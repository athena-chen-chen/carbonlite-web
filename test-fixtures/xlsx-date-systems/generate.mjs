// Synthetic fixtures only. Run with Node from the frontend checkout.
import * as XLSX from 'xlsx';
import { writeFileSync } from 'node:fs';

const cases = [
  ['modern', '2026-01-15'], ['leap-day', '2024-02-29'],
  ['year-end', '2025-12-31'], ['year-start', '2026-01-01'],
  ['october', '2026-10-22'], ['noon', '2026-10-22'],
  ['text', '2026-01-15'], ['cached-formula', '2026-01-15'], ['unformatted', '2026-01-15'],
];
const expected = cases.map(([sourceReference, recordDate], index) => ({
  activityType: 'ELECTRICITY', recordDate, quantity: 980, unit: 'kWh',
  jurisdictionCountry: 'Canada', jurisdictionRegion: 'Alberta', sourceReference,
  sourceSheetName: 'Dates', sourceRow: index + 2,
}));
for (const date1904 of [false, true]) {
  // Independent fixture oracle for modern Gregorian dates, not parser code.
  const epoch = Date.parse(date1904 ? '1904-01-01T00:00:00Z' : '1899-12-30T00:00:00Z');
  const rows = cases.map(([kind, date]) => {
    const serial = (Date.parse(date + 'T00:00:00Z') - epoch) / 86400000;
    return ['ELECTRICITY', kind === 'text' ? date : serial + (kind === 'noon' ? 0.5 : 0), 980, 'kWh', 'Canada', 'Alberta', kind];
  });
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Activity Type', 'Record Date', 'Quantity', 'Unit', 'Country', 'Province', 'Source Reference'], ...rows,
  ]);
  cases.forEach(([kind], index) => {
    const cell = sheet[`B${index + 2}`];
    if (kind !== 'text' && kind !== 'unformatted') cell.z = 'yyyy-mm-dd hh:mm';
    if (kind === 'cached-formula') cell.f = 'DATE(2026,1,15)';
  });
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { WBProps: { date1904 } };
  XLSX.utils.book_append_sheet(workbook, sheet, 'Dates');
  writeFileSync(new URL(`./dates-${date1904 ? '1904' : '1900'}.xlsx`, import.meta.url),
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }));
}
writeFileSync(new URL('./expected.json', import.meta.url), JSON.stringify(expected, null, 2) + '\n');
