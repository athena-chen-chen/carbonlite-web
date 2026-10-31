import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

export const ACTIVITY_DATA_TEMPLATE_HEADERS = [
  'Activity Type',
  'Quantity',
  'Unit',
  'Date',
  'Country',
  'Province',
  'Facility',
  'Rooms',
  'Nights',
  'Origin Airport',
  'Destination Airport',
  'Passengers',
  'Trip Type',
  'Source Reference',
  'Original Document',
  'Notes',
] as const;

export const ACTIVITY_DATA_TEMPLATE_ACTIVITY_TYPES = [
  'Electricity',
  'Natural Gas',
  'Gasoline',
  'Diesel',
  'Business Travel - Accommodation',
  'Air Travel',
] as const;

export const ACTIVITY_DATA_TEMPLATE_TRIP_TYPES = ['ONE_WAY', 'ROUND_TRIP'] as const;

const TEMPLATE_DATA_FIRST_ROW = 2;
const TEMPLATE_DATA_LAST_ROW = 1001;

const INSTRUCTIONS = [
  ['General', 'One row = one activity record. CarbonLite selects approved emission factors and calculates emissions.'],
  ['Do not enter', 'Emission factors, calculated emissions, or market-based Scope 2 results.'],
  ['Electricity', 'Enter Quantity in kWh. Province and activity date/year are required.'],
  ['Natural Gas', 'Current paid-pilot support includes Alberta using GJ or m3.'],
  ['Gasoline and Diesel', 'Enter Quantity in L.'],
  ['Hotel', 'Use Quantity with Unit = room-night, or enter Rooms and Nights. Do not use generic nights by itself.'],
  ['Air Travel', 'Enter Origin Airport, Destination Airport, Passengers, and Trip Type. Do not manually calculate passenger-km.'],
  ['Trip Type', 'Use ONE_WAY or ROUND_TRIP.'],
] as const;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function listValidationXml(input: {
  range: string;
  values: readonly string[];
  errorTitle: string;
  error: string;
}) {
  const formula = `&quot;${escapeXml(input.values.join(','))}&quot;`;
  return [
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1"`,
    ` errorTitle="${escapeXml(input.errorTitle)}" error="${escapeXml(input.error)}"`,
    ` sqref="${input.range}"><formula1>${formula}</formula1></dataValidation>`,
  ].join('');
}

function addActivityDataValidations(xlsxBytes: Uint8Array) {
  const files = unzipSync(xlsxBytes);
  const worksheetPath = 'xl/worksheets/sheet1.xml';
  const worksheetFile = files[worksheetPath];
  if (!worksheetFile) throw new Error('Generated template is missing its Activity Data worksheet.');

  const activityValidation = listValidationXml({
    range: `A${TEMPLATE_DATA_FIRST_ROW}:A${TEMPLATE_DATA_LAST_ROW}`,
    values: ACTIVITY_DATA_TEMPLATE_ACTIVITY_TYPES,
    errorTitle: 'Invalid activity type',
    error: 'Select an activity type from the list.',
  });
  const tripValidation = listValidationXml({
    range: `M${TEMPLATE_DATA_FIRST_ROW}:M${TEMPLATE_DATA_LAST_ROW}`,
    values: ACTIVITY_DATA_TEMPLATE_TRIP_TYPES,
    errorTitle: 'Invalid trip type',
    error: 'Select ONE_WAY or ROUND_TRIP.',
  });
  const validations = `<dataValidations count="2">${activityValidation}${tripValidation}</dataValidations>`;
  const worksheetXml = strFromU8(worksheetFile);
  const insertionPoint = worksheetXml.includes('<pageMargins') ? '<pageMargins' : '</worksheet>';
  const blankDateCellsXml = worksheetXml.replace(
    /<c r="D(\d+)"([^>]*)><v>0<\/v><\/c>/g,
    '<c r="D$1"$2/>',
  );
  const patchedXml = blankDateCellsXml.replace(insertionPoint, `${validations}${insertionPoint}`);
  if (patchedXml === worksheetXml) throw new Error('Unable to add template data validations.');

  files[worksheetPath] = strToU8(patchedXml);
  return zipSync(files, { level: 6 });
}

export function createActivityDataCsvTemplate() {
  return `${ACTIVITY_DATA_TEMPLATE_HEADERS.join(',')}\n`;
}

export function createActivityDataExcelTemplate() {
  const activitySheet = XLSX.utils.aoa_to_sheet([[...ACTIVITY_DATA_TEMPLATE_HEADERS]]);
  activitySheet['!ref'] = `A1:P${TEMPLATE_DATA_LAST_ROW}`;
  activitySheet['!autofilter'] = { ref: 'A1:P1' };
  activitySheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  activitySheet['!cols'] = ACTIVITY_DATA_TEMPLATE_HEADERS.map((header) => ({
    wch: Math.max(12, Math.min(32, header.length + 2)),
  }));

  for (let row = TEMPLATE_DATA_FIRST_ROW; row <= TEMPLATE_DATA_LAST_ROW; row += 1) {
    activitySheet[`D${row}`] = { t: 'n', v: 0, z: 'yyyy-mm-dd' };
  }

  const instructionsSheet = XLSX.utils.aoa_to_sheet([
    ['Topic', 'Guidance'],
    ...INSTRUCTIONS.map((row) => [...row]),
  ]);
  instructionsSheet['!cols'] = [{ wch: 22 }, { wch: 100 }];
  instructionsSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, activitySheet, 'Activity Data');
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  const output = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    cellStyles: true,
  });
  return addActivityDataValidations(new Uint8Array(output));
}
