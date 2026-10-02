import { apiFetch } from './api';
import { canImportDraftRows, requirePermission } from '../utils/permissions';
import { getCurrentUser } from './auth';

export type SpreadsheetReviewRowStatus = 'READY' | 'NEEDS_REVIEW' | 'TRACKED_ONLY';

export type SpreadsheetReviewIssue = {
  code: string;
  field: string;
  message: string;
};

export type SpreadsheetReviewRowInput = {
  rowId: string;
  status: SpreadsheetReviewRowStatus;
  activityType: string;
  rawActivityType?: string;
  recordDate: string | null;
  rawRecordDate?: unknown;
  quantity: number | null;
  rawQuantity?: string;
  unit: string;
  jurisdictionCountry?: string;
  jurisdictionRegion?: string;
  facilityName?: string;
  sourceReference?: string;
  sourceFileName?: string;
  sourceSheetName?: string;
  sourceRow?: string | number;
  costCad?: number;
  costCurrency?: string;
  rawSourceRow?: Record<string, unknown>;
  notes?: string;
  issues: SpreadsheetReviewIssue[];
  matchingStatus?: string;
  reportTreatment?: string;
  scope?: string;
  calculationStatus?: string;
  calculationMessage?: string;
  matchedFactorId?: string;
  matchedFactorName?: string;
  matchedFactorSourceYear?: number;
  matchedFactorValue?: number;
  matchedFactorUnit?: string;
  matchedFactorVersion?: string;
  matchedFactorSourceAuthority?: string;
  matchedFactorSourceDocument?: string;
  matchedFactorVerificationStatus?: string;
  matchedFactorConfidenceLevel?: string;
  matchedFactorAssumptions?: string;
  calculatedEmissionsKgCO2e?: number | null;
};

export type SpreadsheetReviewRowItem = {
  id: string;
  sourceDocumentId?: string | null;
  rowId?: string | null;
  status: SpreadsheetReviewRowStatus;
  sourceType?: string | null;
  sourceFileName?: string | null;
  sourceSheetName?: string | null;
  sourceRow?: string | number | null;
  sourceReference?: string | null;
  activityType?: string | null;
  rawActivityType?: string | null;
  recordDate?: string | null;
  rawRecordDate?: unknown;
  quantity?: number | null;
  rawQuantity?: string | null;
  unit?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  facilityName?: string | null;
  costCad?: number | string | null;
  costCurrency?: string | null;
  notes?: string | null;
  issues?: SpreadsheetReviewIssue[];
  rawSourceRow?: Record<string, unknown> | null;
  matchingStatus?: string | null;
  reportTreatment?: string | null;
  scope?: string | null;
  calculationStatus?: string | null;
  calculationMessage?: string | null;
  calculatedEmissionsKgCO2e?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SaveSpreadsheetReviewRowsInput = {
  sourceType: 'CSV' | 'EXCEL' | 'PASTE';
  importBatchId?: string;
  sourceFileName?: string;
  rows: SpreadsheetReviewRowInput[];
};

export type SaveSpreadsheetReviewRowsResponse = {
  savedCount: number;
  readyCount?: number;
  needsReviewCount?: number;
  trackedOnlyCount?: number;
  sourceDocument?: {
    id: string;
    fileName: string;
    type: string;
    status: string;
    createdAt: string;
  };
  failedRows?: Array<{
    rowId?: string;
    sourceRow?: string | number;
    message: string;
  }>;
};

export async function saveSpreadsheetReviewRows(input: SaveSpreadsheetReviewRowsInput) {
  requirePermission(canImportDraftRows(getCurrentUser()));

  return apiFetch<SaveSpreadsheetReviewRowsResponse>('/spreadsheet-import/review-rows', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getSpreadsheetReviewRows(params?: {
  sourceDocumentIds?: string[];
}) {
  const searchParams = new URLSearchParams();
  if (params?.sourceDocumentIds?.length) {
    searchParams.set('sourceDocumentIds', params.sourceDocumentIds.join(','));
  }

  const query = searchParams.toString();
  return apiFetch<{ items: SpreadsheetReviewRowItem[] }>(
    `/spreadsheet-import/review-rows${query ? `?${query}` : ''}`,
  );
}
