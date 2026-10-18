import type { CalculationAuditDetail } from '../../services/metrics';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import type { SourceReviewSummary } from './reportTypes';

export function buildSourceReviewSummary(input: {
  rows: SpreadsheetReviewRowItem[];
  calculationDetails: CalculationAuditDetail[];
}): SourceReviewSummary {
  const reviewRows = input.rows.filter((row) => !isSourceReviewSummaryRow(row));
  const readyRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'READY');
  const trackedRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'TRACKED_ONLY');
  const needsReviewRows = reviewRows.filter((row) => normalizeReviewStatus(row.status) === 'NEEDS_REVIEW');
  const resolvedCount = readyRows.length + trackedRows.length;
  const totalRows = reviewRows.length;

  if (totalRows === 0) {
    return buildUnstructuredSourceReviewSummary(input.calculationDetails);
  }

  return {
    available: totalRows > 0,
    availability: 'STRUCTURED_REVIEW_AVAILABLE',
    sourceType: 'SPREADSHEET',
    status: needsReviewRows.length > 0 ? 'NEEDS_ATTENTION' : 'COMPLETE',
    evidence: `${totalRows} source ${totalRows === 1 ? 'row was' : 'rows were'} reviewed.`,
    limitation: needsReviewRows.length > 0
      ? `${needsReviewRows.length} source ${needsReviewRows.length === 1 ? 'row still requires' : 'rows still require'} review.`
      : 'No unresolved source-review issues are currently recorded for this report scope.',
    sourceFiles: uniqueReviewValues(reviewRows.map((row) => row.sourceFileName)),
    totalRows,
    readyCount: readyRows.length,
    trackedOnlyCount: trackedRows.length,
    resolvedCount,
    needsReviewCount: needsReviewRows.length,
    resolutionPercent: totalRows > 0 ? Math.round((resolvedCount / totalRows) * 1000) / 10 : 0,
    needsReviewRows,
  };
}

function buildUnstructuredSourceReviewSummary(
  calculationDetails: CalculationAuditDetail[],
): SourceReviewSummary {
  const spreadsheetLineageDetails = calculationDetails.filter(hasStructuredSpreadsheetSourceLineage);
  if (spreadsheetLineageDetails.length > 0) {
    const sourceRows = new Set(
      spreadsheetLineageDetails.map(getStructuredSpreadsheetSourceRowKey).filter(Boolean),
    );
    const totalRows = sourceRows.size || spreadsheetLineageDetails.length;

    return {
      available: true,
      availability: 'STRUCTURED_REVIEW_AVAILABLE',
      sourceType: 'SPREADSHEET',
      status: 'COMPLETE',
      evidence: `${totalRows} source ${totalRows === 1 ? 'row was' : 'rows were'} reviewed.`,
      limitation: 'No unresolved source-review issues are currently recorded for this report scope.',
      sourceDocumentCount: uniqueReviewValues(
        spreadsheetLineageDetails.map((detail) => detail.sourceDocumentId || detail.sourceFileName),
      ).length,
      importedCount: spreadsheetLineageDetails.length,
      sourceFiles: uniqueReviewValues(spreadsheetLineageDetails.map((detail) => detail.sourceFileName)),
      totalRows,
      readyCount: totalRows,
      trackedOnlyCount: 0,
      resolvedCount: totalRows,
      needsReviewCount: 0,
      resolutionPercent: 100,
      needsReviewRows: [],
    };
  }

  const lineageDetails = calculationDetails.filter(hasDocumentSourceLineage);
  const sourceFiles = uniqueReviewValues(lineageDetails.map((detail) => detail.sourceFileName));
  const sourceDocumentCount = uniqueReviewValues(
    lineageDetails.map((detail) => detail.sourceDocumentId || detail.sourceFileName),
  ).length;

  if (lineageDetails.length > 0) {
    return {
      available: false,
      availability: 'DOCUMENT_LINEAGE_AVAILABLE',
      sourceType: 'DOCUMENT',
      status: 'LIMITED',
      evidence: `Source document lineage is available for ${lineageDetails.length} imported ${lineageDetails.length === 1 ? 'record' : 'records'}.`,
      limitation: 'Structured unresolved-source-row counts are not available for this document import.',
      sourceDocumentCount,
      importedCount: lineageDetails.length,
      sourceFiles,
      totalRows: 0,
      readyCount: 0,
      trackedOnlyCount: 0,
      resolvedCount: lineageDetails.length,
      needsReviewCount: 0,
      resolutionPercent: 0,
      needsReviewRows: [],
    };
  }

  return {
    available: false,
    availability: 'NO_SOURCE_REVIEW',
    sourceType: 'MANUAL',
    status: 'NOT_APPLICABLE',
    evidence: 'No source document is associated with this report scope.',
    limitation: 'Source-document review is not applicable to manually entered records.',
    sourceDocumentCount: 0,
    importedCount: calculationDetails.length,
    sourceFiles: [],
    totalRows: 0,
    readyCount: 0,
    trackedOnlyCount: 0,
    resolvedCount: 0,
    needsReviewCount: 0,
    resolutionPercent: 0,
    needsReviewRows: [],
  };
}

function hasDocumentSourceLineage(detail: CalculationAuditDetail) {
  const sourceType = String(detail.sourceType ?? '').toUpperCase();
  const fileName = String(detail.sourceFileName ?? '').trim();
  if (isSpreadsheetSourceFile(fileName) || detail.sourceSheetName || detail.sourceRow) {
    return false;
  }

  return Boolean(
    detail.sourceDocumentId ||
      sourceType.includes('DOCUMENT') ||
      sourceType.includes('PDF') ||
      /\.pdf$/i.test(fileName),
  );
}

function hasStructuredSpreadsheetSourceLineage(detail: CalculationAuditDetail) {
  const sourceType = String(detail.sourceType ?? '').toUpperCase();
  const fileName = String(detail.sourceFileName ?? '').trim();

  return Boolean(
    isSpreadsheetSourceFile(fileName) ||
      detail.sourceSheetName ||
      (
        detail.sourceRow !== null &&
        detail.sourceRow !== undefined &&
        ['CSV', 'EXCEL', 'SPREADSHEET'].some((type) => sourceType.includes(type))
      ),
  );
}

function isSpreadsheetSourceFile(fileName?: string | null) {
  return /\.(csv|xlsx|xls)$/i.test(String(fileName ?? '').trim());
}

function getStructuredSpreadsheetSourceRowKey(detail: CalculationAuditDetail) {
  const sourceRow = String(detail.sourceRow ?? '').trim();
  if (!sourceRow) return '';

  return [
    String(detail.sourceDocumentId ?? '').trim(),
    String(detail.sourceFileName ?? '').trim(),
    String(detail.sourceSheetName ?? '').trim(),
    sourceRow,
  ].join('::');
}

function normalizeReviewStatus(value?: string | null) {
  return String(value ?? '').trim().toUpperCase();
}

function uniqueReviewValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean)),
  );
}

function isSourceReviewSummaryRow(row: SpreadsheetReviewRowItem) {
  const text = [
    row.sourceReference,
    row.rawActivityType,
    row.activityType,
    row.notes,
    row.rawRecordDate,
  ]
    .map((value) => String(value ?? '').replace(/[_-]+/g, ' ').trim().toUpperCase())
    .join(' ');

  return /\b(SUBTOTAL|SUB TOTAL|GRAND TOTAL|TOTAL|SUMMARY)\b/.test(text);
}
