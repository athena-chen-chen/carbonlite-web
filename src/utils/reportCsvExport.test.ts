import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildPilotCsv,
  buildPilotCsvRows,
} from './reportCsvExport';

function calculatedDetail(
  input: Partial<CalculationAuditDetail> & {
    activityDataId: string;
    activityType: string;
    activityQuantity: number;
    activityUnit: string;
    factorName: string;
    factorValue: number;
    calculatedEmissionsKgCO2e: number;
  },
): CalculationAuditDetail {
  return {
    activityDataId: input.activityDataId,
    activityType: input.activityType,
    recordDate: input.recordDate ?? '2026-07-20',
    dateEstimated: false,
    reportingYear: input.reportingYear ?? input.recordYear ?? 2026,
    recordYear: input.recordYear ?? input.reportingYear ?? 2026,
    jurisdiction: input.jurisdiction ?? [input.jurisdictionRegion, input.jurisdictionCountry ?? 'Canada'].filter(Boolean).join(', '),
    jurisdictionCountry: input.jurisdictionCountry ?? 'Canada',
    jurisdictionRegion: input.jurisdictionRegion ?? null,
    activityQuantity: input.activityQuantity,
    activityUnit: input.activityUnit,
    factorName: input.factorName,
    factorValue: input.factorValue,
    factorInputUnit: input.factorInputUnit ?? input.activityUnit,
    factorResultUnit: input.factorResultUnit ?? 'kgCO2e',
    factorYear: input.factorYear ?? 2025,
    factorJurisdictionCountry: input.factorJurisdictionCountry ?? 'Canada',
    factorJurisdictionRegion: input.factorJurisdictionRegion ?? null,
    factorSource: input.factorSource ?? 'CarbonLite',
    sourceAuthority: input.sourceAuthority ?? 'CarbonLite',
    sourceDocument: input.sourceDocument ?? 'CarbonLite MVP Default Factors v1.0',
    sourceYear: input.sourceYear ?? input.factorYear ?? 2025,
    factorVerified: input.factorVerified ?? false,
    factorConfidenceLevel: input.factorConfidenceLevel ?? 'PILOT_ESTIMATE',
    factorVerificationStatus:
      input.factorVerificationStatus ??
      (input.activityType === 'ELECTRICITY' ? 'DRAFT' : 'INTERNAL_REVIEW_REQUIRED'),
    factorType: input.factorType ?? 'System',
    factorVersion: input.factorVersion ?? null,
    factorDefaultScope: input.factorDefaultScope ?? null,
    facilityName: input.facilityName ?? null,
    calculatedEmission: input.calculatedEmissionsKgCO2e,
    calculatedEmissionsKgCO2e: input.calculatedEmissionsKgCO2e,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    status: 'CALCULATED',
    sourceType: input.sourceType ?? 'AI_EXTRACTION',
    sourceFileName: input.sourceFileName ?? 'Golden Test Data.xlsx',
    sourceSheetName: input.sourceSheetName ?? null,
    sourceReference: input.sourceReference ?? 'PDF extraction',
    sourceRow: input.sourceRow ?? null,
    costCad: input.costCad ?? null,
    factorSelectionReason: input.factorSelectionReason ?? null,
    factorSelectionExplanation: input.factorSelectionExplanation ?? null,
    sourceUrl: input.sourceUrl ?? null,
  };
}

function waterDetail(): CalculationAuditDetail {
  return {
    activityDataId: 'cmry-water',
    activityType: 'WATER',
    recordDate: '2026-07-20',
    dateEstimated: false,
    reportingYear: 2026,
    recordYear: 2026,
    jurisdiction: 'Canada',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: null,
    activityQuantity: 100,
    activityUnit: 'm3',
    factorSource: 'Tracked metric',
    factorVerified: false,
    calculationStatus: 'TRACKED_ONLY',
    matchingStatus: 'TRACKED_ONLY',
    status: 'TRACKED_ONLY',
    sourceType: 'AI_EXTRACTION',
    sourceFileName: 'Golden Test Data.xlsx',
    sourceReference: 'PDF extraction',
    costCad: null,
  };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const next = csv[index + 1];

    if (inQuotes && character === '"' && next === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes && character === ',') {
      row.push(value);
      value = '';
    } else if (!inQuotes && character === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (!inQuotes && character === '\r') {
      continue;
    } else {
      value += character;
    }
  }

  row.push(value);
  rows.push(row);

  const [headers, ...dataRows] = rows;
  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header, dataRow[index] ?? ''])),
  );
}

const goldenDetails: CalculationAuditDetail[] = [
  calculatedDetail({
    activityDataId: 'cmry-electricity-ab-kwh',
    activityType: 'ELECTRICITY',
    activityQuantity: 12500,
    activityUnit: 'kWh',
    jurisdictionRegion: 'Alberta',
    factorJurisdictionRegion: 'Alberta',
    factorName: 'Electricity - Alberta',
    factorValue: 0.53,
    calculatedEmissionsKgCO2e: 6625,
    factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
    factorSelectionExplanation: 'No exact 2026 factor was available. The nearest available factor was used for internal review only.',
  }),
  calculatedDetail({
    activityDataId: 'cmry-electricity-bc',
    activityType: 'ELECTRICITY',
    activityQuantity: 100,
    activityUnit: 'kWh',
    jurisdictionRegion: 'British Columbia',
    factorJurisdictionRegion: 'British Columbia',
    factorName: 'Electricity - British Columbia',
    factorValue: 0.02,
    calculatedEmissionsKgCO2e: 2,
  }),
  calculatedDetail({
    activityDataId: 'cmry-electricity-on',
    activityType: 'ELECTRICITY',
    activityQuantity: 1000,
    activityUnit: 'kWh',
    jurisdictionRegion: 'Ontario',
    factorJurisdictionRegion: 'Ontario',
    factorName: 'Electricity - Ontario',
    factorValue: 0.12,
    calculatedEmissionsKgCO2e: 120,
  }),
  calculatedDetail({
    activityDataId: 'cmry-electricity-ab-mwh',
    activityType: 'ELECTRICITY',
    activityQuantity: 50,
    activityUnit: 'MWh',
    jurisdictionRegion: 'Alberta',
    factorJurisdictionRegion: 'Alberta',
    factorName: 'Electricity - Alberta',
    factorValue: 0.53,
    factorInputUnit: 'kWh',
    calculatedEmissionsKgCO2e: 26500,
  }),
  calculatedDetail({
    activityDataId: 'cmry-natural-gas',
    activityType: 'NATURAL_GAS',
    activityQuantity: 1000,
    activityUnit: 'm3',
    jurisdictionRegion: null,
    factorName: 'Natural Gas - Canada',
    factorValue: 1.89,
    calculatedEmissionsKgCO2e: 1890,
  }),
  calculatedDetail({
    activityDataId: 'cmry-gasoline',
    activityType: 'GASOLINE',
    activityQuantity: 500,
    activityUnit: 'liters',
    jurisdictionRegion: null,
    factorName: 'Gasoline - Canada',
    factorValue: 2.31,
    factorInputUnit: 'liters',
    calculatedEmissionsKgCO2e: 1155,
  }),
  calculatedDetail({
    activityDataId: 'cmry-diesel',
    activityType: 'DIESEL',
    activityQuantity: 100,
    activityUnit: 'liters',
    jurisdictionRegion: null,
    factorName: 'Diesel - Canada',
    factorValue: 2.68,
    factorInputUnit: 'liters',
    calculatedEmissionsKgCO2e: 268,
  }),
  calculatedDetail({
    activityDataId: 'cmry-air-travel',
    activityType: 'AIR_TRAVEL',
    activityQuantity: 5000,
    activityUnit: 'km',
    jurisdictionRegion: null,
    factorName: 'Air Travel - Canada',
    factorValue: 0.115,
    calculatedEmissionsKgCO2e: 575,
    factorDefaultScope: 'SCOPE_3',
  }),
  calculatedDetail({
    activityDataId: 'cmry-hotel',
    activityType: 'HOTEL',
    activityQuantity: 10,
    activityUnit: 'nights',
    jurisdictionRegion: null,
    factorName: 'Business Travel - Accommodation - Canada',
    factorValue: 15,
    factorInputUnit: 'nights',
    calculatedEmissionsKgCO2e: 150,
    factorDefaultScope: 'SCOPE_3',
  }),
  waterDetail(),
];

describe('pilot CSV export', () => {
  it('builds pilot-facing rows without internal ids and with machine-readable numeric values', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const csv = buildPilotCsv(goldenDetails);

    expect(Object.keys(rows[0])).toContain('Record No.');
    expect(Object.keys(rows[0])).not.toContain('activityRecordId');
    expect(csv).not.toContain('activityRecordId');
    expect(csv).not.toContain('cmry-electricity-ab-kwh');

    expect(rows[0]['Record No.']).toBe(1);
    expect(rows[0].Quantity).toBe('12500');
    expect(rows[0]['Quantity Display']).toBe('12,500 kWh');
    expect(rows[0]['Calculated Emissions kgCO2e']).toBe('6625');
    expect(rows[0]['Calculated Emissions Display']).toBe('6,625 kgCO2e');
    expect(rows[7].Quantity).toBe('5000');
    expect(rows[0]['Calculation Status']).toBe('CALCULATED');
    expect(rows[0]['Matching Status']).toBe('MATCHED');
    expect(rows[0]['Report Treatment']).toBe('INCLUDED');
    expect(rows[7].Formula).toBe('5,000 km × 0.115 kg CO₂e/km = 575 kg CO₂e');
  });

  it('shows unit conversion in the MWh electricity formula without changing emissions totals', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const csv = buildPilotCsv(goldenDetails);
    const mwhElectricity = rows.find((row) => row['Record No.'] === 4);
    const diesel = rows.find((row) => row['Activity Type'] === 'Diesel');

    expect(mwhElectricity?.['Quantity Display']).toBe('50 MWh');
    expect(mwhElectricity?.Formula).toBe(
      '50 MWh × 1,000 = 50,000 kWh; 50,000 kWh × 0.53 kg CO₂e/kWh = 26,500 kg CO₂e',
    );
    expect(mwhElectricity?.['Calculated Emissions kgCO2e']).toBe('26500');
    expect(csv).toContain(
      '"50 MWh × 1,000 = 50,000 kWh; 50,000 kWh × 0.53 kg CO₂e/kWh = 26,500 kg CO₂e"',
    );
    expect(csv).not.toContain('50 x 0.53 = 26500');
    expect(csv).not.toContain('50 × 0.53 = 26,500');

    expect(diesel?.Formula).toBe(
      '100 liters × 2.68 kg CO₂e/liter = 268 kg CO₂e',
    );
    expect(csv).not.toContain('kgCO2e/liters');
    expect(csv).not.toContain('kgCO2e/nights');
  });

  it('uses professional factor labels, source labels, and review notes', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const electricityRows = rows.filter((row) => row['Activity Type'] === 'Electricity');
    const naturalGas = rows.find((row) => row['Activity Type'] === 'Natural Gas');
    const gasoline = rows.find((row) => row['Activity Type'] === 'Gasoline');
    const hotel = rows.find((row) => row['Activity Type'] === 'Business Travel - Accommodation');
    const airTravel = rows.find((row) => row['Activity Type'] === 'Air Travel');
    const water = rows.find((row) => row['Activity Type'] === 'Water');

    expect(naturalGas?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(gasoline?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(airTravel?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(hotel?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(hotel?.['Matched Factor Name']).toBe('Business Travel - Accommodation - Canada');
    expect(gasoline?.['Matched Factor Unit']).toBe('kgCO2e/liter');
    expect(hotel?.['Matched Factor Unit']).toBe('kgCO2e/night');

    expect(rows[0]['Review Note']).toContain('A prior-year factor was used');
    expect(airTravel?.['Consultant Review Recommended']).toBe('Yes');
    expect(airTravel?.['Review Note']).toContain('consultant review is recommended before formal reporting');
    electricityRows.forEach((row) => {
      expect(row['Verification Status']).toBe('Internal Review Required');
      expect(row['Confidence Level']).toBe('Pilot Estimate');
      expect(row['Consultant Review Recommended']).toBe('Yes');
    });

    expect(water?.Scope).toBe('Tracked Metric');
    expect(water?.['Report Treatment']).toBe('TRACKED_ONLY');
    expect(water?.['Calculation Status']).toBe('TRACKED_ONLY');
    expect(water?.['Matching Status']).toBe('NOT_APPLICABLE');
    expect(water?.['Matched Factor Name']).toBe('');
    expect(water?.['Matched Factor Value']).toBe('');
    expect(water?.['Matched Factor Unit']).toBe('');
    expect(water?.['Factor Jurisdiction']).toBe('');
    expect(water?.['Factor Source Year']).toBe('');
    expect(water?.['Factor Version']).toBe('');
    expect(water?.['Calculated Emissions kgCO2e']).toBe('');
    expect(water?.['Calculated Emissions Display']).toBe('Tracked Metric');
    expect(water?.['Consultant Review Recommended']).toBe('No');
    expect(water?.['Review Note']).toBe('Tracked metric. Not included in the GHG emissions total.');

    rows.forEach((row) => {
      expect(row['Source File']).toBe('Golden Test Data.xlsx');
      expect(row['Source Type']).toBe('Spreadsheet');
      expect(row['Import Method']).toBe('File Import');
      expect(row['Source Reference']).toBe('PDF extraction');
    });
    expect(buildPilotCsv(goldenDetails)).not.toContain('Source Reference: Spreadsheet import');
    expect(buildPilotCsv(goldenDetails)).not.toContain(',Spreadsheet import,');
    expect(buildPilotCsv(goldenDetails)).not.toMatch(/\bDraft\b/);
  });

  it('keeps spreadsheet source file and row-level source reference separate', () => {
    const rows = buildPilotCsvRows([
      calculatedDetail({
        activityDataId: 'activity-march-elec-001',
        activityType: 'ELECTRICITY',
        activityQuantity: 980,
        activityUnit: 'kWh',
        jurisdictionRegion: 'Alberta',
        factorJurisdictionRegion: 'Alberta',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 519.4,
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceReference: 'MARCH-ELEC-001',
        sourceRow: 2,
      }),
    ]);

    expect(rows[0]['Source File']).toBe('carbonlite_needs_review_test.xlsx');
    expect(rows[0]['Source Sheet']).toBe('Messy_Operations');
    expect(rows[0]['Source Row']).toBe('2');
    expect(rows[0]['Source Type']).toBe('Spreadsheet');
    expect(rows[0]['Import Method']).toBe('File Import');
    expect(rows[0]['Source Reference']).toBe('MARCH-ELEC-001');
  });

  it('exports golden report records with jurisdiction lineage, costs, source rows, and tracked-only null semantics', () => {
    const goldenReportRecords = [
      calculatedDetail({
        activityDataId: 'activity-march-elec-001',
        activityType: 'ELECTRICITY',
        recordDate: '2026-03-01',
        activityQuantity: 980,
        activityUnit: 'kWh',
        jurisdiction: 'Alberta, Canada',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        facilityName: 'Calgary HQ',
        factorJurisdictionRegion: 'Alberta',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        factorYear: 2025,
        calculatedEmissionsKgCO2e: 519.4,
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceReference: 'MARCH-ELEC-001',
        sourceRow: 2,
        costCad: 214.55,
        factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
        factorSelectionExplanation: 'No exact 2026 factor was available. The nearest available factor was used for internal review only.',
      }),
      {
        ...waterDetail(),
        activityDataId: 'activity-march-water-007',
        recordDate: '2026-03-07',
        jurisdiction: 'Alberta, Canada',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        activityQuantity: 18,
        activityUnit: 'm3',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceReference: 'MARCH-WATER-007',
        sourceRow: 8,
        costCad: 64,
        calculatedEmission: null,
        calculatedEmissionsKgCO2e: null,
      },
      calculatedDetail({
        activityDataId: 'activity-march-hotel-010',
        activityType: 'HOTEL',
        recordDate: '2026-03-10',
        activityQuantity: 4,
        activityUnit: 'nights',
        jurisdiction: 'Canada (Generic)',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
        facilityName: 'Toronto Client Visit',
        factorName: 'Hotel stays',
        factorValue: 15,
        factorInputUnit: 'nights',
        factorYear: 2025,
        factorJurisdictionCountry: 'Canada',
        factorJurisdictionRegion: 'Canada (Generic)',
        calculatedEmissionsKgCO2e: 60,
        factorDefaultScope: 'SCOPE_3',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceReference: 'MARCH-HOTEL-010',
        sourceRow: 11,
        costCad: 720,
        factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
        factorSelectionExplanation: 'No Ontario-specific factor was available. A Canada-generic prior-year factor was used.',
      }),
    ];

    const rows = buildPilotCsvRows(goldenReportRecords);
    const csv = buildPilotCsv(goldenReportRecords);
    const parsedRows = parseCsv(csv);
    const byReference = new Map(rows.map((row) => [row['Source Reference'], row]));

    expect(rows).toHaveLength(3);
    expect(parsedRows).toHaveLength(3);
    expect(parsedRows.every((row) => Object.keys(row).length === Object.keys(parsedRows[0]).length)).toBe(true);

    expect(byReference.get('MARCH-ELEC-001')).toMatchObject({
      'Cost CAD': '214.55',
      'Site / Facility': 'Calgary HQ',
      Country: 'Canada',
      'Province / Jurisdiction': 'Alberta',
      'Matched Factor Name': 'Electricity - Alberta',
      'Matched Factor Value': '0.53',
      'Matched Factor Unit': 'kgCO2e/kWh',
      'Factor Jurisdiction': 'Alberta, Canada',
      'Factor Source Year': 2025,
      'Factor Selection Reason': 'PRIOR_YEAR_FALLBACK',
      'Consultant Review Recommended': 'Yes',
      'Calculated Emissions kgCO2e': '519.4',
      'Calculated Emissions Display': '519.4 kgCO2e',
      'Source File': 'carbonlite_needs_review_test.xlsx',
      'Source Sheet': 'Messy_Operations',
      'Source Row': '2',
      'Review Note': 'Matched to a CarbonLite system-default factor. A prior-year factor was used because no exact factor was available for the record year. Review before formal reporting.',
    });

    expect(byReference.get('MARCH-WATER-007')).toMatchObject({
      'Cost CAD': '64',
      Country: 'Canada',
      'Province / Jurisdiction': 'Alberta',
      'Report Treatment': 'TRACKED_ONLY',
      'Calculation Status': 'TRACKED_ONLY',
      'Matching Status': 'NOT_APPLICABLE',
      'Matched Factor Name': '',
      'Matched Factor Value': '',
      'Matched Factor Unit': '',
      'Factor Jurisdiction': '',
      'Factor Source Year': '',
      'Factor Version': '',
      'Factor Selection Reason': '',
      'Consultant Review Recommended': 'No',
      'Calculated Emissions kgCO2e': '',
      'Calculated Emissions Display': 'Tracked Metric',
      'Source Sheet': 'Messy_Operations',
      'Source Row': '8',
      'Review Note': 'Tracked metric. Not included in the GHG emissions total.',
    });

    expect(byReference.get('MARCH-HOTEL-010')).toMatchObject({
      'Activity Type': 'Business Travel - Accommodation',
      Quantity: '4',
      Unit: 'nights',
      'Cost CAD': '720',
      'Site / Facility': 'Toronto Client Visit',
      Country: 'Canada',
      'Province / Jurisdiction': 'Ontario',
      Scope: 'Scope 3',
      'Report Treatment': 'INCLUDED',
      'Calculation Status': 'CALCULATED',
      'Matched Factor Name': 'Hotel stays',
      'Matched Factor Value': '15',
      'Matched Factor Unit': 'kgCO2e/night',
      'Factor Jurisdiction': 'Canada (Generic)',
      'Factor Source Year': 2025,
      'Factor Selection Reason': 'GENERIC_JURISDICTION_FALLBACK',
      'Consultant Review Recommended': 'Yes',
      'Calculated Emissions kgCO2e': '60',
      'Calculated Emissions Display': '60 kgCO2e',
      'Source Sheet': 'Messy_Operations',
      'Source Row': '11',
      'Review Note': 'Matched to a CarbonLite system-default factor. A Canada-generic and prior-year fallback was used; consultant review is recommended before formal reporting.',
    });

    const emissionsTotal = rows.reduce(
      (sum, row) => sum + Number(row['Calculated Emissions kgCO2e'] || 0),
      0,
    );
    expect(emissionsTotal).toBe(579.4);
    expect(Number.isFinite(Number(byReference.get('MARCH-ELEC-001')?.Quantity))).toBe(true);
    expect(Number.isFinite(Number(byReference.get('MARCH-HOTEL-010')?.['Cost CAD']))).toBe(true);
  });

  it('exports legitimate calculated zero emissions as numeric zero', () => {
    const rows = buildPilotCsvRows([
      calculatedDetail({
        activityDataId: 'activity-zero-emissions',
        activityType: 'ELECTRICITY',
        activityQuantity: 0,
        activityUnit: 'kWh',
        jurisdictionRegion: 'Alberta',
        factorJurisdictionRegion: 'Alberta',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 0,
      }),
    ]);

    expect(rows[0]['Calculated Emissions kgCO2e']).toBe('0');
  });

  it('preserves Cost CAD null, undefined, explicit zero, and positive values distinctly', () => {
    const rows = buildPilotCsvRows([
      calculatedDetail({
        activityDataId: 'cost-null',
        activityType: 'ELECTRICITY',
        activityQuantity: 1,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 0.53,
        costCad: null,
      }),
      calculatedDetail({
        activityDataId: 'cost-undefined',
        activityType: 'ELECTRICITY',
        activityQuantity: 1,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 0.53,
      }),
      calculatedDetail({
        activityDataId: 'cost-zero',
        activityType: 'ELECTRICITY',
        activityQuantity: 1,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 0.53,
        costCad: 0,
      }),
      calculatedDetail({
        activityDataId: 'cost-positive',
        activityType: 'ELECTRICITY',
        activityQuantity: 1,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        calculatedEmissionsKgCO2e: 0.53,
        costCad: 214.55,
      }),
    ]);

    expect(rows.map((row) => row['Cost CAD'])).toEqual(['', '', '0', '214.55']);
  });

  it('exports ENMAX Natural Gas GJ with ECCC provenance and blank missing Cost CAD', () => {
    const rows = buildPilotCsvRows([
      calculatedDetail({
        activityDataId: 'enmax-electricity',
        activityType: 'ELECTRICITY',
        recordDate: '2025-08-01',
        activityQuantity: 358,
        activityUnit: 'kWh',
        recordYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        factorJurisdictionCountry: 'Canada',
        factorJurisdictionRegion: 'Alberta',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        factorInputUnit: 'kWh',
        calculatedEmissionsKgCO2e: 189.74,
        sourceAuthority: 'CarbonLite System Defaults',
        factorSource: 'CarbonLite System Defaults',
        factorSelectionReason: 'PILOT_DEFAULT_FALLBACK',
        costCad: null,
      }),
      calculatedDetail({
        activityDataId: 'enmax-natural-gas',
        activityType: 'NATURAL_GAS',
        recordDate: '2025-08-01',
        activityQuantity: 3,
        activityUnit: 'GJ',
        recordYear: 2025,
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        factorJurisdictionCountry: 'Canada',
        factorJurisdictionRegion: 'Canada',
        factorName: 'Natural Gas - Canada Generic',
        factorValue: 49.44,
        factorInputUnit: 'GJ',
        factorResultUnit: 'kgCO2e',
        factorYear: 2025,
        sourceYear: 2025,
        factorVersion: 'ECCC_EPR_2025_TABLE_A8',
        sourceAuthority: 'Environment and Climate Change Canada',
        factorSource: 'Environment and Climate Change Canada',
        sourceDocument: 'Greenhouse gas and air pollutant emissions projections – 2025',
        calculatedEmissionsKgCO2e: 148.32,
        factorConfidenceLevel: 'HIGH',
        factorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
        factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
        factorSelectionExplanation:
          'Natural Gas and GJ matched directly. No Alberta-specific direct GJ factor was available, so the 2025 Canada-generic factor was selected.',
        costCad: null,
      }),
      {
        ...waterDetail(),
        activityDataId: 'enmax-water',
        recordDate: '2025-08-01',
        activityQuantity: 6,
        activityUnit: 'm3',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        costCad: null,
      },
    ]);

    const byActivity = new Map(rows.map((row) => [row['Activity Type'], row]));
    const electricity = byActivity.get('Electricity');
    const naturalGas = byActivity.get('Natural Gas');
    const water = byActivity.get('Water');

    expect(electricity).toMatchObject({
      'Cost CAD': '',
      'Factor Source Authority': 'CarbonLite System Defaults',
      'Factor Selection Reason': 'PILOT_DEFAULT_FALLBACK',
      'Calculated Emissions kgCO2e': '189.74',
      'Review Note': 'Matched to a CarbonLite system-default factor. Review before formal reporting.',
    });
    expect(naturalGas).toMatchObject({
      'Cost CAD': '',
      'Matched Factor Name': 'Natural Gas - Canada Generic',
      'Matched Factor Value': '49.44',
      'Matched Factor Unit': 'kgCO2e/GJ',
      'Factor Jurisdiction': 'Canada (Generic)',
      'Factor Source Authority': 'Environment and Climate Change Canada',
      'Factor Source Year': 2025,
      'Factor Version': '',
      'Factor Selection Reason': 'GENERIC_JURISDICTION_FALLBACK',
      'Factor Selection Explanation':
        'Natural Gas and GJ matched directly. No Alberta-specific direct GJ factor was available, so the 2025 Canada-generic factor was selected.',
      'Calculated Emissions kgCO2e': '148.32',
      'Review Note': 'Canada-generic ECCC factor used because no Alberta-specific direct GJ factor was available. Review before formal reporting.',
    });
    expect(naturalGas?.['Review Note']).not.toContain('CarbonLite system-default factor');
    expect(naturalGas?.['Factor Selection Explanation']).not.toContain('Canada, Canada');
    expect(water).toMatchObject({
      'Cost CAD': '',
      'Report Treatment': 'TRACKED_ONLY',
      'Calculation Status': 'TRACKED_ONLY',
      'Matching Status': 'NOT_APPLICABLE',
      'Calculated Emissions Display': 'Tracked Metric',
      'Review Note': 'Tracked metric. Not included in the GHG emissions total.',
    });

    const total = rows.reduce((sum, row) => sum + Number(row['Calculated Emissions kgCO2e'] || 0), 0);
    expect(total).toBe(338.06);
  });

  it('uses accommodation wording for raw hotel activity and factor names', () => {
    const rows = buildPilotCsvRows([
      calculatedDetail({
        activityDataId: 'cmry-hotel-raw',
        activityType: 'HOTEL',
        activityQuantity: 10,
        activityUnit: 'nights',
        jurisdictionRegion: null,
        factorName: 'Hotel - Canada - 2025',
        factorValue: 15,
        factorInputUnit: 'nights',
        calculatedEmissionsKgCO2e: 150,
        factorDefaultScope: 'SCOPE_3',
      }),
    ]);
    const csv = buildPilotCsv([
      calculatedDetail({
        activityDataId: 'cmry-hotel-raw',
        activityType: 'HOTEL',
        activityQuantity: 10,
        activityUnit: 'nights',
        jurisdictionRegion: null,
        factorName: 'Hotel - Canada - 2025',
        factorValue: 15,
        factorInputUnit: 'nights',
        calculatedEmissionsKgCO2e: 150,
        factorDefaultScope: 'SCOPE_3',
      }),
    ]);

    expect(rows[0]['Activity Type']).toBe('Business Travel - Accommodation');
    expect(rows[0]['Matched Factor Name']).toBe(
      'Business Travel - Accommodation - Canada - 2025',
    );
    expect(csv).toContain('Business Travel - Accommodation');
    expect(csv).not.toContain('Hotel - Canada - 2025');
  });

  it('formats review statuses as canonical machine-readable values', () => {
    const reviewDetail = {
      ...calculatedDetail({
        activityDataId: 'cmry-electricity-missing-factor',
        activityType: 'ELECTRICITY',
        activityQuantity: 100,
        activityUnit: 'kWh',
        jurisdictionRegion: 'Quebec',
        factorName: 'Electricity - Quebec',
        factorValue: 0,
        calculatedEmissionsKgCO2e: 0,
      }),
      calculationStatus: 'REQUIRES_REVIEW',
      matchingStatus: 'MISSING_FACTOR',
      status: 'MISSING_FACTOR',
      calculatedEmission: null,
      calculatedEmissionsKgCO2e: null,
    } as CalculationAuditDetail;
    const rows = buildPilotCsvRows([reviewDetail]);
    const csv = buildPilotCsv([reviewDetail]);

    expect(rows[0]['Report Treatment']).toBe('EXCLUDED');
    expect(rows[0]['Calculation Status']).toBe('REQUIRES_REVIEW');
    expect(rows[0]['Matching Status']).toBe('MISSING_FACTOR');
    expect(csv).toMatch(/\b(REQUIRES_REVIEW|MISSING_FACTOR)\b/);
  });

  it('preserves golden dataset scope totals in the export rows', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const includedRows = rows.filter((row) => row['Report Treatment'] === 'INCLUDED');
    const total = includedRows.reduce((sum, row) => sum + Number(row['Calculated Emissions kgCO2e']), 0);
    const scope1 = includedRows
      .filter((row) => row.Scope === 'Scope 1')
      .reduce((sum, row) => sum + Number(row['Calculated Emissions kgCO2e']), 0);
    const scope2 = includedRows
      .filter((row) => row.Scope === 'Scope 2')
      .reduce((sum, row) => sum + Number(row['Calculated Emissions kgCO2e']), 0);
    const scope3 = includedRows
      .filter((row) => row.Scope === 'Scope 3')
      .reduce((sum, row) => sum + Number(row['Calculated Emissions kgCO2e']), 0);

    expect(scope1).toBe(3313);
    expect(scope2).toBe(33247);
    expect(scope3).toBe(725);
    expect(total).toBe(37285);
  });

  it('accepts the canonical report snapshot as the CSV export input', () => {
    const report = { calculationDetails: goldenDetails };

    expect(buildPilotCsvRows(report)).toEqual(buildPilotCsvRows(goldenDetails));
    expect(buildPilotCsv(report)).toBe(buildPilotCsv(goldenDetails));
  });
});


describe('CSV factor version semantics', () => {
  it.each(['demo-2025-kwh-alberta', 'ECCC_EPR_2025_TABLE_A8', 'cmv8vg8eu0009gd3sxfn0w9z7'])('leaves audited keys and opaque IDs blank: %s', factorVersion => {
    const rows = buildPilotCsvRows([calculatedDetail({ factorVersion, factorProvenance: { factorVersion, sourceVersion: 'v1.0', factorYear: 2025 } })]);
    expect(rows[0]['Factor Version']).toBe('');
  });
  it('keeps factor identifiers and document versions out of the Factor Version column', () => {
    const detail = calculatedDetail({ activityDataId: 'manual-version', activityType: 'ELECTRICITY', activityQuantity: 980, activityUnit: 'kWh', factorName: 'Electricity - Alberta', factorValue: .53, calculatedEmissionsKgCO2e: 519.4 });
    const rows = buildPilotCsvRows([{ ...detail, factorId: 'demo-2025-kwh-alberta', factorVersion: null, sourceDocument: 'Default Factors v1.0', factorProvenance: { sourceVersion: 'v1.0' } }]);
    expect(rows[0]['Factor Version']).toBe('');
    const versioned = buildPilotCsvRows([{ ...detail, factorVersion: '2.1', factorProvenance: { sourceVersion: '3.2' } }]);
    expect(versioned[0]['Factor Version']).toBe('2.1');
  });
});
