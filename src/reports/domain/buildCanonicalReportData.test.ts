import { describe, expect, it } from 'vitest';
import { EMPTY_ACTIVITY_USAGE_TOTALS } from '../../services/metricsOverview';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import { buildInventoryBoundary } from '../../constants/inventoryBoundary';
import { buildCanonicalReportData } from './buildCanonicalReportData';
import { buildPilotCsvRows } from '../../utils/reportCsvExport';
import type { BuildCanonicalReportDataInput } from './reportTypes';

function detail(input: Partial<CalculationAuditDetail>): CalculationAuditDetail {
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

function reviewRow(input: Partial<SpreadsheetReviewRowItem>): SpreadsheetReviewRowItem {
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
  };
}

function inputFor(overrides: Partial<BuildCanonicalReportDataInput> = {}): BuildCanonicalReportDataInput {
  const calculationDetails = overrides.calculationDetails ?? [];
  return {
    activities: overrides.activities ?? calculationDetails.map((item) => ({
      id: item.activityDataId,
      activityType: item.activityType,
      recordDate: item.recordDate,
      quantity: item.activityQuantity,
      unit: item.activityUnit,
      sourceType: item.sourceType,
      sourceReference: item.sourceReference,
      sourceFileName: item.sourceFileName,
      sourceSheetName: item.sourceSheetName,
      sourceRow: item.sourceRow,
      jurisdictionRegion: item.jurisdictionRegion,
      jurisdiction: item.jurisdiction,
    })),
    reviewRows: overrides.reviewRows ?? [],
    calculationDetails,
    matchedActivityEmissions: overrides.matchedActivityEmissions ?? calculationDetails
      .filter((item) => item.status === 'CALCULATED')
      .map((item) => ({
        activityDataId: item.activityDataId,
        activityType: item.activityType,
        quantity: item.activityQuantity,
        unit: item.activityUnit,
        estimatedEmissionsKgCO2e: Number(item.calculatedEmissionsKgCO2e ?? 0),
        sourceType: item.sourceType,
        sourceReference: item.sourceReference,
      })),
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
    totalEstimatedEmissionsKgCO2e: overrides.totalEstimatedEmissionsKgCO2e ??
      calculationDetails.reduce(
        (sum, item) => sum + (item.status === 'CALCULATED' ? Number(item.calculatedEmissionsKgCO2e ?? 0) : 0),
        0,
      ),
    inventoryBoundary: overrides.inventoryBoundary ?? buildInventoryBoundary('Golden Org', '2026-01-01 to 2026-12-31'),
    reportingPeriod: overrides.reportingPeriod ?? {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      label: '2026-01-01 to 2026-12-31',
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
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

describe('buildCanonicalReportData', () => {
  it('builds an empty serializable report domain object', () => {
    const report = buildCanonicalReportData(inputFor());

    expect(report.inventory).toMatchObject({
      importedRecordCount: 0,
      includedRecordCount: 0,
      trackedMetricCount: 0,
      importedNeedsReviewCount: 0,
      totalKgCO2e: 0,
    });
    expect(report.calculationQuality.calculationCoverage).toBe('Not applicable');
    expect(report.sourceReview.availability).toBe('NO_SOURCE_REVIEW');
    expect(() => JSON.stringify(report)).not.toThrow();
  });

  it('preserves tracked metric semantics outside totals and coverage denominator', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'tracked-water',
          activityType: 'WATER',
          status: 'TRACKED_ONLY',
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
        }),
      ],
    }));

    expect(report.inventory).toMatchObject({
      importedRecordCount: 1,
      includedRecordCount: 0,
      trackedMetricCount: 1,
      totalKgCO2e: 0,
    });
    expect(report.calculationQuality.calculationCoverage).toBe('Not applicable');
  });

  it('summarizes calculated records, missing review records, costs, and facility fallback', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'calculated-zero-cost',
          activityType: 'NATURAL_GAS',
          activityQuantity: 3,
          activityUnit: 'GJ',
          calculatedEmissionsKgCO2e: 148.32,
          costCad: 0,
        }),
        detail({
          activityDataId: 'missing-factor',
          activityType: 'DIESEL',
          status: 'MISSING_FACTOR',
          calculationStatus: 'MISSING_FACTOR',
          calculatedEmissionsKgCO2e: null,
          costCad: null,
        }),
      ],
      totalEstimatedEmissionsKgCO2e: 148.32,
    }));

    expect(report.inventory.includedRecordCount).toBe(1);
    expect(report.inventory.importedNeedsReviewCount).toBe(1);
    expect(report.calculationQuality.dataReadinessSummary.optionalDataCompleteness).toMatchObject({
      costDataCount: 1,
      totalRecords: 2,
      score: 50,
    });
    expect(report.facilityBreakdown.rows[0].siteFacility).toBe('Unassigned');
  });

  it('uses structured source review rows when present', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({ sourceType: 'SPREADSHEET', sourceFileName: 'review.xlsx', sourceSheetName: 'Sheet1', sourceRow: 2 }),
      ],
      reviewRows: [
        reviewRow({ status: 'READY', sourceRow: 2 }),
        reviewRow({ status: 'TRACKED_ONLY', sourceRow: 3 }),
        reviewRow({
          status: 'NEEDS_REVIEW',
          sourceRow: 4,
          issues: [{ code: 'MISSING_UNIT', field: 'unit', message: 'Unit is required.' }],
        }),
      ],
    }));

    expect(report.sourceReview).toMatchObject({
      availability: 'STRUCTURED_REVIEW_AVAILABLE',
      totalRows: 3,
      resolvedCount: 2,
      needsReviewCount: 1,
    });
  });

  it('keeps document source review limited when structured rows are unavailable', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          sourceType: 'DOCUMENT_AI',
          sourceFileName: 'bill.pdf',
          sourceDocumentId: 'doc-bill',
        }),
      ],
    }));

    expect(report.sourceReview).toMatchObject({
      availability: 'DOCUMENT_LINEAGE_AVAILABLE',
      totalRows: 0,
      resolvedCount: 1,
      needsReviewCount: 0,
    });
    expect(report.sourceReview.limitation).toContain('document import');
  });

  it('retains generic factor jurisdiction fallback provenance', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'enmax-natural-gas',
          activityType: 'NATURAL_GAS',
          jurisdiction: 'Alberta, Canada',
          jurisdictionRegion: 'Alberta',
          factorName: 'Natural Gas - Canada Generic',
          factorValue: 49.44,
          factorInputUnit: 'GJ',
          factorSource: 'Environment and Climate Change Canada',
          sourceAuthority: 'Environment and Climate Change Canada',
          factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
          calculatedEmissionsKgCO2e: 148.32,
        }),
      ],
      conversionFactorsUsed: [
        {
          factorName: 'Natural Gas - Canada Generic',
          factorValue: 49.44,
          inputUnit: 'GJ',
          resultUnit: 'kgCO2e',
          jurisdiction: 'Canada (Generic)',
          sourceAuthority: 'Environment and Climate Change Canada',
          sourceYear: 2025,
          factorType: 'System',
          verified: true,
        },
      ],
    }));

    expect(report.factorReview.factors[0]).toMatchObject({
      factorName: 'Natural Gas - Canada Generic',
      factorValue: 49.44,
      jurisdiction: 'Canada (Generic)',
      sourceAuthority: 'Environment and Climate Change Canada',
    });
    expect(report.calculationDetails[0].factorSelectionReason).toBe('GENERIC_JURISDICTION_FALLBACK');
  });

  it('is deterministic and does not mutate inputs', () => {
    const input = inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'b',
          calculatedEmissionsKgCO2e: 20,
          facilityName: 'Beta',
        }),
        detail({
          activityDataId: 'a',
          calculatedEmissionsKgCO2e: 10,
          facilityName: 'Alpha',
        }),
      ],
      selectedRecordIds: ['z', 'a'],
    });
    const before = JSON.stringify(input);
    deepFreeze(input);

    const first = buildCanonicalReportData(input);
    const second = buildCanonicalReportData(input);

    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('freezes messy Excel golden domain values', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          jurisdiction: 'Alberta, Canada',
          jurisdictionRegion: 'Alberta',
          facilityName: 'Calgary HQ',
          activityQuantity: 980,
          activityUnit: 'kWh',
          calculatedEmissionsKgCO2e: 519.4,
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceSheetName: 'Messy_Operations',
          sourceRow: 2,
          costCad: 214.55,
        }),
        detail({
          activityDataId: 'activity-march-water-007',
          activityType: 'WATER',
          facilityName: 'Calgary HQ',
          activityQuantity: 18,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceSheetName: 'Messy_Operations',
          sourceRow: 8,
          costCad: 64,
        }),
        detail({
          activityDataId: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          jurisdiction: 'Ontario, Canada',
          jurisdictionRegion: 'Ontario',
          facilityName: 'Toronto Client Visit',
          activityQuantity: 4,
          activityUnit: 'nights',
          calculatedEmissionsKgCO2e: 60,
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceSheetName: 'Messy_Operations',
          sourceRow: 11,
          costCad: 720,
        }),
      ],
      reviewRows: [
        reviewRow({ status: 'READY', sourceRow: 2, sourceReference: 'MARCH-ELEC-001' }),
        reviewRow({ status: 'TRACKED_ONLY', sourceRow: 8, sourceReference: 'MARCH-WATER-007' }),
        reviewRow({ status: 'READY', sourceRow: 11, sourceReference: 'MARCH-HOTEL-010' }),
        ...[3, 4, 5, 6, 7, 9].map((sourceRow) =>
          reviewRow({
            status: 'NEEDS_REVIEW',
            sourceRow,
            sourceReference: `NEEDS-${sourceRow}`,
            issues: [{ code: 'NEEDS_REVIEW', field: 'source', message: 'Review required.' }],
          }),
        ),
      ],
      totalEstimatedEmissionsKgCO2e: 579.4,
    }));

    expect(report.inventory).toMatchObject({
      importedRecordCount: 3,
      includedRecordCount: 2,
      trackedMetricCount: 1,
      totalKgCO2e: 579.4,
    });
    expect(report.scopeSummary).toMatchObject({ 'Scope 1': 0, 'Scope 2': 519.4, 'Scope 3': 60 });
    expect(report.calculationQuality.calculationCoverage).toBe('100%');
    expect(report.calculationQuality.dataReadinessSummary.optionalDataCompleteness.score).toBe(100);
    expect(report.sourceReview).toMatchObject({ totalRows: 9, resolvedCount: 3, needsReviewCount: 6 });
  });

  it('freezes sanitized ENMAX golden domain values', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({
          activityDataId: 'enmax-electricity',
          activityType: 'ELECTRICITY',
          recordDate: '2025-08-01',
          reportingYear: 2025,
          jurisdiction: 'Alberta, Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 358,
          activityUnit: 'kWh',
          factorValue: 0.53,
          calculatedEmissionsKgCO2e: 189.74,
          sourceType: 'DOCUMENT_AI',
          sourceFileName: 'sanitized-enmax.pdf',
          sourceDocumentId: 'doc-enmax',
        }),
        detail({
          activityDataId: 'enmax-natural-gas',
          activityType: 'NATURAL_GAS',
          recordDate: '2025-08-01',
          reportingYear: 2025,
          jurisdiction: 'Alberta, Canada',
          jurisdictionRegion: 'Alberta',
          activityQuantity: 3,
          activityUnit: 'GJ',
          factorName: 'Natural Gas - Canada Generic',
          factorValue: 49.44,
          factorInputUnit: 'GJ',
          factorSource: 'Environment and Climate Change Canada',
          sourceAuthority: 'Environment and Climate Change Canada',
          factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
          calculatedEmissionsKgCO2e: 148.32,
          sourceType: 'DOCUMENT_AI',
          sourceFileName: 'sanitized-enmax.pdf',
          sourceDocumentId: 'doc-enmax',
        }),
        detail({
          activityDataId: 'enmax-water',
          activityType: 'WATER',
          recordDate: '2025-08-01',
          reportingYear: 2025,
          activityQuantity: 6,
          activityUnit: 'm3',
          status: 'TRACKED_ONLY',
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          calculatedEmissionsKgCO2e: null,
          sourceType: 'DOCUMENT_AI',
          sourceFileName: 'sanitized-enmax.pdf',
          sourceDocumentId: 'doc-enmax',
        }),
      ],
      conversionFactorsUsed: [
        {
          factorName: 'Natural Gas - Canada Generic',
          factorValue: 49.44,
          inputUnit: 'GJ',
          resultUnit: 'kgCO2e',
          jurisdiction: 'Canada (Generic)',
          sourceAuthority: 'Environment and Climate Change Canada',
          sourceYear: 2025,
          factorType: 'System',
          verified: true,
        },
      ],
      totalEstimatedEmissionsKgCO2e: 338.06,
      reportingPeriod: { startDate: '2025-01-01', endDate: '2025-12-31', label: '2025-01-01 to 2025-12-31' },
    }));

    expect(report.inventory).toMatchObject({
      importedRecordCount: 3,
      includedRecordCount: 2,
      trackedMetricCount: 1,
      totalKgCO2e: 338.06,
    });
    expect(report.scopeSummary).toMatchObject({ 'Scope 1': 148.32, 'Scope 2': 189.74, 'Scope 3': 0 });
    expect(report.calculationQuality.calculationCoverage).toBe('100%');
    expect(report.calculationQuality.dataReadinessSummary.optionalDataCompleteness.score).toBe(0);
    expect(report.factorReview.factors[0]).toMatchObject({
      jurisdiction: 'Canada (Generic)',
      sourceAuthority: 'Environment and Climate Change Canada',
      factorValue: 49.44,
      inputUnit: 'GJ',
    });
    expect(report.reportingPeriod).toMatchObject({ startDate: '2025-01-01', endDate: '2025-12-31' });
  });

  it('retains the original activity and source-evidence projections for closure-free exports', () => {
    const input = inputFor({
      activities: [{ id: 'source-record', activityType: 'ELECTRICITY', quantity: 1250, unit: 'kWh', sourceType: 'EXCEL', sourceFileName: 'source-original.xlsx', sourceReference: 'ORIGINAL-REFERENCE' }],
      calculationDetails: [detail({ activityDataId: 'source-record', sourceFileName: 'normalized.xlsx', calculatedEmissionsKgCO2e: 662.5 })],
      matchedActivityEmissions: [{ activityDataId: 'source-record', activityType: 'ELECTRICITY', quantity: 1250, unit: 'kWh', estimatedEmissionsKgCO2e: 662.5 }],
    });
    const report = buildCanonicalReportData(input);
    expect(report.matchedActivityEmissions).toBe(input.matchedActivityEmissions);
    expect(report.sourceEvidenceRows[0]).toMatchObject({ sourceFile: 'source-original.xlsx', quantity: '1,250', unit: 'kWh' });
    expect(report.sourceEvidenceRows[0].sourceReference).toContain('ORIGINAL-REFERENCE');
  });

  it('freezes field mapping golden domain values', () => {
    const report = buildCanonicalReportData(inputFor({
      calculationDetails: [
        detail({ activityDataId: 'field-electricity', activityType: 'ELECTRICITY', facilityName: 'Calgary HQ', activityQuantity: 1250, activityUnit: 'kWh', calculatedEmissionsKgCO2e: 662.5, sourceType: 'DOCUMENT_AI', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceSheetName: 'Operations_2026', sourceRow: 2 }),
        detail({ activityDataId: 'field-gas', activityType: 'NATURAL_GAS', facilityName: 'Calgary HQ', activityQuantity: 8.5, activityUnit: 'GJ', factorValue: 49.44, calculatedEmissionsKgCO2e: 420.24, sourceType: 'DOCUMENT_AI', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceSheetName: 'Operations_2026', sourceRow: 3 }),
        detail({ activityDataId: 'field-gasoline', activityType: 'GASOLINE', facilityName: 'Vancouver Fleet', activityQuantity: 350, activityUnit: 'L', factorValue: 2.31, calculatedEmissionsKgCO2e: 808.5, sourceType: 'DOCUMENT_AI', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceSheetName: 'Operations_2026', sourceRow: 4 }),
        detail({ activityDataId: 'field-hotel', activityType: 'HOTEL', facilityName: 'Toronto Sales Trip', activityQuantity: 3, activityUnit: 'nights', factorValue: 15, calculatedEmissionsKgCO2e: 45, sourceType: 'DOCUMENT_AI', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceSheetName: 'Operations_2026', sourceRow: 5 }),
        detail({ activityDataId: 'field-air', activityType: 'AIR_TRAVEL', facilityName: 'Corporate Travel', activityQuantity: 4280, activityUnit: 'km', factorValue: 0.115, calculatedEmissionsKgCO2e: 492.2, sourceType: 'DOCUMENT_AI', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceSheetName: 'Operations_2026', sourceRow: 6 }),
      ],
      totalEstimatedEmissionsKgCO2e: 2428.44,
    }));

    expect(report.inventory).toMatchObject({
      importedRecordCount: 5,
      includedRecordCount: 5,
      trackedMetricCount: 0,
      importedNeedsReviewCount: 0,
      totalKgCO2e: 2428.44,
    });
    expect(report.scopeSummary).toMatchObject({
      'Scope 1': 1228.74,
      'Scope 2': 662.5,
      'Scope 3': 537.2,
    });
    expect(report.calculationQuality.dataReadinessSummary.optionalDataCompleteness.score).toBe(0);
    expect(report.sourceReview).toMatchObject({ totalRows: 5, resolvedCount: 5, needsReviewCount: 0 });
    expect(report.facilityBreakdown.rows.map((row) => [row.siteFacility, row.totalKgCO2e])).toEqual([
      ['Calgary HQ', 1082.74],
      ['Vancouver Fleet', 808.5],
      ['Corporate Travel', 492.2],
      ['Toronto Sales Trip', 45],
    ]);
  });

  it('reconciles the current Golden A, C, and combined paid-pilot reporting state', () => {
    const goldenADetails = [
      detail({
        activityDataId: 'fresh-a-hotel',
        activityType: 'HOTEL',
        activityQuantity: 4,
        activityUnit: 'nights',
        calculatedEmissionsKgCO2e: 60,
        factorValue: 15,
        factorDefaultScope: 'SCOPE_3',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceRow: 11,
        sourceDocumentId: 'fresh-doc-a',
      }),
      detail({
        activityDataId: 'fresh-a-water',
        activityType: 'WATER',
        activityQuantity: 18,
        activityUnit: 'm3',
        calculatedEmissionsKgCO2e: null,
        status: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceRow: 8,
        sourceDocumentId: 'fresh-doc-a',
      }),
    ];
    const goldenCDetails = [
      detail({ activityDataId: 'fresh-c-gas', activityType: 'NATURAL_GAS', activityQuantity: 8.5, activityUnit: 'GJ', factorValue: 49.44, calculatedEmissionsKgCO2e: 420.24, factorDefaultScope: 'SCOPE_1', sourceType: 'SPREADSHEET', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceRow: 3, sourceDocumentId: 'fresh-doc-c' }),
      detail({ activityDataId: 'fresh-c-gasoline', activityType: 'GASOLINE', activityQuantity: 350, activityUnit: 'L', factorValue: 2.31, calculatedEmissionsKgCO2e: 808.5, factorDefaultScope: 'SCOPE_1', sourceType: 'SPREADSHEET', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceRow: 4, sourceDocumentId: 'fresh-doc-c' }),
      detail({ activityDataId: 'fresh-c-hotel', activityType: 'HOTEL', activityQuantity: 3, activityUnit: 'nights', factorValue: 15, calculatedEmissionsKgCO2e: 45, factorDefaultScope: 'SCOPE_3', sourceType: 'SPREADSHEET', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceRow: 5, sourceDocumentId: 'fresh-doc-c' }),
      detail({ activityDataId: 'fresh-c-air', activityType: 'AIR_TRAVEL', activityQuantity: 4280, activityUnit: 'km', factorValue: 0.115, calculatedEmissionsKgCO2e: 492.2, factorDefaultScope: 'SCOPE_3', sourceType: 'SPREADSHEET', sourceFileName: 'carbonlite_field_mapping_test.xlsx', sourceRow: 6, sourceDocumentId: 'fresh-doc-c' }),
    ];
    const albertaIssue = [{
      code: 'MISSING_FACTOR',
      field: 'factor',
      message: 'No matching emission factor is available for this record.',
    }];
    const goldenAReviewRows = [
      reviewRow({ id: 'a-electricity', sourceDocumentId: 'fresh-doc-a', sourceFileName: 'carbonlite_needs_review_test.xlsx', status: 'NEEDS_REVIEW', sourceRow: 2, activityType: 'ELECTRICITY', jurisdictionRegion: 'Alberta', quantity: 980, unit: 'kWh', issues: albertaIssue, calculationStatus: 'MISSING_FACTOR' }),
      reviewRow({ id: 'a-water', sourceDocumentId: 'fresh-doc-a', sourceFileName: 'carbonlite_needs_review_test.xlsx', status: 'TRACKED_ONLY', sourceRow: 8, activityType: 'WATER' }),
      reviewRow({ id: 'a-hotel', sourceDocumentId: 'fresh-doc-a', sourceFileName: 'carbonlite_needs_review_test.xlsx', status: 'READY', sourceRow: 11, activityType: 'HOTEL' }),
      ...[3, 4, 5, 6, 7, 9].map((sourceRow) => reviewRow({ id: `a-review-${sourceRow}`, sourceDocumentId: 'fresh-doc-a', sourceFileName: 'carbonlite_needs_review_test.xlsx', status: 'NEEDS_REVIEW', sourceRow, issues: [{ code: 'NEEDS_REVIEW', field: 'row', message: 'Review required before import.' }] })),
    ];
    const goldenCReviewRows = [
      reviewRow({ id: 'c-electricity', sourceDocumentId: 'fresh-doc-c', sourceFileName: 'carbonlite_field_mapping_test.xlsx', status: 'NEEDS_REVIEW', sourceRow: 2, activityType: 'ELECTRICITY', jurisdictionRegion: 'Alberta', quantity: 1250, unit: 'kWh', issues: albertaIssue, calculationStatus: 'MISSING_FACTOR' }),
      ...[3, 4, 5, 6].map((sourceRow) => reviewRow({ id: `c-ready-${sourceRow}`, sourceDocumentId: 'fresh-doc-c', sourceFileName: 'carbonlite_field_mapping_test.xlsx', status: 'READY', sourceRow })),
    ];
    const makeReport = (
      calculationDetails: CalculationAuditDetail[],
      reviewRows: SpreadsheetReviewRowItem[],
    ) => buildCanonicalReportData(inputFor({ calculationDetails, reviewRows }));

    const goldenA = makeReport(goldenADetails, goldenAReviewRows);
    const goldenC = makeReport(goldenCDetails, goldenCReviewRows);
    const combined = makeReport(
      [...goldenADetails, ...goldenCDetails],
      [...goldenAReviewRows, ...goldenCReviewRows],
    );
    const csvTotal = buildPilotCsvRows(combined).reduce(
      (sum, row) => sum + Number(row['Calculated Emissions kgCO2e'] || 0),
      0,
    );

    expect(goldenA.inventory.totalKgCO2e).toBe(60);
    expect(goldenC.inventory.totalKgCO2e).toBe(1765.94);
    expect(combined.inventory.totalKgCO2e).toBe(1825.94);
    expect(combined.scopeBreakdown.totals).toEqual({
      'Scope 1': 1228.74,
      'Scope 2': 0,
      'Scope 3': 597.2,
      Unclassified: 0,
    });
    expect(combined.inventory).toMatchObject({
      importedRecordCount: 6,
      includedRecordCount: 5,
      trackedMetricCount: 1,
      importedNeedsReviewCount: 0,
    });
    expect(combined.reportCountSummary).toMatchObject({
      totalRecordsFound: 14,
      processedRecords: 5,
      skippedRecords: 8,
    });
    expect(combined.executiveSummary).toMatchObject({
      recordsIncluded: 5,
      recordsSkipped: 8,
      trackedMetrics: 1,
      recordsRequiringReview: 8,
    });
    expect(combined.sourceReview).toMatchObject({
      totalRows: 14,
      readyCount: 5,
      trackedOnlyCount: 1,
      needsReviewCount: 8,
    });
    expect(csvTotal).toBe(1825.94);
    expect(combined.calculationDetails.some((row) => row.activityType === 'ELECTRICITY')).toBe(false);

    const afterIncludedDelete = makeReport(
      [...goldenADetails, ...goldenCDetails].filter((row) => row.activityDataId !== 'fresh-c-gas'),
      [...goldenAReviewRows, ...goldenCReviewRows],
    );
    const afterIncludedDeleteCsvTotal = buildPilotCsvRows(afterIncludedDelete).reduce(
      (sum, row) => sum + Number(row['Calculated Emissions kgCO2e'] || 0),
      0,
    );
    expect(afterIncludedDelete.inventory).toMatchObject({
      totalKgCO2e: 1405.7,
      includedRecordCount: 4,
      trackedMetricCount: 1,
    });
    expect(afterIncludedDelete.reportCountSummary).toMatchObject({
      processedRecords: 4,
      skippedRecords: 8,
    });
    expect(afterIncludedDeleteCsvTotal).toBe(1405.7);

    const afterNeedsReviewDelete = makeReport(
      [...goldenADetails, ...goldenCDetails],
      [...goldenAReviewRows, ...goldenCReviewRows].filter((row) => row.id !== 'a-review-3'),
    );
    expect(afterNeedsReviewDelete.inventory.totalKgCO2e).toBe(1825.94);
    expect(afterNeedsReviewDelete.reportCountSummary).toMatchObject({
      processedRecords: 5,
      skippedRecords: 7,
    });
    expect(afterNeedsReviewDelete.sourceReview.needsReviewCount).toBe(7);
  });
});
