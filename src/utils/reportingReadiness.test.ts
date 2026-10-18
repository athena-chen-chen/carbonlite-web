import { getWorkflowStage } from '../constants/carbonliteWorkflow';
import { buildInventoryBoundary } from '../constants/inventoryBoundary';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildReportingReadinessAssessment,
  formatReadinessStatus,
} from './reportingReadiness';

function detail(overrides: Partial<CalculationAuditDetail> = {}): CalculationAuditDetail {
  return {
    activityDataId: `record-${Math.random()}`,
    activityType: 'ELECTRICITY',
    recordDate: '2026-03-31',
    dateEstimated: false,
    reportingYear: 2026,
    jurisdiction: 'Alberta, Canada',
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'Alberta',
    activityQuantity: 980,
    activityUnit: 'kWh',
    factorId: 'factor-electricity-ab',
    factorVersion: 'v1.0',
    factorName: 'Electricity - Alberta',
    factorValue: 0.53,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e/kWh',
    sourceAuthority: 'CarbonLite',
    sourceDocument: 'CarbonLite MVP Default Factors v1.0',
    sourceYear: 2025,
    factorVerified: false,
    factorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
    factorConfidenceLevel: 'PILOT_ESTIMATE',
    calculatedEmission: 519.4,
    calculatedEmissionsKgCO2e: 519.4,
    calculationStatus: 'CALCULATED',
    matchingStatus: 'MATCHED',
    status: 'CALCULATED',
    sourceType: 'CSV',
    sourceReference: 'MARCH-ELEC-001',
    sourceFileName: 'carbonlite_needs_review_test.xlsx',
    ...overrides,
  };
}

function itemStatus(assessment: ReturnType<typeof buildReportingReadinessAssessment>, code: string) {
  return assessment.items.find((item) => item.code === code)?.status;
}

describe('buildReportingReadinessAssessment', () => {
  it('keeps required data and calculations complete when only optional cost is missing', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [
        detail({ costCad: undefined }),
        detail({
          activityDataId: 'hotel-1',
          activityType: 'HOTEL',
          activityUnit: 'nights',
          activityQuantity: 4,
          factorId: 'factor-hotel',
          factorName: 'Business Travel - Accommodation',
          factorValue: 15,
          sourceReference: 'MARCH-HOTEL-010',
          calculatedEmission: 60,
          calculatedEmissionsKgCO2e: 60,
          costCad: undefined,
        }),
      ],
      inventoryBoundary: buildInventoryBoundary('Test Org', '2026', {
        geographicBoundary: 'Canada',
        includedFacilitiesOrLocations: 'All pilot facilities',
        includedScopes: 'Scope 1, Scope 2, selected Scope 3',
        exclusionsLimitations: 'None',
        boundaryStatus: 'REVIEWED',
        boundaryReviewedBy: 'Pilot Reviewer',
        boundaryReviewedAt: '2026-05-28T12:00:00.000Z',
        boundaryVersion: 1,
      }),
    });

    for (const item of assessment.items) {
      const stage = getWorkflowStage(item.workflowStageId);
      expect(item.workflowStageLabel).toBe(`Stage ${stage.step}: ${stage.title}`);
    }
    expect(itemStatus(assessment, 'REQUIRED_DATA_COMPLETE')).toBe('COMPLETE');
    expect(itemStatus(assessment, 'CALCULATIONS_COMPLETE')).toBe('COMPLETE');
    expect(assessment.items.map((item) => item.evidence).join(' ')).not.toMatch(/95%|weighted/i);
  });

  it('does not treat tracked-only water as a failed calculation', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [
        detail(),
        detail({
          activityDataId: 'water-1',
          activityType: 'WATER',
          activityQuantity: 12,
          activityUnit: 'm3',
          factorId: null,
          factorName: null,
          factorValue: null,
          factorVerified: false,
          calculatedEmission: null,
          calculatedEmissionsKgCO2e: null,
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          status: 'TRACKED_ONLY',
        }),
      ],
    });

    expect(itemStatus(assessment, 'REQUIRED_DATA_COMPLETE')).toBe('COMPLETE');
    expect(itemStatus(assessment, 'CALCULATIONS_COMPLETE')).toBe('COMPLETE');
  });

  it('separates selected factors from reviewed factors', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [detail()],
    });

    expect(itemStatus(assessment, 'FACTORS_SELECTED')).toBe('COMPLETE');
    expect(itemStatus(assessment, 'FACTORS_REVIEWED')).toBe('NEEDS_ATTENTION');
  });

  it('marks manual-only source review as not applicable', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [detail({ sourceType: 'MANUAL', sourceFileName: null })],
      sourceReviewSummary: {
        available: false,
        availability: 'NO_SOURCE_REVIEW',
        sourceType: 'MANUAL',
        status: 'NOT_APPLICABLE',
        evidence: 'No source document is associated with this report scope.',
        limitation: 'Source-document review is not applicable to manually entered records.',
        totalRows: 0,
        resolvedCount: 0,
        needsReviewCount: 0,
      },
    });

    expect(itemStatus(assessment, 'SOURCE_REVIEW_COMPLETE')).toBe('NOT_APPLICABLE');
    expect(itemStatus(assessment, 'SOURCE_ISSUES_RESOLVED')).toBe('NOT_APPLICABLE');
  });

  it('treats document source lineage as limited instead of not applicable', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [detail({
        sourceType: 'PDF',
        sourceDocumentId: 'doc-august',
        sourceFileName: '2025_August_01.pdf',
      })],
      sourceReviewSummary: {
        available: false,
        availability: 'DOCUMENT_LINEAGE_AVAILABLE',
        sourceType: 'DOCUMENT',
        status: 'LIMITED',
        evidence: 'Source document lineage is available for 2 imported records.',
        limitation: 'Structured unresolved-source-row counts are not available for this document import.',
        sourceDocumentCount: 1,
        importedCount: 2,
        totalRows: 0,
        resolvedCount: 2,
        needsReviewCount: 0,
      },
    });

    expect(itemStatus(assessment, 'SOURCE_REVIEW_COMPLETE')).toBe('LIMITED');
    expect(itemStatus(assessment, 'SOURCE_ISSUES_RESOLVED')).toBe('LIMITED');
    expect(assessment.items.map((item) => item.evidence).join(' ')).toContain(
      'Source document lineage is available for 2 imported records.',
    );
    expect(assessment.items.map((item) => item.evidence).join(' ')).toContain(
      'Structured unresolved-source-row counts are not available for this document import.',
    );
  });

  it('keeps spreadsheet unresolved review rows as needs attention with exact counts', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [detail()],
      sourceReviewSummary: {
        available: true,
        availability: 'STRUCTURED_REVIEW_AVAILABLE',
        sourceType: 'SPREADSHEET',
        status: 'NEEDS_ATTENTION',
        totalRows: 9,
        readyCount: 2,
        trackedOnlyCount: 1,
        resolvedCount: 3,
        needsReviewCount: 6,
      },
    });

    expect(itemStatus(assessment, 'SOURCE_REVIEW_COMPLETE')).toBe('COMPLETE');
    expect(itemStatus(assessment, 'SOURCE_ISSUES_RESOLVED')).toBe('NEEDS_ATTENTION');
    expect(assessment.items.map((item) => item.evidence).join(' ')).toContain(
      '3 of 9 source rows are resolved/imported; 6 still require review.',
    );
  });

  it('uses requested singular grammar for factor and traceability review text', () => {
    const assessment = buildReportingReadinessAssessment({
      calculationDetails: [detail()],
    });

    expect(assessment.items.find((item) => item.code === 'FACTORS_SELECTED')?.evidence)
      .toBe('1 of 1 eligible emissions record has a matched emission factor.');
    expect(assessment.items.find((item) => item.code === 'FACTORS_REVIEWED')?.evidence)
      .toBe('1 calculated record uses an emission factor; 1 record-level factor usage requires review before formal use.');
    expect(assessment.items.find((item) => item.code === 'FACTORS_REVIEWED')?.action)
      .toBe('Review all factors and replace pilot-stage factors where appropriate.');
    expect(assessment.items.find((item) => item.code === 'TRACEABILITY_COMPLETE')?.evidence)
      .toBe('Required source, factor, and result lineage is present for the calculated emissions record.');
  });

  it('formats statuses without numeric readiness scores', () => {
    expect(formatReadinessStatus('LIMITED')).toBe('Limited');
    expect(formatReadinessStatus('NEEDS_ATTENTION')).toBe('Needs attention');
    expect(formatReadinessStatus('READY')).toBe('Ready for Report Review');
  });
});
