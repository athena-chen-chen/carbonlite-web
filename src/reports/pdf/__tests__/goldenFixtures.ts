import { EMPTY_ACTIVITY_USAGE_TOTALS } from '../../../services/metricsOverview';
import type { CalculationAuditDetail } from '../../../services/metrics';
import type { SpreadsheetReviewRowItem } from '../../../services/spreadsheetReviewRows';
import { buildInventoryBoundary } from '../../../constants/inventoryBoundary';
import { buildCanonicalReportData } from '../../domain/buildCanonicalReportData';
import type { BuildCanonicalReportDataInput } from '../../domain/reportTypes';


let lastInput: BuildCanonicalReportDataInput;
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
  const input: BuildCanonicalReportDataInput = {
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
    matchedActivityEmissions: (overrides.matchedActivityEmissions ?? calculationDetails
      .filter((item) => item.status === 'CALCULATED')
      .map((item) => ({
        activityDataId: item.activityDataId,
        activityType: item.activityType,
        quantity: item.activityQuantity,
        unit: item.activityUnit,
        estimatedEmissionsKgCO2e: Number(item.calculatedEmissionsKgCO2e ?? 0),
        sourceType: item.sourceType,
        sourceReference: item.sourceReference,
      }))) as BuildCanonicalReportDataInput['matchedActivityEmissions'],
    conversionFactorsUsed: overrides.conversionFactorsUsed ?? [],
    usageTotals: overrides.usageTotals ?? EMPTY_ACTIVITY_USAGE_TOTALS,
    countSummary: (overrides.countSummary ?? {
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
    }) as BuildCanonicalReportDataInput['countSummary'],
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
  lastInput = input;
  return input;
}
export function goldenReport(name: "messy" | "enmax" | "field") {
if (name === 'messy') {
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
return { report, input: lastInput };
}
if (name === 'enmax') {
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
return { report, input: lastInput };
}
if (name === 'field') {
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
return { report, input: lastInput };
}
throw new Error("Unknown golden");
}
