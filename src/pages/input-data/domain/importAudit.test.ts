import { describe, expect, it } from 'vitest';
import type { EditableParsedActivity } from '../inputData.types';
import { buildConfirmImportAuditSummary, buildDraftRowAuditSummary } from './importAudit';

function row(sourceRow: number, status = 'READY'): EditableParsedActivity {
  return {
    selected: true,
    documentId: 'document-1',
    documentFileName: 'operations.xlsx',
    sourceSheetName: 'Operations',
    sourceRow,
    status,
    dateEstimated: false,
    activityType: { value: status === 'TRACKED_ONLY' ? 'WATER' : 'DIESEL', confidence: 'high' },
    recordDate: { value: '2026-02-05', confidence: 'high' },
    quantity: { value: 100, confidence: 'high' },
    unit: { value: status === 'TRACKED_ONLY' ? 'm3' : 'L', confidence: 'high' },
    jurisdictionCountry: { value: 'Canada', confidence: 'high' },
    jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
    facilityName: { value: 'Calgary HQ', confidence: 'high' },
    sourceReference: { value: 'invoice-1', confidence: 'high' },
    notes: { value: '', confidence: 'high' },
  };
}

describe('import audit reconciliation', () => {
  it('separates created emissions, tracked records, prior imports, duplicates, and unresolved rows', () => {
    const included = row(2);
    const tracked = row(3, 'TRACKED_ONLY');
    const priorImport = row(4);
    const duplicate = row(5);
    const unresolved = row(6, 'NEEDS_REVIEW');
    const rowsForConfirm = [included, tracked, priorImport, duplicate, unresolved];

    expect(buildDraftRowAuditSummary(rowsForConfirm)).toEqual({
      draftRecordsCreated: 5,
      readyCount: 3,
      trackedMetricCount: 1,
      requiresReviewCount: 1,
      importableCount: 4,
    });
    expect(buildConfirmImportAuditSummary({
      rowsForConfirm,
      importedRows: [included, tracked],
      remainingRows: [duplicate, unresolved],
    })).toEqual({
      totalRowsConsidered: 5,
      includedEmissionsCreated: 1,
      trackedMetricsCreated: 1,
      alreadyImportedSkipped: 1,
      needsReviewSkipped: 1,
      duplicateSkipped: 1,
      otherSkipped: 0,
      rowsNotImported: 3,
    });
  });

  it('reconciles a corrected row by source identity when its editable values changed', () => {
    const original = row(2);
    const persisted = {
      ...original,
      sourceReference: { value: 'corrected-reference', confidence: 'high' as const },
      quantity: { value: 200, confidence: 'high' as const },
    };

    expect(buildConfirmImportAuditSummary({
      rowsForConfirm: [original],
      importedRows: [persisted],
      remainingRows: [],
    })).toMatchObject({
      totalRowsConsidered: 1,
      includedEmissionsCreated: 1,
      alreadyImportedSkipped: 0,
      rowsNotImported: 0,
    });
  });
});
