import { type DetectedSourceItem } from '../../services/documentExtraction';
import { type ActivityDataInput } from '../../services/activityData';

export type DocumentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
  importedAt?: string | null;
  importBatchId?: string | null;
  sourceRowCount?: number | null;
  extractedRowCount?: number | null;
  importedRecordCount?: number | null;
};

export type EditableConfidenceField<T> = {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
};

export type EditableParsedActivity = {
  rowId?: string | null;
  selected: boolean;
  documentId: string;
  documentFileName: string;
  status?: string | null;
  dateEstimated: boolean;
  periodEndDate?: string | null;
  activityType: EditableConfidenceField<string>;
  recordDate: EditableConfidenceField<string>;
  quantity: EditableConfidenceField<number>;
  unit: EditableConfidenceField<string>;
  jurisdictionCountry: EditableConfidenceField<string>;
  jurisdictionRegion: EditableConfidenceField<string>;
  facilityName: EditableConfidenceField<string>;
  sourceReference: EditableConfidenceField<string>;
  sourceSheetName?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  costCad?: number | string | null;
  costCurrency?: string | null;
  matchingStatus?: string | null;
  reportTreatment?: string | null;
  scope?: string | null;
  calculationStatus?: string | null;
  calculationMessage?: string | null;
  matchedFactorId?: string | null;
  matchedFactorName?: string | null;
  matchedFactorSourceYear?: number | null;
  matchedFactorValue?: number | null;
  matchedFactorUnit?: string | null;
  matchedFactorVersion?: string | null;
  matchedFactorSourceAuthority?: string | null;
  matchedFactorSourceDocument?: string | null;
  matchedFactorSourceUrl?: string | null;
  matchedFactorVerificationStatus?: string | null;
  matchedFactorConfidenceLevel?: string | null;
  matchedFactorAssumptions?: string | null;
  factorSelectionReason?: string | null;
  factorSelectionExplanation?: string | null;
  calculatedEmissionsKgCO2e?: number | null;
  notes: EditableConfidenceField<string>;
};

export type EditableDetectedSourceItem = DetectedSourceItem & {
  documentId: string;
  documentFileName: string;
};

export type DraftRowClassification =
  | 'READY'
  | 'TRACKED_METRIC'
  | 'REQUIRES_REVIEW'
  | 'NOT_IMPORTABLE';

export type ImportValidationField =
  | 'activityType'
  | 'quantity'
  | 'unit'
  | 'recordDate'
  | 'jurisdictionRegion';

export type ImportValidationIssue = {
  rowIndex: number;
  field: ImportValidationField;
  message: string;
};

export type RawExtractionField = string | number | null | undefined | Record<string, any>;

export type DraftActivityInput = Omit<Partial<ActivityDataInput>, 'quantity' | 'unit'> & { quantity?: number | null; unit?: string | null };

export type DocumentActionKind =
  | 'viewDetails'
  | 'downloadSource'
  | 'uploadAgain'
  | 'extract'
  | 'preview'
  | 'reextract'
  | 'import'
  | 'viewRecords'
  | 'delete';

export type DocumentActionConfig = {
  kind: DocumentActionKind;
  label: string;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
  separatorBefore?: boolean;
};

export type InputMethod = 'documents' | 'spreadsheet' | 'manual';

export type DocumentActionModel = {
  statusLabel: string;
  primaryAction: DocumentActionConfig;
  menuActions: DocumentActionConfig[];
};

export type WorkflowEventInput = {
  eventName: string;
  entityType: string;
  entityDisplayName?: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type ImportCompletion = {
  documentIds: string[];
  importedCount: number;
  trackedMetricCount: number;
  rowsLeftForReview: number;
  createdActivityIds?: string[];
  message: string;
};
