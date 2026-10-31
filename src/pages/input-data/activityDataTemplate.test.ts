import * as XLSX from 'xlsx';
import { strFromU8, unzipSync } from 'fflate';
import {
  ACTIVITY_DATA_TEMPLATE_ACTIVITY_TYPES,
  ACTIVITY_DATA_TEMPLATE_HEADERS,
  ACTIVITY_DATA_TEMPLATE_TRIP_TYPES,
  createActivityDataCsvTemplate,
  createActivityDataExcelTemplate,
} from './activityDataTemplate';

describe('paid-pilot activity data template', () => {
  it('uses the canonical paid-pilot headers for CSV without duplicate concepts', () => {
    expect(createActivityDataCsvTemplate()).toBe(`${ACTIVITY_DATA_TEMPLATE_HEADERS.join(',')}\n`);
    expect(ACTIVITY_DATA_TEMPLATE_HEADERS).toEqual([
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
    ]);
    expect(ACTIVITY_DATA_TEMPLATE_HEADERS).not.toEqual(
      expect.arrayContaining(['Consumption', 'UOM', 'Record Category', 'Location Name']),
    );
  });

  it('generates an XLSX with canonical headers, date formatting, and concise instructions', () => {
    const bytes = createActivityDataExcelTemplate();
    const workbook = XLSX.read(bytes, { type: 'array', cellStyles: true, sheetStubs: true });

    expect(workbook.SheetNames).toEqual(['Activity Data', 'Instructions']);
    expect(
      XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Activity Data'], {
        header: 1,
        range: 'A1:P1',
      })[0],
    ).toEqual(ACTIVITY_DATA_TEMPLATE_HEADERS);
    expect(workbook.Sheets['Activity Data'].D2.z).toBe('yyyy-mm-dd');

    const instructions = XLSX.utils
      .sheet_to_json<string[]>(workbook.Sheets.Instructions, { header: 1 })
      .flat()
      .join(' ');
    expect(instructions).toContain('One row = one activity record.');
    expect(instructions).toContain('approved emission factors');
    expect(instructions).toContain('market-based Scope 2 results');
    expect(instructions).toContain('Alberta using GJ or m3');
    expect(instructions).toContain('Rooms and Nights');
    expect(instructions).toContain('Do not manually calculate passenger-km.');
  });

  it('adds native Activity Type and Trip Type dropdowns to the XLSX', () => {
    const files = unzipSync(createActivityDataExcelTemplate());
    const worksheetXml = strFromU8(files['xl/worksheets/sheet1.xml']);

    expect(worksheetXml).toContain('<dataValidations count="2">');
    expect(worksheetXml).toContain('sqref="A2:A1001"');
    expect(worksheetXml).toContain(`&quot;${ACTIVITY_DATA_TEMPLATE_ACTIVITY_TYPES.join(',')}&quot;`);
    expect(worksheetXml).toContain('sqref="M2:M1001"');
    expect(worksheetXml).toContain(`&quot;${ACTIVITY_DATA_TEMPLATE_TRIP_TYPES.join(',')}&quot;`);
  });
});
