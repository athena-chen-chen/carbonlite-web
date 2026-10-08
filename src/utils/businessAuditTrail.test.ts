import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildEvidenceChainFromCalculationDetail,
  buildEvidenceChainSummaryRows,
  buildReviewRowUpdateAuditEvent,
} from './businessAuditTrail';

const marchElectricity: CalculationAuditDetail = {
  activityDataId: 'activity-march-elec-001',
  activityType: 'ELECTRICITY',
  recordDate: '2026-03-31',
  dateEstimated: false,
  reportingYear: 2026,
  jurisdiction: 'Canada',
  jurisdictionCountry: 'Canada',
  jurisdictionRegion: 'Alberta',
  facilityId: 'facility-calgary',
  facilityName: 'Calgary Office',
  activityQuantity: 980,
  activityUnit: 'kWh',
  factorId: 'factor-electricity-ab-2025',
  factorVersionId: 'factor-version-electricity-ab-2025-v1',
  factorVersion: 'v1.0',
  factorName: 'Electricity - Alberta',
  factorDisplayName: 'Electricity - Alberta',
  factorValue: 0.53,
  factorInputUnit: 'kWh',
  factorResultUnit: 'kgCO2e/kWh',
  factorYear: 2025,
  factorEffectiveYear: 2025,
  factorSet: 'PILOT_DEFAULT_V0_1',
  factorSource: 'CarbonLite',
  sourceAuthority: 'CarbonLite',
  sourceDocument: 'CarbonLite Pilot Factor Registry',
  factorVerified: false,
  factorConfidenceLevel: 'MEDIUM',
  factorVerificationStatus: 'INTERNAL_REVIEW',
  factorType: 'System',
  factorDefaultScope: 'SCOPE_2',
  calculatedEmission: 519.4,
  calculatedEmissionsKgCO2e: 519.4,
  calculationStatus: 'CALCULATED',
  matchingStatus: 'MATCHED',
  matchedBy: 'SYSTEM',
  matchingMethod: 'jurisdiction_unit_year',
  calculationFormula: '980 kWh x 0.53 kgCO2e/kWh = 519.40 kgCO2e',
  status: 'CALCULATED',
  sourceType: 'SPREADSHEET',
  sourceDocumentId: 'doc-carbonlite-needs-review',
  sourceFileName: 'carbonlite_needs_review_test.xlsx',
  sourceSheetName: 'Messy_Operations',
  sourceRow: 2,
  sourceReference: 'MARCH-ELEC-001',
};

describe('business audit trail evidence chains', () => {
  it('builds the complete MARCH-ELEC-001 source-to-report chain', () => {
    const chain = buildEvidenceChainFromCalculationDetail(marchElectricity, {
      report: {
        reportId: 'CL-DRAFT-2026-AB12CD3',
        reportVersion: 'Pilot Draft',
      },
      occurredAt: '2026-10-03T12:00:00.000Z',
    });

    expect(chain.sourceDocument).toMatchObject({
      id: 'doc-carbonlite-needs-review',
      fileName: 'carbonlite_needs_review_test.xlsx',
      sheetName: 'Messy_Operations',
      row: '2',
      sourceReference: 'MARCH-ELEC-001',
    });
    expect(chain.reviewedActivity).toMatchObject({
      id: 'activity-march-elec-001',
      version: 1,
      activityType: 'Electricity',
      quantity: 980,
      unit: 'kWh',
      jurisdictionRegion: 'Alberta',
      reportTreatment: 'INCLUDED',
    });
    expect(chain.factor).toMatchObject({
      id: 'factor-electricity-ab-2025',
      versionId: 'factor-version-electricity-ab-2025-v1',
      version: 'v1.0',
      name: 'Electricity - Alberta',
      value: '0.53',
      unit: 'kgCO2e/kWh',
      sourceYear: '2025',
    });
    expect(chain.calculation).toMatchObject({
      id: 'calc:activity-march-elec-001:v1',
      version: 1,
      resultKgCO2e: 519.4,
    });
    expect(chain.scope.value).toBe('Scope 2');
    expect(chain.finalResult).toMatchObject({
      reportId: 'CL-DRAFT-2026-AB12CD3',
      reportVersion: 'Pilot Draft',
      treatment: 'INCLUDED',
      resultKgCO2e: 519.4,
    });
    expect(chain.warnings).toEqual([]);
  });

  it('captures the MARCH-ELEC-002 reviewer province correction as a v1 to v2 diff', () => {
    const event = buildReviewRowUpdateAuditEvent({
      organizationId: 'org-1',
      actorUserId: 'user-1',
      actorDisplayName: 'Pilot Reviewer',
      occurredAt: '2026-10-03T12:00:00.000Z',
      previousVersion: 1,
      newVersion: 2,
      before: {
        id: 'review-row-march-elec-002',
        sourceDocumentId: 'doc-carbonlite-needs-review',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceRow: 3,
        sourceReference: 'MARCH-ELEC-002',
        activityType: 'ELECTRICITY',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: null,
        status: 'NEEDS_REVIEW',
        calculationStatus: 'MISSING_PROVINCE',
      },
      after: {
        id: 'review-row-march-elec-002',
        sourceDocumentId: 'doc-carbonlite-needs-review',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceRow: 3,
        sourceReference: 'MARCH-ELEC-002',
        activityType: 'ELECTRICITY',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        status: 'READY',
        calculationStatus: 'CALCULATED',
      },
    });

    expect(event.eventType).toBe('REVIEW_STATUS_CHANGED');
    expect(event.previousVersion).toBe(1);
    expect(event.newVersion).toBe(2);
    expect(event.changedFields).toEqual(
      expect.arrayContaining([
        {
          field: 'jurisdictionRegion',
          label: 'Province / Region',
          before: null,
          after: 'Alberta',
        },
        {
          field: 'status',
          label: 'Review Status',
          before: 'NEEDS_REVIEW',
          after: 'READY',
        },
      ]),
    );
  });

  it('keeps MARCH-WATER-007 as tracked-only with no fake zero calculation', () => {
    const chain = buildEvidenceChainFromCalculationDetail({
      ...marchElectricity,
      activityDataId: 'activity-march-water-007',
      activityType: 'WATER',
      activityQuantity: 25,
      activityUnit: 'm3',
      factorId: null,
      factorVersionId: null,
      factorName: null,
      factorValue: null,
      factorInputUnit: null,
      factorResultUnit: null,
      calculatedEmission: 0,
      calculatedEmissionsKgCO2e: 0,
      calculationStatus: 'TRACKED_ONLY',
      matchingStatus: 'TRACKED_ONLY',
      status: 'TRACKED_ONLY',
      sourceRow: 7,
      sourceReference: 'MARCH-WATER-007',
    });

    expect(chain.reviewedActivity.reportTreatment).toBe('TRACKED_ONLY');
    expect(chain.factor.id).toBeNull();
    expect(chain.calculation.id).toBeNull();
    expect(chain.calculation.resultKgCO2e).toBeNull();
    expect(chain.finalResult.resultKgCO2e).toBeNull();
    expect(chain.finalResult.operationalMetric).toContain('25');
  });

  it('keeps MARCH-DIESEL-006 unit mismatch out of calculations and conversions', () => {
    const chain = buildEvidenceChainFromCalculationDetail({
      ...marchElectricity,
      activityDataId: 'activity-march-diesel-006',
      activityType: 'DIESEL',
      activityQuantity: 42,
      activityUnit: 'kg',
      factorId: 'factor-diesel-liters',
      factorName: 'Diesel - Combustion',
      factorValue: 2.68,
      factorInputUnit: 'L',
      factorResultUnit: 'kgCO2e/L',
      factorDefaultScope: 'SCOPE_1',
      calculatedEmission: null,
      calculatedEmissionsKgCO2e: null,
      calculationStatus: 'INVALID_UNIT',
      matchingStatus: 'UNIT_MISMATCH',
      status: 'INVALID_UNIT',
      sourceRow: 6,
      sourceReference: 'MARCH-DIESEL-006',
    });

    expect(chain.conversion.status).toBe('NOT_APPLIED');
    expect(chain.calculation.id).toBeNull();
    expect(chain.calculation.resultKgCO2e).toBeNull();
    expect(chain.finalResult.treatment).toBe('EXCLUDED');
    expect(chain.warnings).toContain('Invalid unit');
  });

  it('formats compact evidence rows for the UI panel', () => {
    const rows = buildEvidenceChainSummaryRows([
      buildEvidenceChainFromCalculationDetail(marchElectricity, {
        report: { reportId: 'CL-DRAFT-2026-AB12CD3', reportVersion: 'Pilot Draft' },
      }),
    ]);

    expect(rows[0]).toMatchObject({
      source: 'carbonlite_needs_review_test.xlsx / Messy_Operations / row 2 / MARCH-ELEC-001',
      activity: 'Electricity 980 kWh',
      calculation: '519.40 kgCO2e',
      scope: 'Scope 2',
      report: 'CL-DRAFT-2026-AB12CD3 / Pilot Draft',
    });
  });
});
