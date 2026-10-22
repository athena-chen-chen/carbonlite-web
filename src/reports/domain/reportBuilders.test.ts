import { describe, expect, it } from 'vitest';
import type { FormalConversionFactorUsed } from '../../components/FormalReportPreview';
import { buildInventoryBoundary } from '../../constants/inventoryBoundary';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import { EMPTY_ACTIVITY_USAGE_TOTALS } from '../../services/metricsOverview';
import { buildCalculationQuality } from './buildCalculationQuality';
import { buildFacilityBreakdown } from './buildFacilityBreakdown';
import { buildFactorReviewSummary } from './buildFactorReviewSummary';
import { buildHotspotSummary } from './buildHotspotSummary';
import { buildInventorySummary } from './buildInventorySummary';
import { buildReadinessAssessment } from './buildReadinessAssessment';
import { buildReportLimitations } from './buildReportLimitations';
import { buildReportMetadata } from './buildReportMetadata';
import { buildReportTotals } from './buildReportTotals';
import { buildScopeBreakdown } from './buildScopeBreakdown';
import { buildSourceReviewSummary } from './buildSourceReviewSummary';
import type { BuildCanonicalReportDataInput } from './reportTypes';

function detail(input: Partial<CalculationAuditDetail> = {}): CalculationAuditDetail {
  const emissions = input.calculatedEmissionsKgCO2e ?? input.calculatedEmission ?? null;

  return {
    activityDataId: input.activityDataId ?? 'activity-1',
    activityType: input.activityType ?? 'ELECTRICITY',
    recordDate: input.recordDate ?? '2026-01-31',
    dateEstimated: input.dateEstimated ?? false,
    reportingYear: input.reportingYear ?? 2026,
    jurisdiction: input.jurisdiction ?? 'Canada',
    jurisdictionCountry: input.jurisdictionCountry ?? 'Canada',
    jurisdictionRegion: input.jurisdictionRegion ?? null,
    facilityName: input.facilityName ?? null,
    activityQuantity: input.activityQuantity ?? 1,
    activityUnit: input.activityUnit ?? 'kWh',
    factorName: input.factorName ?? 'Test Factor',
    factorValue: input.factorValue ?? 1,
    factorInputUnit: input.factorInputUnit ?? input.activityUnit ?? 'kWh',
    factorResultUnit: input.factorResultUnit ?? 'kgCO2e',
    factorSource: input.factorSource ?? 'Test Authority',
    sourceAuthority: input.sourceAuthority ?? input.factorSource ?? 'Test Authority',
    sourceDocument: input.sourceDocument ?? 'Test source',
    sourceYear: input.sourceYear ?? 2025,
    factorVerified: input.factorVerified ?? true,
    factorSelectionReason: input.factorSelectionReason ?? null,
    factorSelectionExplanation: input.factorSelectionExplanation ?? null,
    calculatedEmission: emissions,
    calculatedEmissionsKgCO2e: emissions,
    status: input.status ?? 'CALCULATED',
    calculationStatus: input.calculationStatus ?? input.status ?? 'CALCULATED',
    matchingStatus: input.matchingStatus ?? 'MATCHED',
    sourceType: input.sourceType ?? 'MANUAL',
    sourceReference: input.sourceReference ?? null,
    sourceFileName: input.sourceFileName ?? null,
    sourceSheetName: input.sourceSheetName ?? null,
    sourceRow: input.sourceRow ?? null,
    sourceDocumentId: input.sourceDocumentId ?? null,
    costCad: input.costCad ?? null,
    costCurrency: input.costCurrency ?? null,
    scopeOverride: input.scopeOverride ?? null,
    factorDefaultScope: input.factorDefaultScope ?? null,
    factorScope: input.factorScope ?? null,
  };
}

function reviewRow(input: Partial<SpreadsheetReviewRowItem> = {}): SpreadsheetReviewRowItem {
  return {
    id: input.id ?? `review-${input.sourceRow ?? 1}`,
    status: input.status ?? 'READY',
    sourceDocumentId: input.sourceDocumentId ?? 'doc-review',
    sourceFileName: input.sourceFileName ?? 'review.xlsx',
    sourceSheetName: input.sourceSheetName ?? 'Sheet1',
    sourceRow: input.sourceRow ?? 2,
    sourceReference: input.sourceReference ?? `ROW-${input.sourceRow ?? 2}`,
    activityType: input.activityType ?? 'ELECTRICITY',
    issues: input.issues ?? [],
    notes: input.notes,
    rawRecordDate: input.rawRecordDate,
    rawActivityType: input.rawActivityType,
  };
}

function reportInput(overrides: Partial<BuildCanonicalReportDataInput> = {}): BuildCanonicalReportDataInput {
  const calculationDetails = overrides.calculationDetails ?? [];

  return {
    activities: overrides.activities ?? calculationDetails.map((item) => ({
      id: item.activityDataId,
      activityType: item.activityType,
      recordDate: item.recordDate,
      quantity: item.activityQuantity,
      unit: item.activityUnit,
      jurisdiction: item.jurisdiction,
      jurisdictionRegion: item.jurisdictionRegion,
    })),
    reviewRows: overrides.reviewRows ?? [],
    calculationDetails,
    matchedActivityEmissions: overrides.matchedActivityEmissions ?? [],
    conversionFactorsUsed: overrides.conversionFactorsUsed ?? [],
    usageTotals: overrides.usageTotals ?? EMPTY_ACTIVITY_USAGE_TOTALS,
    countSummary: overrides.countSummary ?? {
      totalRecordsFound: calculationDetails.length,
      recordsInScope: calculationDetails.length,
      processedRecords: calculationDetails.filter((item) => item.status === 'CALCULATED').length,
      skippedRecords: calculationDetails.filter((item) => item.status !== 'CALCULATED').length,
      missingFactorRecords: 0,
      skippedReasons: {
        missingFactor: 0,
        outsideDateRange: 0,
        outsideScope: 0,
        invalidData: 0,
      },
    },
    totalEstimatedEmissionsKgCO2e: overrides.totalEstimatedEmissionsKgCO2e ?? 0,
    inventoryBoundary: overrides.inventoryBoundary ?? buildInventoryBoundary(
      'Golden Org',
      '2026',
      { boundaryStatus: 'REVIEWED' },
    ),
    reportingPeriod: overrides.reportingPeriod ?? {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      label: '2026',
    },
    organization: overrides.organization ?? {
      name: 'Golden Org',
      id: 'org-golden',
      generatedBy: 'reviewer@example.com',
    },
    reportScope: overrides.reportScope ?? 'dateRange',
    reportScopeLabel: overrides.reportScopeLabel ?? 'Date range',
    selectedRecordIds: overrides.selectedRecordIds ?? [],
    selectedDocumentIds: overrides.selectedDocumentIds ?? [],
    outputGeneratedDate: overrides.outputGeneratedDate ?? '2026-10-14',
    regulatoryThresholdReferences: overrides.regulatoryThresholdReferences,
  };
}

function factor(input: Partial<FormalConversionFactorUsed> = {}): FormalConversionFactorUsed {
  return {
    factorName: input.factorName ?? 'ECCC electricity factor',
    factorValue: input.factorValue ?? 1,
    inputUnit: input.inputUnit ?? 'kWh',
    resultUnit: input.resultUnit ?? 'kgCO2e',
    sourceAuthority: input.sourceAuthority ?? 'ECCC',
    factorType: input.factorType ?? 'System',
    verified: input.verified ?? true,
    factorId: input.factorId,
    sourceDocument: input.sourceDocument,
  };
}

describe('report domain builders', () => {
  it('builds inventory counts from report totals and credibility flags', () => {
    const details = [
      detail({ status: 'CALCULATED', calculatedEmissionsKgCO2e: 12 }),
      detail({
        activityDataId: 'tracked',
        activityType: 'WATER',
        status: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
      }),
      detail({
        activityDataId: 'missing',
        status: 'MISSING_FACTOR',
        calculationStatus: 'MISSING_FACTOR',
      }),
    ];

    expect(buildInventorySummary({
      reportCountSummary: {
        totalRecordsFound: 3,
        recordsInScope: 3,
        processedRecords: 1,
        skippedRecords: 2,
        missingFactorRecords: 1,
        skippedReasons: {
          missingFactor: 1,
          outsideDateRange: 0,
          outsideScope: 0,
          invalidData: 0,
        },
      },
      calculationDetails: details,
      totalEstimatedEmissionsKgCO2e: 12,
    })).toMatchObject({
      importedRecordCount: 3,
      includedRecordCount: 1,
      trackedMetricCount: 1,
      importedNeedsReviewCount: 1,
      totalKgCO2e: 12,
    });
  });

  it.each([
    [null, 0],
    [undefined, 0],
    [0, 1],
    [12.34, 1],
  ])('counts canonical optional cost %p as present=%p', (costCad, expected) => {
    const quality = buildCalculationQuality([{ ...detail({}), costCad }]);
    expect(quality.dataReadinessSummary.optionalDataCompleteness).toMatchObject({
      costDataCount: expected, totalRecords: 1, score: expected * 100,
    });
  });

  it('builds calculation quality without changing cost or tracked metric semantics', () => {
    const quality = buildCalculationQuality([
      detail({ costCad: 0, calculatedEmissionsKgCO2e: 10 }),
      detail({
        activityDataId: 'tracked',
        activityType: 'WATER',
        status: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
      }),
    ]);

    expect(quality.calculationCoverage).toBe('100%');
    expect(quality.coverageCounts.eligibleEmissionBearingRecords).toBe(1);
    expect(quality.dataReadinessSummary.optionalDataCompleteness.costDataCount).toBe(1);
  });

  it('summarizes source review rows, document lineage, and source-review limitations', () => {
    const structured = buildSourceReviewSummary({
      rows: [
        reviewRow({ status: 'READY', sourceRow: 2 }),
        reviewRow({ status: 'NEEDS_REVIEW', sourceRow: 3 }),
        reviewRow({ sourceReference: 'Grand Total', status: 'NEEDS_REVIEW', sourceRow: 4 }),
      ],
      calculationDetails: [],
    });
    const document = buildSourceReviewSummary({
      rows: [],
      calculationDetails: [
        detail({
          sourceType: 'DOCUMENT_AI',
          sourceFileName: 'bill.pdf',
          sourceDocumentId: 'doc-bill',
        }),
      ],
    });

    expect(structured).toMatchObject({
      availability: 'STRUCTURED_REVIEW_AVAILABLE',
      totalRows: 2,
      resolvedCount: 1,
      needsReviewCount: 1,
      resolutionPercent: 50,
    });
    expect(document).toMatchObject({
      availability: 'DOCUMENT_LINEAGE_AVAILABLE',
      resolvedCount: 1,
    });
    expect(buildReportLimitations({ sourceReviewSummary: document })).toEqual({
      sourceReviewLimitation: 'Structured unresolved-source-row counts are not available for this document import.',
    });
  });

  it('builds scope, facility, and hotspot summaries from calculated emissions only', () => {
    const details = [
      detail({
        activityDataId: 'gas',
        activityType: 'NATURAL_GAS',
        calculatedEmissionsKgCO2e: 89.64,
        facilityName: '',
      }),
      detail({
        activityDataId: 'power',
        activityType: 'ELECTRICITY',
        calculatedEmissionsKgCO2e: 10.36,
        facilityName: 'HQ',
      }),
      detail({
        activityDataId: 'missing',
        activityType: 'DIESEL',
        status: 'MISSING_FACTOR',
        calculationStatus: 'MISSING_FACTOR',
      }),
    ];

    const scope = buildScopeBreakdown(details);
    const facility = buildFacilityBreakdown(details);
    const hotspots = buildHotspotSummary(details);

    expect(scope.totals).toMatchObject({
      'Scope 1': 89.64,
      'Scope 2': 10.36,
    });
    expect(facility.rows.map((row) => row.siteFacility)).toEqual(['Unassigned', 'HQ']);
    expect(hotspots.categoryHotspots.map((row) => row.percentageOfTotal)).toEqual([89.64, 10.36]);
    expect(hotspots.excludedRecordCount).toBe(1);
  });

  it('builds factor validation and readiness summaries without mutating factor lineage', () => {
    const factors = [
      factor({ factorId: 'eccc-2026', verified: true, sourceAuthority: 'ECCC' }),
      factor({ factorId: 'custom-unverified', verified: false, sourceAuthority: 'Customer' }),
    ];
    const sourceReviewSummary = buildSourceReviewSummary({
      rows: [reviewRow({ status: 'READY' })],
      calculationDetails: [detail({ calculatedEmissionsKgCO2e: 1 })],
    });
    const readiness = buildReadinessAssessment({
      calculationDetails: [detail({ calculatedEmissionsKgCO2e: 1 })],
      inventoryBoundary: buildInventoryBoundary('Golden Org', '2026', { boundaryStatus: 'REVIEWED' }),
      sourceReviewSummary,
    });

    expect(buildFactorReviewSummary(factors)).toMatchObject({
      factorsUsedCount: 2,
      factorsRequiringReviewCount: 1,
      factors,
    });
    expect(readiness.items.map((item) => item.code)).toContain('SOURCE_REVIEW_COMPLETE');
  });

  it('builds report totals and deterministic metadata from canonical input', () => {
    const input = reportInput({
      calculationDetails: [
        detail({
          activityDataId: 'alberta-record',
          jurisdictionRegion: 'AB',
          calculatedEmissionsKgCO2e: 5,
        }),
      ],
      matchedActivityEmissions: [{
        activityDataId: 'alberta-record',
        activityType: 'ELECTRICITY',
        quantity: 1,
        unit: 'kWh',
        estimatedEmissionsKgCO2e: 5,
        sourceType: 'MANUAL',
        factorId: 'factor-1',
      }],
      totalEstimatedEmissionsKgCO2e: 5,
      reportingPeriod: {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        label: '2025',
      },
      selectedRecordIds: ['b', 'a'],
      selectedDocumentIds: ['doc-2', 'doc-1'],
    });
    const totals = buildReportTotals(input);
    const metadata = buildReportMetadata({
      ...input,
      reportCountSummary: totals.reportCountSummary,
    });

    expect(totals.reportCountSummary.processedRecords).toBe(1);
    expect(metadata.documentControl.reportId).toMatch(/^CL-DRAFT-2025-/);
    expect(metadata.regulatoryReportingReference.currentSystems).toContain('Alberta TIER compliance reporting');
    expect(metadata.regulatoryReportingReference.historicalNotes[0]).toContain('Historical federal fuel-charge');
  });
});
