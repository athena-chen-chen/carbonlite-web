import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'test-data');
const manifest = [];

const pdfFixtures = [
  bill(1, 'electricity', 'ENMAX', 'ENMAX electricity bill', 'Calgary Fabrication Plant', 'Alberta, Canada', '2024-01-01', '2024-01-31', 'ELECTRICITY', 4280, 'kWh', 'Clean bill'),
  bill(2, 'electricity', 'EPCOR', 'EPCOR electricity statement', 'Edmonton Distribution Centre', 'Alberta, Canada', '2025-02-01', '2025-02-28', 'ELECTRICITY', 12840, 'kWh', 'Clean alternate labels'),
  bill(3, 'electricity', 'FortisAlberta', 'FortisAlberta distribution bill', 'Lethbridge Warehouse', 'Alberta, Canada', '', '', 'ELECTRICITY', 2205, 'kWh', 'Missing dates'),
  bill(4, 'electricity', 'BC Hydro', 'BC Hydro commercial bill', 'Burnaby Cold Storage', 'British Columbia, Canada', '2026-01-15', '2026-02-14', 'ELECTRICITY', 21440, 'kWh', 'Clean different jurisdiction'),
  bill(5, 'electricity', 'Hydro One', 'Hydro One multi-site bill', 'Ontario Operations', 'Ontario, Canada', '2025-03-01', '2025-03-31', 'ELECTRICITY', 18420, 'kWh', 'Multi-page and multiple facilities', {
    pages: [
      page('Facility breakdown', [
        ['Toronto Office', '6,120', 'kWh'],
        ['Hamilton Workshop', '12,300', 'kWh'],
      ]),
    ],
  }),
  bill(6, 'electricity', 'ENMAX', 'ENMAX OCR scan', 'Calgary Assembly Site', 'Alberta, Canada', '2025-04-01', '2025-04-30', 'ELECTRICITY', '9O5O', 'kW h', 'OCR errors: O/0 substitution and split unit'),
  bill(7, 'electricity', 'EPCOR', 'EPCOR bill without unit', 'Edmonton Test Lab', 'Alberta, Canada', '2025-05-01', '2025-05-31', 'ELECTRICITY', 7730, '', 'Missing unit'),
  bill(8, 'electricity', 'FortisAlberta', 'FortisAlberta two-meter bill', 'Red Deer Manufacturing Campus', 'Alberta, Canada', '2024-06-01', '2024-06-30', 'ELECTRICITY', 15990, 'kWh', 'Multi-page with two meters', {
    pages: [page('Meter detail', [['Plant meter', '11,250', 'kWh'], ['Office meter', '4,740', 'kWh']])],
  }),
  bill(9, 'electricity', 'ENMAX', 'utility_bill.pdf batch A', 'Calgary North Facility', 'Alberta, Canada', '2025-07-01', '2025-07-31', 'ELECTRICITY', 6300, 'kWh', 'Same filename, different content: batch A', {
    relativePath: 'name-collisions/batch-a/utility_bill.pdf',
  }),
  bill(10, 'electricity', 'BC Hydro', 'utility_bill.pdf batch B', 'Vancouver Test Facility', 'British Columbia, Canada', '2025-07-01', '2025-07-31', 'ELECTRICITY', 9100, 'kWh', 'Same filename, different content: batch B', {
    relativePath: 'name-collisions/batch-b/utility_bill.pdf',
  }),

  bill(11, 'natural-gas', 'ATCO', 'ATCO natural gas statement', 'Red Deer Packaging Plant', 'Alberta, Canada', '2024-01-01', '2024-01-31', 'NATURAL_GAS', 2860, 'm3', 'Clean gas statement'),
  bill(12, 'natural-gas', 'ENMAX', 'ENMAX natural gas bill', 'Calgary Food Processing', 'Alberta, Canada', '2025-02-01', '2025-02-28', 'NATURAL_GAS', 4410, 'm3', 'Clean gas bill'),
  bill(13, 'natural-gas', 'ATCO', 'ATCO gas statement missing date', 'Fort McMurray Service Shop', 'Alberta, Canada', '', '', 'NATURAL_GAS', 1730, 'm3', 'Missing dates'),
  bill(14, 'natural-gas', 'FortisBC', 'FortisBC natural gas statement', 'Surrey Distribution Hub', 'British Columbia, Canada', '2026-03-01', '2026-03-31', 'NATURAL_GAS', 3180, 'm3', 'Clean BC jurisdiction'),
  bill(15, 'natural-gas', 'ATCO', 'ATCO OCR statement', 'Grande Prairie Yard', 'Alberta, Canada', '2025-04-01', '2025-04-30', 'NATURAL_GAS', '2,8S0', 'm³', 'OCR error: S/5 substitution'),
  bill(16, 'natural-gas', 'ENMAX', 'ENMAX multi-facility gas summary', 'Calgary Facilities', 'Alberta, Canada', '2025-05-01', '2025-05-31', 'NATURAL_GAS', 5900, 'm3', 'Multi-page facility summary', {
    pages: [page('Facility detail', [['Plant A', '3,400', 'm3'], ['Plant B', '2,500', 'm3']])],
  }),
  bill(17, 'natural-gas', 'ATCO', 'ATCO statement without unit', 'Medicine Hat Warehouse', 'Alberta, Canada', '2024-11-01', '2024-11-30', 'NATURAL_GAS', 950, '', 'Missing unit'),

  bill(18, 'diesel', 'Petro-Canada', 'Commercial diesel invoice', 'Rocky Route Logistics', 'Alberta, Canada', '2024-06-14', '2024-06-14', 'DIESEL', 1240, 'L', 'Clean diesel invoice'),
  bill(19, 'diesel', 'Shell Canada', 'Bulk diesel delivery invoice', 'Edmonton Fleet Depot', 'Alberta, Canada', '2025-01-18', '2025-01-18', 'DIESEL', 3500, 'litres', 'Clean bulk delivery'),
  bill(20, 'diesel', 'Parkland', 'Diesel delivery ticket', 'Northern Excavation Yard', 'Alberta, Canada', '2025-03-22', '2025-03-22', 'DIESEL', 2050, 'L', 'Delivery ticket'),
  bill(21, 'diesel', 'Irving Oil', 'Diesel invoice OCR copy', 'Moncton Service Yard', 'New Brunswick, Canada', '2025-07-03', '2025-07-03', 'DIESEL', '875,O', 'LTR', 'OCR error and alternate unit'),
  bill(22, 'diesel', 'Petro-Canada', 'Diesel invoice missing date', 'Calgary Fleet Shop', 'Alberta, Canada', '', '', 'DIESEL', 760, 'L', 'Missing dates'),
  bill(23, 'diesel', 'Shell Canada', 'Diesel invoice in tonnes', 'Industrial Test Site', 'Alberta, Canada', '2026-02-10', '2026-02-10', 'DIESEL', 1.5, 'tonnes', 'Incompatible unit; must not auto-convert'),

  bill(24, 'fuel-receipts', 'Petro-Canada', 'Fleet fuel receipt', 'Vehicle AB-TEST-101', 'Alberta, Canada', '2024-08-15', '2024-08-15', 'GASOLINE', 62.4, 'L', 'Clean receipt'),
  bill(25, 'fuel-receipts', 'Shell Canada', 'Fuel card receipt', 'Vehicle ON-TEST-204', 'Ontario, Canada', '2025-09-04', '2025-09-04', 'DIESEL', 88.7, 'L', 'Clean receipt'),
  bill(26, 'fuel-receipts', 'Esso', 'Faded gasoline receipt', 'Vehicle BC-TEST-330', 'British Columbia, Canada', '2025-10-11', '2025-10-11', 'GASOLINE', '4B.2', 'L', 'OCR error: B/8 substitution'),
  bill(27, 'fuel-receipts', 'Husky', 'Receipt missing fuel unit', 'Vehicle AB-TEST-410', 'Alberta, Canada', '2026-01-19', '2026-01-19', 'DIESEL', 105.3, '', 'Missing unit'),
  bill(28, 'fuel-receipts', 'Parkland', 'Combined fuel receipt', 'Mixed Fleet', 'Alberta, Canada', '2025-12-02', '2025-12-02', 'DIESEL', 230, 'L', 'Multi-product receipt', {
    activities: [['DIESEL', 230, 'L'], ['GASOLINE', 94, 'L']],
    pages: [page('Products', [['Diesel', '230', 'L'], ['Gasoline', '94', 'L']])],
  }),

  bill(29, 'water', 'EPCOR Water', 'Commercial water bill', 'Edmonton Office', 'Alberta, Canada', '2024-04-01', '2024-04-30', 'WATER', 620, 'm3', 'Clean water bill'),
  bill(30, 'water', 'City of Calgary Water Services', 'Water utility statement', 'Calgary Plant', 'Alberta, Canada', '2025-05-01', '2025-05-31', 'WATER', 910, 'm3', 'Clean municipal bill'),
  bill(31, 'water', 'Metro Vancouver', 'Water services statement', 'Burnaby Facility', 'British Columbia, Canada', '2026-06-01', '2026-06-30', 'WATER', 780, 'm3', 'Clean BC water bill'),
  bill(32, 'water', 'EPCOR Water', 'Water bill missing date', 'Edmonton Warehouse', 'Alberta, Canada', '', '', 'WATER', 340, 'm3', 'Missing dates'),
  bill(33, 'water', 'City of Toronto Water', 'Water statement without unit', 'Toronto Office', 'Ontario, Canada', '2025-07-01', '2025-07-31', 'WATER', 415, '', 'Missing unit'),

  summary(34, 'ENMAX', 'Annual utility summary 2024', 'Calgary Campus', 'Alberta, Canada', 2024, [
    ['ELECTRICITY', 58200, 'kWh'],
    ['NATURAL_GAS', 22100, 'm3'],
  ], 'Clean annual summary'),
  summary(35, 'EPCOR', 'Multi-facility utility report 2025', 'Edmonton Operations', 'Alberta, Canada', 2025, [
    ['ELECTRICITY', 98400, 'kWh'],
    ['WATER', 8140, 'm3'],
  ], 'Multi-page and multiple facilities', {
    pages: [
      page('Facility A', [['Electricity', '61,000', 'kWh'], ['Water', '4,900', 'm3']]),
      page('Facility B', [['Electricity', '37,400', 'kWh'], ['Water', '3,240', 'm3']]),
    ],
  }),
  summary(36, 'Hydro One', 'Ontario energy summary 2026', 'Ontario Facilities', 'Ontario, Canada', 2026, [
    ['ELECTRICITY', 110200, 'kWh'],
  ], 'Clean annual report'),
  summary(37, 'FortisAlberta / ATCO', 'Mixed utility report missing units', 'Alberta Test Group', 'Alberta, Canada', 2025, [
    ['ELECTRICITY', 44200, ''],
    ['NATURAL_GAS', 18900, ''],
  ], 'Missing units'),
  summary(38, 'CarbonLite Test Export', 'Poorly formatted utility rollup', 'Canada-wide Test Portfolio', 'Canada', 2024, [
    ['ELECTRIC1TY', '67,4OO', 'kW h'],
    ['NATURAL GAS', '12 8S0', 'm³'],
    ['WATER', '4,220', 'm3'],
  ], 'OCR errors and mixed labels'),
];

const csvFixtures = [
  csv(39, 'clean_activity_export_2024.csv', 'Clean normalized CSV', [
    header(),
    row('ELECTRICITY', '2024-01-31', 4280, 'kWh', 'Calgary Fabrication Plant', 'ENMAX'),
    row('NATURAL_GAS', '2024-01-31', 2860, 'm3', 'Red Deer Packaging Plant', 'ATCO'),
    row('DIESEL', '2024-06-14', 1240, 'L', 'Rocky Route Logistics', 'Petro-Canada'),
  ]),
  csv(40, 'multiple_facilities_2025.csv', 'Multiple facilities', [
    header(),
    row('ELECTRICITY', '2025-03-31', 6120, 'kWh', 'Toronto Office', 'Hydro One'),
    row('ELECTRICITY', '2025-03-31', 12300, 'kWh', 'Hamilton Workshop', 'Hydro One'),
    row('WATER', '2025-05-31', 910, 'm3', 'Calgary Plant', 'City of Calgary'),
  ]),
  csv(41, 'missing_dates_and_units.csv', 'Missing dates and units', [
    header(),
    row('ELECTRICITY', '', 7730, '', 'Edmonton Test Lab', 'EPCOR'),
    row('NATURAL_GAS', '', 1730, 'm3', 'Fort McMurray Service Shop', 'ATCO'),
    row('WATER', '2025-07-31', 415, '', 'Toronto Office', 'City of Toronto'),
  ]),
  csv(42, 'ocr_and_bad_headers.csv', 'OCR errors and poor headers', [
    ['ut1lity type', 'perlod end', 'quantlty', 'u/m', 'site', 'vendor'],
    ['ELECTRIC1TY', '2025-04-30', '9O5O', 'kW h', 'Calgary Assembly Site', 'ENMAX'],
    ['NATURAL GAS', '2025-04-30', '2,8S0', 'm³', 'Grande Prairie Yard', 'ATCO'],
  ]),
  csv(43, 'mixed_years_and_units.csv', 'Multiple years and incompatible units', [
    header(),
    row('DIESEL', '2024-06-14', 1240, 'L', 'Fleet A', 'Petro-Canada'),
    row('DIESEL', '2025-06-14', 1.5, 'tonnes', 'Fleet B', 'Shell Canada'),
    row('ELECTRICITY', '2026-02-14', 21440, 'kWh', 'Burnaby Cold Storage', 'BC Hydro'),
  ]),
  csv(44, 'clean_activity_export_copy.csv', 'Exact duplicate of file 39 under a different filename', []),
];

const xlsxFixtures = [
  xlsx(45, 'electricity_workbook_2024_2026.xlsx', 'Clean multi-year electricity workbook', [
    sheet('Electricity', [
      header(),
      row('ELECTRICITY', '2024-01-31', 4280, 'kWh', 'Calgary Fabrication Plant', 'ENMAX'),
      row('ELECTRICITY', '2025-02-28', 12840, 'kWh', 'Edmonton Distribution Centre', 'EPCOR'),
      row('ELECTRICITY', '2026-02-14', 21440, 'kWh', 'Burnaby Cold Storage', 'BC Hydro'),
    ]),
  ]),
  xlsx(46, 'natural_gas_multi_facility.xlsx', 'Natural gas, multiple facilities', [
    sheet('Gas Usage', [
      header(),
      row('NATURAL_GAS', '2025-05-31', 3400, 'm3', 'Calgary Plant A', 'ENMAX'),
      row('NATURAL_GAS', '2025-05-31', 2500, 'm3', 'Calgary Plant B', 'ENMAX'),
    ]),
  ]),
  xlsx(47, 'fuel_purchase_export.xlsx', 'Diesel and gasoline workbook', [
    sheet('Fuel', [
      header(),
      row('DIESEL', '2025-03-22', 2050, 'L', 'Northern Excavation Yard', 'Parkland'),
      row('GASOLINE', '2025-12-02', 94, 'L', 'Mixed Fleet', 'Parkland'),
    ]),
  ]),
  xlsx(48, 'water_and_utility_missing_fields.xlsx', 'Missing dates, units, and optional metadata', [
    sheet('Import', [
      header(),
      row('WATER', '', 340, 'm3', 'Edmonton Warehouse', 'EPCOR Water'),
      row('ELECTRICITY', '2025-05-31', 7730, '', 'Edmonton Test Lab', 'EPCOR'),
      row('', '2025-07-31', 415, 'm3', 'Toronto Office', 'City of Toronto'),
    ]),
  ]),
  xlsx(49, 'operations_multisheet_report.xlsx', 'Multiple sheets and irrelevant cost data', [
    sheet('Read Me', [['Synthetic CarbonLite Test Workbook', 'Not real operational data'], ['Reporting years', '2024-2026']]),
    sheet('Activity Data', [
      header(),
      row('ELECTRICITY', '2025-03-31', 18420, 'kWh', 'Ontario Operations', 'Hydro One'),
      row('NATURAL_GAS', '2025-05-31', 5900, 'm3', 'Calgary Facilities', 'ENMAX'),
      row('WATER', '2026-06-30', 780, 'm3', 'Burnaby Facility', 'Metro Vancouver'),
    ]),
    sheet('Costs Only', [['Provider', 'Invoice total', 'Currency'], ['Hydro One', 4890.2, 'CAD'], ['ENMAX', 3210.8, 'CAD']]),
  ]),
  xlsx(50, 'poor_formatting_and_ocr.xlsx', 'Poor headers, OCR errors, and incompatible units', [
    sheet('Sheet1', [
      ['ACT1V1TY', 'DATE??', 'QTY', 'UOM', 'FAC1L1TY', 'SOURCE'],
      ['ELECTRIC1TY', '2025/04/30', '9O5O', 'kW h', 'Calgary Assembly Site', 'ENMAX'],
      ['DIESEL', '10-Feb-2026', 1.5, 'tonnes', 'Industrial Test Site', 'Shell Canada'],
      ['NATURAL GAS', '', '2,8S0', 'm³', 'Grande Prairie Yard', 'ATCO'],
    ]),
  ]),
];

function bill(id, folder, provider, title, facility, jurisdiction, startDate, endDate, activityType, quantity, unit, scenario, options = {}) {
  return {
    id,
    folder,
    provider,
    title,
    facility,
    jurisdiction,
    startDate,
    endDate,
    activityType,
    quantity,
    unit,
    scenario,
    pages: options.pages ?? [],
    activities: options.activities,
    relativePath: options.relativePath,
  };
}

function summary(id, provider, title, facility, jurisdiction, year, activities, scenario, options = {}) {
  return {
    id,
    folder: 'utility-summaries',
    provider,
    title,
    facility,
    jurisdiction,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    activities,
    scenario,
    pages: options.pages ?? [],
  };
}

function page(title, rows) {
  return { title, rows };
}

function csv(id, fileName, scenario, rows) {
  return { id, fileName, scenario, rows };
}

function xlsx(id, fileName, scenario, sheets) {
  return { id, fileName, scenario, sheets };
}

function sheet(name, rows) {
  return { name, rows };
}

function header() {
  return ['activityType', 'recordDate', 'quantity', 'unit', 'facility', 'sourceReference'];
}

function row(activityType, recordDate, quantity, unit, facility, sourceReference) {
  return [activityType, recordDate, quantity, unit, facility, sourceReference];
}

async function resetOutput() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
}

async function writePdfFixture(fixture) {
  const relativePath =
    fixture.relativePath ??
    `${fixture.folder}/${String(fixture.id).padStart(2, '0')}_${slug(fixture.title)}.pdf`;
  const destination = path.join(outputDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });

  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  renderPdfPage(pdf, fixture, true);
  fixture.pages.forEach((extraPage) => {
    pdf.addPage();
    renderExtraPage(pdf, fixture, extraPage);
  });
  await fs.writeFile(destination, Buffer.from(pdf.output('arraybuffer')));

  const activities = fixture.activities ?? [
    [fixture.activityType, fixture.quantity, fixture.unit],
  ];
  await addManifest({
    id: fixture.id,
    relativePath,
    category: label(fixture.folder),
    format: 'PDF',
    provider: fixture.provider,
    scenario: fixture.scenario,
    facility: fixture.facility,
    jurisdiction: fixture.jurisdiction,
    reportingPeriod:
      fixture.startDate || fixture.endDate
        ? `${fixture.startDate || 'missing'} to ${fixture.endDate || 'missing'}`
        : 'Missing',
    expected: activities
      .map(([type, quantity, unit]) => `${type}: ${quantity} ${unit || '[missing unit]'}`)
      .join('; '),
    pages: 1 + fixture.pages.length,
  });
}

function renderPdfPage(pdf, fixture) {
  pdf.setFillColor(7, 75, 86);
  pdf.rect(0, 0, 612, 86, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(19);
  pdf.text(fixture.provider, 48, 48);
  pdf.setFontSize(10);
  pdf.text(fixture.title, 48, 68);

  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(9);
  pdf.text('SYNTHETIC TEST DOCUMENT - NOT A REAL BILL', 48, 112);
  const fields = [
    ['Customer', 'CarbonLite Test Organization'],
    ['Account', `SYN-${String(fixture.id).padStart(5, '0')}`],
    ['Facility', fixture.facility],
    ['Jurisdiction', fixture.jurisdiction],
    ['Billing period', `${fixture.startDate || ''} to ${fixture.endDate || ''}`],
  ];
  let y = 144;
  fields.forEach(([name, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${name}:`, 48, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(value), 166, y);
    y += 20;
  });

  y += 14;
  pdf.setFillColor(226, 232, 240);
  pdf.rect(48, y, 516, 24, 'F');
  pdf.setFont('helvetica', 'bold');
  ['Activity', 'Quantity', 'Unit'].forEach((text, index) => {
    pdf.text(text, [58, 270, 420][index], y + 16);
  });
  y += 24;
  const activities = fixture.activities ?? [
    [fixture.activityType, fixture.quantity, fixture.unit],
  ];
  activities.forEach(([type, quantity, unit], index) => {
    if (index % 2) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(48, y, 516, 22, 'F');
    }
    pdf.setFont('helvetica', 'normal');
    pdf.text(String(type), 58, y + 15);
    pdf.text(String(quantity), 270, y + 15);
    pdf.text(String(unit || ''), 420, y + 15);
    y += 22;
  });

  y += 30;
  pdf.setTextColor(71, 85, 105);
  pdf.setFontSize(9);
  pdf.text(pdf.splitTextToSize(`Test scenario: ${fixture.scenario}. Provider names are used only for realistic testing; no affiliation is implied.`, 510), 48, y);
}

function renderExtraPage(pdf, fixture, extraPage) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.setTextColor(15, 23, 42);
  pdf.text(`${fixture.provider} - ${extraPage.title}`, 48, 54);
  pdf.setFontSize(9);
  pdf.text('SYNTHETIC TEST DOCUMENT - CONTINUED', 48, 76);
  let y = 110;
  extraPage.rows.forEach((values, index) => {
    if (index % 2) {
      pdf.setFillColor(248, 250, 252);
      pdf.rect(48, y - 14, 516, 24, 'F');
    }
    values.forEach((value, column) => {
      pdf.text(String(value), [58, 270, 420][column] ?? 500, y);
    });
    y += 26;
  });
}

async function writeCsvFixture(fixture) {
  const relativePath = `csv/${String(fixture.id).padStart(2, '0')}_${fixture.fileName}`;
  const destination = path.join(outputDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const text = fixture.rows.map(toCsvRow).join('\n');
  await fs.writeFile(destination, `${text}\n`, 'utf8');
  await addManifest({
    id: fixture.id,
    relativePath,
    category: 'CSV export',
    format: 'CSV',
    provider: 'Mixed Canadian providers',
    scenario: fixture.scenario,
    facility: 'See rows',
    jurisdiction: 'Multiple',
    reportingPeriod: '2024-2026',
    expected: `${Math.max(0, fixture.rows.length - 1)} data rows`,
    pages: 1,
  });
  return destination;
}

async function writeWorkbookFixture(fixture) {
  const relativePath = `xlsx/${String(fixture.id).padStart(2, '0')}_${fixture.fileName}`;
  const destination = path.join(outputDir, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const workbook = XLSX.utils.book_new();
  fixture.sheets.forEach((definition) => {
    const worksheet = XLSX.utils.aoa_to_sheet(definition.rows);
    worksheet['!autofilter'] = definition.rows.length
      ? { ref: `A1:F${definition.rows.length}` }
      : undefined;
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    worksheet['!cols'] = [
      { wch: 18 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 30 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, definition.name);
  });
  XLSX.writeFile(workbook, destination, { compression: true });
  await addManifest({
    id: fixture.id,
    relativePath,
    category: 'Excel spreadsheet',
    format: 'XLSX',
    provider: 'Mixed Canadian providers',
    scenario: fixture.scenario,
    facility: 'See workbook',
    jurisdiction: 'Multiple',
    reportingPeriod: '2024-2026',
    expected: `${fixture.sheets.length} sheet(s)`,
    pages: fixture.sheets.length,
  });
}

async function addManifest(entry) {
  const stat = await fs.stat(path.join(outputDir, entry.relativePath));
  manifest.push({ ...entry, sizeBytes: stat.size });
}

function toCsvRow(values) {
  return values
    .map((value) => {
      const text = value === null || value === undefined ? '' : String(value);
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    })
    .join(',');
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function label(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

await resetOutput();
for (const fixture of pdfFixtures) await writePdfFixture(fixture);

let cleanCsvPath;
for (const fixture of csvFixtures) {
  if (fixture.id === 44) {
    const relativePath = 'csv/44_clean_activity_export_copy.csv';
    const destination = path.join(outputDir, relativePath);
    await fs.copyFile(cleanCsvPath, destination);
    await addManifest({
      id: 44,
      relativePath,
      category: 'CSV export',
      format: 'CSV',
      provider: 'Mixed Canadian providers',
      scenario: fixture.scenario,
      facility: 'See rows',
      jurisdiction: 'Multiple',
      reportingPeriod: '2024',
      expected: 'Exact SHA-256 duplicate of file 39',
      pages: 1,
    });
  } else {
    const destination = await writeCsvFixture(fixture);
    if (fixture.id === 39) cleanCsvPath = destination;
  }
}

for (const fixture of xlsxFixtures) await writeWorkbookFixture(fixture);

const originalElectricity = path.join(
  outputDir,
  manifest.find((item) => item.id === 1).relativePath,
);
const duplicateRelativePath = 'duplicates/enmax_bill_exact_copy_different_name.pdf';
await fs.mkdir(path.dirname(path.join(outputDir, duplicateRelativePath)), { recursive: true });
await fs.copyFile(originalElectricity, path.join(outputDir, duplicateRelativePath));
const replaced = manifest.find((item) => item.id === 7);
await fs.rm(path.join(outputDir, replaced.relativePath));
replaced.relativePath = duplicateRelativePath;
replaced.provider = 'ENMAX';
replaced.scenario = 'Exact duplicate of file 01 under a different filename';
replaced.expected = 'Duplicate hash should match file 01';
replaced.facility = 'Calgary Fabrication Plant';
replaced.jurisdiction = 'Alberta, Canada';
replaced.reportingPeriod = '2024-01-01 to 2024-01-31';
replaced.sizeBytes = (await fs.stat(path.join(outputDir, duplicateRelativePath))).size;

manifest.sort((a, b) => a.id - b.id);
const manifestRows = [
  ['ID', 'File', 'Category', 'Format', 'Provider', 'Scenario', 'Facility', 'Jurisdiction', 'Reporting Period', 'Expected Extraction', 'Pages/Sheets', 'Size Bytes'],
  ...manifest.map((item) => [
    item.id,
    item.relativePath,
    item.category,
    item.format,
    item.provider,
    item.scenario,
    item.facility,
    item.jurisdiction,
    item.reportingPeriod,
    item.expected,
    item.pages,
    item.sizeBytes,
  ]),
];
await fs.writeFile(
  path.join(outputDir, 'manifest.csv'),
  `${manifestRows.map(toCsvRow).join('\n')}\n`,
  'utf8',
);

const readmeRows = manifest
  .map(
    (item) =>
      `| ${String(item.id).padStart(2, '0')} | \`${item.relativePath}\` | ${item.scenario} | ${item.expected} |`,
  )
  .join('\n');
const readme = `# CarbonLite Test Data Library

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
- Files **09** and **10** are both named \`utility_bill.pdf\` in separate upload-batch folders, but contain different content.

## Expected results

| ID | File | Test scenario | Expected extraction |
|---:|---|---|---|
${readmeRows}

## Testing guidance

1. Upload clean files first and verify activity type, quantity, unit, date, facility, and source reference.
2. Upload duplicate pairs and confirm hash-based duplicate protection.
3. Upload files with missing dates or units and confirm review warnings appear without hidden assumptions.
4. Confirm OCR-like values such as \`9O5O\` and \`2,8S0\` require review instead of silent correction.
5. Confirm diesel in tonnes is not silently converted to litres.
6. Confirm multi-page and multi-facility documents retain distinct source evidence.
7. Confirm reports keep 2024, 2025, and 2026 date filtering consistent.

See \`manifest.csv\` for machine-readable expectations.
`;
await fs.writeFile(path.join(outputDir, 'README.md'), readme, 'utf8');

console.log(`Generated ${manifest.length} test files in ${outputDir}`);
if (manifest.length !== 50) {
  throw new Error(`Expected 50 fixtures, generated ${manifest.length}`);
}
