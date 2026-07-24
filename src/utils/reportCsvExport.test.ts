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
    reportingYear: 2026,
    recordYear: 2026,
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
    factorVerificationStatus: input.factorVerificationStatus ?? 'INTERNAL_REVIEW_REQUIRED',
    factorType: input.factorType ?? 'System',
    factorDefaultScope: input.factorDefaultScope ?? null,
    calculatedEmission: input.calculatedEmissionsKgCO2e,
    calculatedEmissionsKgCO2e: input.calculatedEmissionsKgCO2e,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    status: 'CALCULATED',
    sourceType: input.sourceType ?? 'AI_EXTRACTION',
    sourceFileName: input.sourceFileName ?? 'Golden Test Data.xlsx',
    sourceReference: input.sourceReference ?? 'PDF extraction',
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
  };
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
    factorName: 'Hotel - Canada',
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
    expect(rows[7]['Calculation Formula']).toBe('5000 x 0.115 = 575 kgCO2e');
  });

  it('uses professional factor labels, source labels, and review notes', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const naturalGas = rows.find((row) => row['Activity Type'] === 'Natural Gas');
    const gasoline = rows.find((row) => row['Activity Type'] === 'Gasoline');
    const hotel = rows.find((row) => row['Activity Type'] === 'Hotel');
    const airTravel = rows.find((row) => row['Activity Type'] === 'Air Travel');
    const water = rows.find((row) => row['Activity Type'] === 'Water');

    expect(naturalGas?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(gasoline?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(airTravel?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(hotel?.['Factor Jurisdiction']).toBe('Canada (Generic)');
    expect(gasoline?.['Matched Factor Unit']).toBe('kgCO2e/liter');
    expect(hotel?.['Matched Factor Unit']).toBe('kgCO2e/night');

    expect(rows[0]['Review Note']).toContain('Using latest available prior-year factor');
    expect(airTravel?.['Consultant Review Recommended']).toBe('Yes');
    expect(airTravel?.['Review Note']).toContain('Consultant review recommended before formal reporting');

    expect(water?.Scope).toBe('Tracked Metric');
    expect(water?.['Report Treatment']).toBe('Tracked Only');
    expect(water?.['Matched Factor Name']).toBe('No emissions factor applied');
    expect(water?.['Calculated Emissions kgCO2e']).toBe(0);
    expect(water?.['Review Note']).toBe('Tracked only. Not included in emissions total.');

    rows.forEach((row) => {
      expect(row['Source File']).toBe('Golden Test Data.xlsx');
      expect(row['Source Type']).toBe('AI-assisted Spreadsheet Import');
      expect(row['Source Reference']).toBe('AI-assisted import');
    });
  });

  it('preserves golden dataset scope totals in the export rows', () => {
    const rows = buildPilotCsvRows(goldenDetails);
    const includedRows = rows.filter((row) => row['Report Treatment'] === 'Included');
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
});
