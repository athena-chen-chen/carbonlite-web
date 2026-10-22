import * as XLSX from 'xlsx';
import { goldenReport } from '../reports/pdf/__tests__/goldenFixtures';
import { buildPilotCsv } from './reportCsvExport';
import { buildDataRecordsCsv } from './dataRecordsCsvExport';
import {
  buildReviewPackageDataRecordsCsv,
  buildReviewPackageSiteFacilityBreakdownCsv,
  buildReviewPackageSiteFacilityActivityBreakdownCsv,
  buildReviewPackageFactorSourceSummaryCsv,
  buildReviewPackageCalculationTraceabilityCsv,
  buildReviewPackageAuditEvidenceCsv,
  buildReviewPackageRecordsRequiringReviewCsv,
} from './reportReviewPackageCsvExport';
import { buildSiteFacilityBreakdown } from './siteFacilityBreakdown';
import type { CalculationAuditDetail } from '../services/metrics';

function parse(csv: string, expectedRows = 1) {
  const workbook = XLSX.read(csv, { type: 'string', raw: true });
  const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], {
    header: 1, raw: true, defval: '', blankrows: false,
  });
  const [headers, ...data] = rows;
  expect(data).toHaveLength(expectedRows);
  data.forEach(row => expect(row).toHaveLength(headers.length));
  return data.map(row => Object.fromEntries(headers.map((header, i) => [header, row[i]])));
}

const { report } = goldenReport('enmax');
const attack: CalculationAuditDetail = {
  ...report.calculationDetails[0],
  facilityName: '=SUM(1,2)', sourceReference: '@HYPERLINK("example.com","click")',
  sourceFileName: '=evil.csv', sourceSheetName: '-1+2', sourceType: 'SPREADSHEET',
  notes: '+CMD("payload")\nsecond line', activityUnit: '-CMD(...)',
  factorName: '+SUM(1,2)', factorDisplayName: '+SUM(1,2)', factorId: 'factor-1',
  sourceAuthority: '@authority', sourceDocument: '=source', sourceUrl: '=url',
  factorSelectionExplanation: '=explanation', calculationFormula: '=SUM(1,2)',
  activityQuantity: 25.5, factorValue: 0.53,
  calculatedEmission: 579.4, calculatedEmissionsKgCO2e: 579.4,
  status: 'CALCULATED',
};

it('protects a full Technical Emissions Report CSV without changing the report or numeric values', () => {
  const input = { ...report, calculationDetails: [attack] };
  const before = JSON.stringify(input);
  const [row] = parse(buildPilotCsv(input));
  expect(row['Site / Facility']).toBe("'=SUM(1,2)");
  expect(row['Source Reference']).toBe(`'${attack.sourceReference}`);
  expect(row['Source File']).toBe("'=evil.csv");
  expect(row['Source Sheet']).toBe("'-1+2");
  expect(row['Matched Factor Name']).toBe("'+SUM(1,2)");
  expect(row['Factor Source Authority']).toBe("'@authority");
  expect(row['Factor Source Document']).toBe("'=source");
  expect(row['Factor Source URL']).toBe("'=url");
  expect(row['Factor Selection Explanation']).toBe("'=explanation");
  expect(row.Unit).toBe("'-CMD(...)");
  expect(row.Quantity).toBe('25.5');
  expect(row['Matched Factor Value']).toBe('0.53');
  expect(row['Calculated Emissions kgCO2e']).toBe('579.4');
  expect(JSON.stringify(input)).toBe(before);
});

it('protects Data Records names, references and multiline notes, preserving numeric strings', () => {
  const records = [{
    activityType: 'ELECTRICITY', customTypeLabel: '=category', quantity: '-1000.25',
    unit: '-unit', facilityName: '=SUM(1,2)', sourceType: 'SPREADSHEET', sourceFileName: '=evil.csv',
    sourceReference: attack.sourceReference, notes: attack.notes,
    matchedFactorName: '-123', calculatedEmissionsKgCO2e: '3007.84',
  }];
  const before = JSON.stringify(records);
  const [row] = parse(buildDataRecordsCsv(records));
  expect(row['Activity Type']).toBe("'=category");
  expect(row['Site / Facility']).toBe("'=SUM(1,2)");
  expect(row['Source Reference']).toBe(`'=evil.csv · ${attack.sourceReference}`);
  expect(row.Notes).toBe(`'${attack.notes}`);
  expect(row.Unit).toBe("'-unit");
  expect(row['Emission Factor']).toBe("'-123"); // Factor *name* is text, even if numeric-looking.
  expect(row.Quantity).toBe('-1000.25');
  expect(row['Calculated Emissions kgCO2e']).toBe('3007.84');
  const [numericFallback] = parse(buildDataRecordsCsv([{ quantity: '-1.5', matchedFactorValue: '-12.5' }]));
  expect(numericFallback['Emission Factor']).toBe('-12.5');
  expect(JSON.stringify(records)).toBe(before);
});

it.each([
  ['data records', buildReviewPackageDataRecordsCsv],
  ['calculation traceability', buildReviewPackageCalculationTraceabilityCsv],
] as const)('protects review-package %s text and preserves numeric columns', (kind, build) => {
  const before = JSON.stringify(attack);
  const [row] = parse(build([attack]));
  expect(row['Site / Facility']).toBe("'=SUM(1,2)");
  expect(row['Source Reference']).toBe(`'${attack.sourceReference}`);
  expect(row.Notes).toBe(`'${attack.notes}`);
  expect(row.Quantity).toBe(kind === 'calculation traceability' ? '25.50' : '25.5');
  expect(row['Calculated Emissions kgCO2e']).toBe('579.4');
  if ('Formula' in row) expect(row.Formula).toBe("'=SUM(1,2)");
  expect(JSON.stringify(attack)).toBe(before);
});

it('protects both site/facility breakdown CSV builders', () => {
  const rows = buildSiteFacilityBreakdown([attack]);
  const [row] = parse(buildReviewPackageSiteFacilityBreakdownCsv(rows, [attack]));
  expect(row['Site / Facility']).toBe("'=SUM(1,2)");
  expect(row['Total kgCO2e']).toBe('579.4');
  const activityRows = rows.map(row => ({ ...row, activityBreakdown: row.activityBreakdown.map(activity => ({ ...activity, activityType: '=category' })) }));
  const [activity] = parse(buildReviewPackageSiteFacilityActivityBreakdownCsv(activityRows));
  expect(activity['Site / Facility']).toBe("'=SUM(1,2)");
  expect(activity['Activity Type']).toBe("'=category");
  expect(activity['Total kgCO2e']).toBe('579.4');
});

it('protects custom factor names, authorities, source URLs and notes in factor summaries', () => {
  const [row] = parse(buildReviewPackageFactorSourceSummaryCsv([{
    factorName: '-123', factorValue: '-1.5', inputUnit: 'kWh', resultUnit: '-unit',
    sourceAuthority: '=authority', sourceUrl: '@url', notes: '+notes',
    jurisdiction: '=jurisdiction', factorType: 'Custom', verified: false,
  }]));
  expect(row['Factor Name']).toBe("'-123");
  expect(row['Factor Value']).toBe('-1.5');
  expect(row.Source).toBe("'=authority");
  expect(row['Source Reference / URL']).toBe("'@url");
  expect(row.Notes).toBe("'+notes");
  expect(row['Factor Unit']).toBe("'-unit");
  expect(row.Jurisdiction).toBe("'=jurisdiction");
});

it('protects audit-evidence source filenames, sheets, formulas and report metadata', () => {
  const [row] = parse(buildReviewPackageAuditEvidenceCsv([attack], { reportId: '=report', reportVersion: '+version' }));
  expect(row['Source File']).toBe("'=evil.csv");
  expect(row['Source Sheet']).toBe("'-1+2");
  expect(row['Source Reference']).toBe(`'${attack.sourceReference}`);
  expect(row.Formula).toBe("'=SUM(1,2)");
  expect(row['Report ID']).toBe("'=report");
  expect(row['Report Version']).toBe("'+version");
  expect(row.Quantity).toBe('25.5');
  expect(row['Factor Value']).toBe('0.53');
  expect(row['Calculated Emissions kgCO2e']).toBe('579.4');
});

it('protects records needing attention, including arbitrary imported reasons', () => {
  const [row] = parse(buildReviewPackageRecordsRequiringReviewCsv([{
    ...attack, status: 'MISSING_FACTOR', calculationStatus: 'MISSING_FACTOR',
    matchingStatus: 'MISSING_FACTOR', matchingMessage: '=reason',
  }]));
  expect(row['Site / Facility']).toBe("'=SUM(1,2)");
  expect(row.Reason).toBe("'=reason");
  expect(row.Notes).toBe(`'${attack.notes}`);
});

it.each([-1, -1.5, -1000.25, 579.4, 2428.44, 3007.84, 808.5, 115.5, 268])(
  'keeps numeric value %s unchanged across the detail CSV builders', value => {
    const detail = { ...attack, activityQuantity: value, calculatedEmission: value, calculatedEmissionsKgCO2e: value };
    for (const build of [buildPilotCsv, buildReviewPackageDataRecordsCsv, buildReviewPackageCalculationTraceabilityCsv, buildReviewPackageAuditEvidenceCsv]) {
      const [row] = parse(build([detail]));
      expect(Number(row.Quantity.replace(/,/g, ''))).toBe(value);
      expect(row.Quantity).not.toContain("'");
      expect(row['Calculated Emissions kgCO2e']).toBe(String(value));
    }
  },
);
