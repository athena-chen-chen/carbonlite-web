import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildReviewPackageCalculationTraceabilityCsv,
  buildReviewPackageDataRecordsCsv,
  buildReviewPackageFactorSourceSummaryCsv,
  buildReviewPackageRecordsRequiringReviewCsv,
  buildReviewPackageSiteFacilityBreakdownCsv,
  getReviewPackageCsvFileName,
} from './reportReviewPackageCsvExport';
import { buildSiteFacilityBreakdown } from './siteFacilityBreakdown';

const baseDetail: CalculationAuditDetail = {
  activityDataId: 'activity-internal-id',
  activityType: 'HOTEL',
  recordDate: '2026-04-10',
  dateEstimated: false,
  reportingYear: 2026,
  jurisdiction: 'Canada',
  jurisdictionCountry: 'Canada',
  jurisdictionRegion: 'Alberta',
  facilityId: 'facility-internal-id',
  facilityName: 'Calgary Office',
  activityQuantity: 10,
  activityUnit: 'nights',
  factorId: 'factor-internal-id',
  factorName: 'Hotel - Canada - 2025',
  factorDisplayName: 'Hotel - Canada - 2025',
  factorValue: 15,
  factorInputUnit: 'night',
  factorResultUnit: 'kgCO2e/night',
  factorYear: 2025,
  factorSource: 'CarbonLite',
  sourceAuthority: 'CarbonLite',
  sourceDocument: 'Pilot factor set',
  factorVerified: false,
  factorConfidenceLevel: 'LOW',
  factorVerificationStatus: 'INTERNAL_REVIEW',
  factorType: 'System',
  factorDefaultScope: 'SCOPE_3',
  calculatedEmission: 150,
  calculatedEmissionsKgCO2e: 150,
  calculationStatus: 'CALCULATED',
  matchingStatus: 'MATCHED',
  status: 'CALCULATED',
  sourceType: 'SPREADSHEET',
  sourceReference: 'Travel tab',
  sourceFileName: 'pilot.xlsx',
  notes: 'Accommodation estimate',
};

describe('report review package CSV exports', () => {
  it('exports data records with user-facing labels and no internal ids', () => {
    const csv = buildReviewPackageDataRecordsCsv([
      baseDetail,
      {
        ...baseDetail,
        activityDataId: 'water-internal-id',
        activityType: 'WATER',
        activityQuantity: 100,
        activityUnit: 'm3',
        facilityId: null,
        facilityName: null,
        factorId: null,
        factorName: null,
        factorValue: null,
        calculatedEmission: 0,
        calculatedEmissionsKgCO2e: 0,
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        status: 'TRACKED_ONLY',
      },
    ]);

    expect(csv).toContain('Record Date,Activity Type,Quantity,Unit,Country,Province,Site / Facility');
    expect(csv).toContain('Business Travel - Accommodation');
    expect(csv).toContain('Calgary Office');
    expect(csv).toContain('Unassigned');
    expect(csv).toContain('Tracked Only');
    expect(csv).not.toContain('activity-internal-id');
    expect(csv).not.toContain('facility-internal-id');
    expect(csv).not.toContain('factor-internal-id');
  });

  it('exports site/facility breakdown sorted by site totals with review counts', () => {
    const details: CalculationAuditDetail[] = [
      baseDetail,
      {
        ...baseDetail,
        activityDataId: 'diesel-red-deer',
        activityType: 'DIESEL',
        facilityName: 'Red Deer Yard',
        activityQuantity: 100,
        activityUnit: 'L',
        factorValue: 2.68,
        calculatedEmission: 268,
        calculatedEmissionsKgCO2e: 268,
        factorDefaultScope: 'SCOPE_1',
      },
      {
        ...baseDetail,
        activityDataId: 'water-red-deer',
        activityType: 'WATER',
        facilityName: 'Red Deer Yard',
        activityQuantity: 50,
        activityUnit: 'm3',
        calculatedEmission: 0,
        calculatedEmissionsKgCO2e: 0,
        status: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
      },
      {
        ...baseDetail,
        activityDataId: 'missing-factor-red-deer',
        activityType: 'SHIPPING',
        facilityName: 'Red Deer Yard',
        calculatedEmission: null,
        calculatedEmissionsKgCO2e: null,
        status: 'MISSING_FACTOR',
        calculationStatus: 'MISSING_FACTOR',
        matchingStatus: 'MISSING_FACTOR',
        matchingMessage: 'No matching conversion factor is available.',
      },
    ];
    const rows = buildSiteFacilityBreakdown(details);
    const csv = buildReviewPackageSiteFacilityBreakdownCsv(rows, details);
    const redDeerRow = csv.split('\n').find((row) => row.includes('Red Deer Yard')) ?? '';

    expect(csv).toContain('Site / Facility,Scope 1 kgCO2e,Scope 2 kgCO2e,Scope 3 kgCO2e,Total kgCO2e');
    expect(redDeerRow).toContain('268');
    expect(redDeerRow.endsWith(',1,1')).toBe(true);
  });

  it('exports factor source summary without factor ids', () => {
    const csv = buildReviewPackageFactorSourceSummaryCsv([
      {
        factorId: 'factor-internal-id',
        activityType: 'HOTEL',
        factorName: 'Hotel - Canada - 2025',
        factorValue: 15,
        inputUnit: 'night',
        resultUnit: 'kgCO2e/night',
        jurisdiction: 'Canada',
        factorYear: 2025,
        sourceAuthority: 'CarbonLite',
        sourceDocument: 'Pilot factor set',
        factorSet: 'PILOT_DEFAULT_V0_1',
        effectiveYear: 2025,
        factorStatus: 'REVIEW_RECOMMENDED',
        confidence: 'LOW',
        boundary: 'Selected Scope 3 business travel accommodation nights.',
        notes: 'Review before formal reporting.',
        confidenceLevel: 'LOW',
        verificationStatus: 'INTERNAL_REVIEW',
        assumptions: 'Pilot accommodation estimate.',
      },
    ]);

    expect(csv).toContain('Activity Type,Factor Name,Jurisdiction,Scope,Factor Value,Factor Unit,Factor Set');
    expect(csv).toContain('Business Travel - Accommodation');
    expect(csv).toContain('15');
    expect(csv).toContain('PILOT_DEFAULT_V0_1');
    expect(csv).toContain('Selected Scope 3 business travel accommodation nights.');
    expect(csv).toContain('Pilot factor set');
    expect(csv).not.toContain('factor-internal-id');
  });

  it('exports calculation traceability and records requiring review', () => {
    const reviewDetail: CalculationAuditDetail = {
      ...baseDetail,
      activityDataId: 'missing-province-id',
      activityType: 'ELECTRICITY',
      jurisdictionRegion: '',
      activityQuantity: 100,
      activityUnit: 'kWh',
      calculatedEmission: null,
      calculatedEmissionsKgCO2e: null,
      status: 'MISSING_JURISDICTION',
      calculationStatus: 'MISSING_PROVINCE',
      matchingStatus: 'MISSING_PROVINCE',
      matchingMessage: 'Electricity records require province before factor matching.',
    };

    const traceabilityCsv = buildReviewPackageCalculationTraceabilityCsv([baseDetail, reviewDetail]);
    expect(traceabilityCsv).toContain('Formula');
    expect(traceabilityCsv).toContain('Factor Source');
    expect(traceabilityCsv).toContain('10 nights');
    expect(traceabilityCsv).toContain('150');
    expect(traceabilityCsv).toContain('Missing Province');

    const reviewCsv = buildReviewPackageRecordsRequiringReviewCsv([baseDetail, reviewDetail]);
    expect(reviewCsv).toContain('Issue Type,Status,Reason,Suggested Fix');
    expect(reviewCsv).toContain('Missing Province');
    expect(reviewCsv).toContain('Select a province for electricity records.');
    expect(reviewCsv).not.toContain('Business Travel - Accommodation');
    expect(reviewCsv).not.toContain('missing-province-id');
  });

  it('builds review package filenames', () => {
    expect(
      getReviewPackageCsvFileName('calculation-traceability', new Date('2026-09-16T12:00:00Z')),
    ).toBe('carbonlite-calculation-traceability-2026-09-16.csv');
  });
});
