import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'public', 'test-fixtures', 'canadian-utility-bills');

const files = [];

async function ensureOutputDir() {
  await fs.mkdir(outputDir, { recursive: true });
  const existing = await fs.readdir(outputDir);
  await Promise.all(
    existing
      .filter((name) => name !== '.gitkeep')
      .map((name) => fs.rm(path.join(outputDir, name), { recursive: true, force: true })),
  );
}

async function writePdf(fileName, document) {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  let y = 52;

  pdf.setFillColor(8, 80, 96);
  pdf.rect(0, 0, 612, 82, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(document.provider, margin, y);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(document.documentType, margin, y + 18);

  y = 112;
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(9);
  pdf.text('SYNTHETIC TEST DOCUMENT - NOT A REAL BILL', margin, y);
  y += 26;

  pdf.setFontSize(11);
  for (const [label, value] of document.fields) {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${label}:`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value || ''), 190, y);
    y += 20;
  }

  if (document.lines?.length) {
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Usage details', margin, y);
    y += 16;
    pdf.setFillColor(226, 232, 240);
    pdf.rect(margin, y, 510, 22, 'F');
    pdf.setFontSize(9);
    document.headers.forEach((header, index) => {
      pdf.text(header, margin + document.columns[index], y + 15);
    });
    y += 22;

    document.lines.forEach((line, lineIndex) => {
      if (lineIndex % 2 === 1) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(margin, y, 510, 21, 'F');
      }
      pdf.setFont('helvetica', 'normal');
      line.forEach((value, index) => {
        pdf.text(String(value), margin + document.columns[index], y + 14);
      });
      y += 21;
    });
  }

  y += 28;
  pdf.setFontSize(9);
  pdf.setTextColor(71, 85, 105);
  const notes = pdf.splitTextToSize(document.notes, 510);
  pdf.text(notes, margin, y);

  const bytes = Buffer.from(pdf.output('arraybuffer'));
  await fs.writeFile(path.join(outputDir, fileName), bytes);
}

async function writeText(fileName, content) {
  await fs.writeFile(path.join(outputDir, fileName), content.trimStart(), 'utf8');
}

async function writeCsv(fileName, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          const text = value === null || value === undefined ? '' : String(value);
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
        })
        .join(','),
    )
    .join('\n');
  await fs.writeFile(path.join(outputDir, fileName), `${csv}\n`, 'utf8');
}

function styleWorksheet(sheet, range) {
  sheet['!autofilter'] = { ref: range };
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  sheet['!cols'] = [
    { wch: 16 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 26 },
    { wch: 30 },
  ];
}

async function writeWorkbook(fileName, sheets) {
  const workbook = XLSX.utils.book_new();
  for (const sheetDefinition of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(sheetDefinition.rows);
    styleWorksheet(sheet, sheetDefinition.range);
    XLSX.utils.book_append_sheet(workbook, sheet, sheetDefinition.name);
  }
  XLSX.writeFile(workbook, path.join(outputDir, fileName), {
    compression: true,
    bookType: 'xlsx',
  });
}

async function addFile(fileName, category, format, provider, scenario, expected) {
  const stat = await fs.stat(path.join(outputDir, fileName));
  files.push({
    fileName,
    category,
    format,
    provider,
    scenario,
    expected,
    sizeBytes: stat.size,
  });
}

await ensureOutputDir();

await writePdf('01_enmax_electricity_bill_jan_2025.pdf', {
  provider: 'ENMAX Energy',
  documentType: 'Electricity Statement',
  fields: [
    ['Customer', 'Prairie Metalworks Ltd.'],
    ['Account number', 'SYN-ENX-004821'],
    ['Service address', '4100 Test Industrial Way, Calgary, AB'],
    ['Billing period', '2025-01-01 to 2025-01-31'],
    ['Statement date', '2025-02-04'],
    ['Total due', '$2,184.73 CAD'],
  ],
  headers: ['Meter', 'Previous', 'Current', 'Usage', 'Unit'],
  columns: [0, 95, 190, 285, 390],
  lines: [['E-77821', '184,210', '187,860', '3,650', 'kWh']],
  notes: 'Synthetic ENMAX-style bill for CarbonLite extraction testing. All names, account numbers, addresses, and charges are fictional.',
});
await addFile('01_enmax_electricity_bill_jan_2025.pdf', 'Electricity bill', 'PDF', 'ENMAX Energy', 'Complete structured bill', 'Extract ELECTRICITY 3650 kWh dated 2025-01-31');

await fs.copyFile(
  path.join(outputDir, '01_enmax_electricity_bill_jan_2025.pdf'),
  path.join(outputDir, '02_enmax_electricity_bill_DUPLICATE.pdf'),
);
await addFile('02_enmax_electricity_bill_DUPLICATE.pdf', 'Electricity bill', 'PDF', 'ENMAX Energy', 'Exact byte duplicate of file 01', 'Duplicate hash should be detected');

await writePdf('03_epcor_electricity_bill_feb_2025.pdf', {
  provider: 'EPCOR',
  documentType: 'Electricity Services Invoice',
  fields: [
    ['Customer', 'North River Foods Inc.'],
    ['Account number', 'SYN-EPC-220194'],
    ['Service location', '88 Jasper Test Road, Edmonton, AB'],
    ['Billing period', '2025-02-01 to 2025-02-28'],
    ['Invoice date', '2025-03-05'],
    ['Amount due', '$6,402.18 CAD'],
  ],
  headers: ['Site ID', 'Read type', 'Consumption', 'Unit'],
  columns: [0, 130, 270, 405],
  lines: [['SITE-AB-8804', 'Actual', '12,840', 'kWh']],
  notes: 'Synthetic EPCOR-style bill. The provider name is used only to create a realistic test fixture and does not imply affiliation.',
});
await addFile('03_epcor_electricity_bill_feb_2025.pdf', 'Electricity bill', 'PDF', 'EPCOR', 'Complete bill with alternate labels', 'Extract ELECTRICITY 12840 kWh');

await writePdf('04_atco_natural_gas_statement_mar_2025.pdf', {
  provider: 'ATCO Gas',
  documentType: 'Natural Gas Delivery Statement',
  fields: [
    ['Customer', 'Foothills Packaging Cooperative'],
    ['Account number', 'SYN-ATC-993011'],
    ['Service location', '17 Commerce Test Park, Red Deer, AB'],
    ['Billing period', '2025-03-01 to 2025-03-31'],
    ['Statement date', '2025-04-03'],
    ['Total amount', '$4,930.25 CAD'],
  ],
  headers: ['Meter', 'Start read', 'End read', 'Volume', 'Unit'],
  columns: [0, 92, 190, 292, 400],
  lines: [['NG-44902', '72,100', '74,960', '2,860', 'm3']],
  notes: 'Synthetic natural gas statement for testing activity type and unit normalization.',
});
await addFile('04_atco_natural_gas_statement_mar_2025.pdf', 'Natural gas statement', 'PDF', 'ATCO Gas', 'Complete gas statement', 'Extract NATURAL_GAS 2860 m3');

await writePdf('05_fortisalberta_bill_missing_account.pdf', {
  provider: 'FortisAlberta',
  documentType: 'Electric Distribution Invoice',
  fields: [
    ['Customer', 'Blue Spruce Fabrication Ltd.'],
    ['Account number', ''],
    ['Service location', '240 Test Avenue, Lethbridge, AB'],
    ['Billing period', '2025-04-06 to 2025-05-05'],
    ['Invoice date', '2025-05-09'],
    ['Total due', '$1,117.08 CAD'],
  ],
  headers: ['Rate', 'Energy delivered', 'Unit'],
  columns: [0, 180, 390],
  lines: [['Small commercial', '2,205', 'kWh']],
  notes: 'Synthetic bill intentionally missing the account number. Activity data is otherwise usable.',
});
await addFile('05_fortisalberta_bill_missing_account.pdf', 'Electricity bill', 'PDF', 'FortisAlberta', 'Missing account number', 'Extract usage despite missing metadata');

await writePdf('06_bc_hydro_bill_dec_2025.pdf', {
  provider: 'BC Hydro',
  documentType: 'Commercial Electricity Bill',
  fields: [
    ['Customer', 'Coastal Cold Storage Test Ltd.'],
    ['Account number', 'SYN-BCH-615509'],
    ['Service address', '12 Harbour Test Lane, Burnaby, BC'],
    ['Billing period', '2025-11-15 to 2025-12-15'],
    ['Bill date', '2025-12-18'],
    ['Current charges', '$8,998.42 CAD'],
  ],
  headers: ['Meter', 'Demand', 'Energy', 'Unit'],
  columns: [0, 150, 285, 410],
  lines: [['BC-99218', '84 kW', '21,440', 'kWh']],
  notes: 'Synthetic BC Hydro-style bill. Electricity jurisdiction should be recognized as British Columbia, Canada.',
});
await addFile('06_bc_hydro_bill_dec_2025.pdf', 'Electricity bill', 'PDF', 'BC Hydro', 'Different Canadian jurisdiction', 'Extract ELECTRICITY 21440 kWh');

await writePdf('07_petro_canada_diesel_invoice.pdf', {
  provider: 'Petro-Canada',
  documentType: 'Commercial Fuel Invoice',
  fields: [
    ['Customer', 'Rocky Route Logistics Ltd.'],
    ['Invoice number', 'SYN-PC-77102'],
    ['Delivery location', '990 Test Trail, Grande Prairie, AB'],
    ['Delivery date', '2025-06-14'],
    ['Invoice date', '2025-06-15'],
    ['Invoice total', '$2,641.59 CAD'],
  ],
  headers: ['Product', 'Quantity', 'Unit price', 'Unit', 'Amount'],
  columns: [0, 135, 235, 330, 410],
  lines: [['ULSD Diesel', '1,240', '$1.879', 'L', '$2,329.96']],
  notes: 'Synthetic commercial diesel invoice. Taxes and pricing are illustrative only.',
});
await addFile('07_petro_canada_diesel_invoice.pdf', 'Fuel invoice', 'PDF', 'Petro-Canada', 'Complete diesel invoice', 'Extract DIESEL 1240 L');

await writePdf('08_irving_oil_invoice_poor_format.pdf', {
  provider: 'IRVING OIL',
  documentType: 'DELIVERY TICKET / INVOICE COPY',
  fields: [
    ['SOLD TO', 'ATLANTIC TEST SERVICES'],
    ['DOC#', 'SYN-IRV-44008'],
    ['DATE?', '07/03/25'],
    ['LOCATION', 'MONCTON NB - YARD 2'],
    ['TOTAL', 'CAD 1 908 44'],
  ],
  headers: ['DESC', 'QTY??', 'U/M', 'PRICE'],
  columns: [0, 175, 295, 395],
  lines: [['DIESEL CLEAR', '875,0', 'LTR', '1,9879'], ['DEF FLUID', '20', 'L', '1,4500']],
  notes: 'INTENTIONALLY POOR FORMATTING: comma decimal, ambiguous date, OCR-like punctuation, and multiple products. Synthetic test document.',
});
await addFile('08_irving_oil_invoice_poor_format.pdf', 'Fuel invoice', 'PDF', 'Irving Oil', 'Poor formatting and ambiguous values', 'Extract diesel cautiously; flag review');

await writeText('09_saskpower_statement_pdf_like.txt', `
SASKPOWER BUSINESS STATEMENT
Synthetic test fixture - not a real bill

Account: SYN-SKP-102884
Customer: Prairie Grain Test Terminal
Statement Period: 2025/08/01 - 2025/08/31
Service Province: Saskatchewan

Electricity consumption ............. 18 760 kWh
Peak demand ......................... 71.4 kW
Amount due .......................... $7,244.90
Payment due ......................... 2025/09/21

Source note: PDF-like plain text export with dotted leaders and spaces in numbers.
`);
await addFile('09_saskpower_statement_pdf_like.txt', 'Electricity statement', 'TXT', 'SaskPower', 'PDF-like text export', 'Extract ELECTRICITY 18760 kWh');

await writeText('10_manitoba_hydro_missing_date.txt', `
MANITOBA HYDRO - COMMERCIAL ACCOUNT SUMMARY
SYNTHETIC / TEST ONLY

Customer Name: Red River Test Bakery
Account: SYN-MBH-30072
Service: Winnipeg, Manitoba

Meter number MH-88017
Previous reading 311004
Current reading 316492
Energy used 5488 kWh

Statement date:
Billing period:
Amount due $1,040.27

This fixture intentionally omits all dates. CarbonLite should allow review/import
with a missing or estimated date warning rather than inventing a source date.
`);
await addFile('10_manitoba_hydro_missing_date.txt', 'Electricity statement', 'TXT', 'Manitoba Hydro', 'Missing all dates', 'Extract quantity and warn about missing date');

await writeText('11_hydro_quebec_bilingual_messy.txt', `
HYDRO-QUÉBEC / BUSINESS ACCOUNT / COMPTE AFFAIRES
DOCUMENT SYNTHÉTIQUE - TEST SEULEMENT

Client / Customer: Atelier Test Laurentien inc.
No compte: SYN-HQ-550019
Période: du 2025-09-04 au 2025-10-03

ÉLECTRICITÉ CONSOMMÉE
lecture antérieure  88 901
lecture actuelle    95 141
consommation        6 240  kWh

Montant total ::: 1 522,16 $
notes: accents + French labels + comma currency + irregular spacing
`);
await addFile('11_hydro_quebec_bilingual_messy.txt', 'Electricity statement', 'TXT', 'Hydro-Québec', 'Bilingual/OCR-like formatting', 'Extract ELECTRICITY 6240 kWh');

await writeText('12_parkland_fuel_delivery_ticket.txt', `
PARKLAND COMMERCIAL FUELS
*** SYNTHETIC DELIVERY TICKET ***
TICKET SYN-PKL-8102        DROP 2025-10-22 06:41
CUSTOMER: NORTHERN TEST EXCAVATION

PROD        QTY       UOM       TANK
CLR DSL     2,050     litres    T-01
REG GAS       480     L         T-02

Driver notes: meter reset? handwritten total looked like 2530
Invoice total unavailable
`);
await addFile('12_parkland_fuel_delivery_ticket.txt', 'Fuel delivery ticket', 'TXT', 'Parkland', 'Multiple fuel types and abbreviated labels', 'Extract DIESEL 2050 L and GASOLINE 480 L');

const standardCsvRows = [
  ['activityType', 'recordDate', 'quantity', 'unit', 'sourceReference', 'notes'],
  ['ELECTRICITY', '2025-01-31', 3650, 'kWh', 'ENMAX Jan 2025', 'Main Calgary site'],
  ['NATURAL_GAS', '2025-03-31', 2860, 'm3', 'ATCO Mar 2025', 'Boiler gas'],
  ['DIESEL', '2025-06-14', 1240, 'L', 'Petro-Canada invoice SYN-PC-77102', 'Fleet fuel'],
  ['GASOLINE', '2025-10-22', 480, 'L', 'Parkland ticket SYN-PKL-8102', 'Light vehicles'],
];
await writeCsv('13_activity_export_standard.csv', standardCsvRows);
await addFile('13_activity_export_standard.csv', 'Activity export', 'CSV', 'Multiple providers', 'Clean normalized CSV', 'Import 4 records');

await fs.copyFile(
  path.join(outputDir, '13_activity_export_standard.csv'),
  path.join(outputDir, '14_activity_export_DUPLICATE.csv'),
);
await addFile('14_activity_export_DUPLICATE.csv', 'Activity export', 'CSV', 'Multiple providers', 'Exact byte duplicate of file 13', 'Duplicate hash should be detected');

await writeCsv('15_activity_export_missing_fields.csv', [
  ['Type', 'Date', 'Amount', 'Unit', 'Source', 'Notes'],
  ['ELECTRICITY', '', 5488, 'kWh', 'Manitoba Hydro', 'Missing date'],
  ['NATURAL_GAS', '2025-04-30', '', 'm3', 'ATCO', 'Missing quantity'],
  ['DIESEL', '2025-07-03', 875, '', 'Irving Oil', 'Missing unit'],
  ['', '2025-09-15', 1200, 'kWh', 'Unknown statement', 'Missing activity type'],
]);
await addFile('15_activity_export_missing_fields.csv', 'Activity export', 'CSV', 'Multiple providers', 'Missing date, quantity, unit, and type', 'Import valid rows only; show row validation');

await writeCsv('16_activity_export_mixed_units_bad_headers.csv', [
  ['UTILITY kind ', 'period end', 'usage value', 'uom???', 'vendor/ref'],
  ['diesel fuel', '31-01-2025', '1,190', 'litres', 'Synthetic bulk tank'],
  ['DIESEL', '2025/02/28', 1, 'ton', 'Incompatible unit fixture'],
  ['electric', 'Mar 31 2025', 9500, 'KWH', 'EPCOR'],
  ['natural gas', '2025-04-30', 450.5, 'M³', 'ATCO'],
  ['water', '2025-05-31', -12, 'm3', 'Negative quantity fixture'],
]);
await addFile('16_activity_export_mixed_units_bad_headers.csv', 'Activity export', 'CSV', 'Multiple providers', 'Bad headers, mixed units, negative value', 'Normalize units/types and reject negative quantity');

await writeWorkbook('17_electricity_records_2025.xlsx', [
  {
    name: 'Electricity',
    range: 'A1:F6',
    rows: [
      ['Activity Type', 'Record Date', 'Quantity', 'Unit', 'Source Reference', 'Notes'],
      ['ELECTRICITY', '2025-01-31', 3650, 'kWh', 'ENMAX Jan 2025', 'Calgary'],
      ['ELECTRICITY', '2025-02-28', 12840, 'kWh', 'EPCOR Feb 2025', 'Edmonton'],
      ['ELECTRICITY', '2025-05-05', 2205, 'kWh', 'FortisAlberta May 2025', 'Lethbridge'],
      ['ELECTRICITY', '2025-08-31', 18760, 'kWh', 'SaskPower Aug 2025', 'Regina'],
      ['ELECTRICITY', '2025-12-15', 21440, 'kWh', 'BC Hydro Dec 2025', 'Burnaby'],
    ],
  },
]);
await addFile('17_electricity_records_2025.xlsx', 'Activity workbook', 'XLSX', 'Multiple providers', 'Clean electricity workbook', 'Import 5 electricity records');

await writeWorkbook('18_fuel_and_gas_records_2025.xlsx', [
  {
    name: 'Fuel Data',
    range: 'A1:F6',
    rows: [
      ['Activity Type', 'Record Date', 'Quantity', 'Unit', 'Source Reference', 'Notes'],
      ['DIESEL', '2025-06-14', 1240, 'L', 'Petro-Canada SYN-PC-77102', 'Fleet'],
      ['DIESEL', '2025-07-03', 875, 'L', 'Irving SYN-IRV-44008', 'Generator'],
      ['DIESEL', '2025-10-22', 2050, 'litres', 'Parkland SYN-PKL-8102', 'Heavy equipment'],
      ['GASOLINE', '2025-10-22', 480, 'L', 'Parkland SYN-PKL-8102', 'Light vehicles'],
      ['NATURAL_GAS', '2025-03-31', 2860, 'm3', 'ATCO Mar 2025', 'Boiler'],
    ],
  },
]);
await addFile('18_fuel_and_gas_records_2025.xlsx', 'Activity workbook', 'XLSX', 'Multiple providers', 'Mixed fuel and gas types', 'Import 5 records and group incompatible fuel units');

await writeWorkbook('19_records_missing_dates_and_notes.xlsx', [
  {
    name: 'Import',
    range: 'A1:F5',
    rows: [
      ['activityType', 'recordDate', 'quantity', 'unit', 'sourceReference', 'notes'],
      ['ELECTRICITY', '', 5488, 'kWh', 'Manitoba Hydro', ''],
      ['NATURAL_GAS', null, 730, 'm3', 'Synthetic gas statement', null],
      ['DIESEL', '2025-11-01', 350, 'L', '', 'Missing optional source'],
      ['WATER', '', 920, 'm3', 'Municipal utility', 'No date; missing factor likely'],
    ],
  },
]);
await addFile('19_records_missing_dates_and_notes.xlsx', 'Activity workbook', 'XLSX', 'Multiple providers', 'Missing dates and optional metadata', 'Allow import with date warnings');

await writeWorkbook('20_operations_export_multisheet.xlsx', [
  {
    name: 'Read Me',
    range: 'A1:B5',
    rows: [
      ['Synthetic CarbonLite Test Workbook', 'Not real operational data'],
      ['Prepared for', 'CarbonLite extraction/import testing'],
      ['Problem case', 'Actual data is on another sheet'],
      ['Reporting year', 2025],
      ['Jurisdictions', 'Alberta and British Columbia'],
    ],
  },
  {
    name: 'Utility Usage',
    range: 'A1:F5',
    rows: [
      ['Category', 'Period End', 'Consumption', 'UOM', 'Provider', 'Comment'],
      ['Electricity', '2025-01-31', 3650, 'kWh', 'ENMAX', 'Main meter'],
      ['Electricity', '2025-12-15', 21440, 'kWh', 'BC Hydro', 'Warehouse'],
      ['Natural Gas', '2025-03-31', 2860, 'm3', 'ATCO', 'Boiler'],
      ['Diesel', '2025-06-14', 1240, 'L', 'Petro-Canada', 'Fleet'],
    ],
  },
  {
    name: 'Costs Only',
    range: 'A1:C4',
    rows: [
      ['Provider', 'Invoice Total', 'Currency'],
      ['ENMAX', 2184.73, 'CAD'],
      ['ATCO', 4930.25, 'CAD'],
      ['Petro-Canada', 2641.59, 'CAD'],
    ],
  },
]);
await addFile('20_operations_export_multisheet.xlsx', 'Operations workbook', 'XLSX', 'Multiple providers', 'Multiple sheets plus irrelevant cost data', 'Import activity sheet only; do not treat costs as quantities');

await writeCsv(
  'manifest.csv',
  [
    ['File Name', 'Category', 'Format', 'Provider', 'Test Scenario', 'Expected Behavior', 'Size Bytes'],
    ...files.map((file) => [
      file.fileName,
      file.category,
      file.format,
      file.provider,
      file.scenario,
      file.expected,
      file.sizeBytes,
    ]),
  ],
);

const readme = `# CarbonLite Canadian Utility Test Fixtures

This directory contains 20 synthetic files for upload, extraction, duplicate detection, validation, and import testing.

- All customer names, account numbers, addresses, usage values, and charges are fictional.
- Canadian utility/provider names are used only to make test documents recognizable; there is no affiliation or claim that these files reproduce official bills.
- Files 02 and 14 are exact byte duplicates of files 01 and 13.
- Several fixtures intentionally contain missing dates, missing units, bad headers, negative quantities, mixed units, and OCR-like formatting.
- See \`manifest.csv\` for the expected behavior of each fixture.
`;
await fs.writeFile(path.join(outputDir, 'README.md'), readme, 'utf8');

console.log(`Generated ${files.length} test fixtures in ${outputDir}`);
