import type { DraftRowClassification, EditableParsedActivity, ImportValidationField, ImportValidationIssue } from '../inputData.types';
import { getActivityTypeLabel } from '../../../utils/activityType';
import { UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE } from '../../../utils/province';
import { isCanonicalReadyReviewRow, getExplicitReviewStatus, normalizeClassificationSignal, UNSUPPORTED_ACTIVITY_TYPE_MESSAGE } from '../domain/draftRowClassification';
import { DraftReviewHeader, type DraftReviewHeaderProps } from './DraftReviewHeader';
import { BulkProvinceHelper, type BulkProvinceHelperProps } from './BulkProvinceHelper';
import { ImportValidationSummary, type ImportValidationSummaryProps } from './ImportValidationSummary';
import { DetectedSourceItemsPanel, type DetectedSourceItemsPanelProps } from './DetectedSourceItemsPanel';
import { DraftRecordsTable, type DraftRecordsTableProps } from './DraftRecordsTable';
import { sectionCardStyle } from '../../UploadPage.styles';
import { formatCustomerStatusLabel, getCustomerStatusMessage } from '../../../utils/customerStatusPresentation';

type RowDisplayCallbacks = Pick<DraftRecordsTableProps,
  'getRowStatusLabel'
  | 'getRowIssueText'
  | 'getRowIssueTitle'
  | 'getRowReportTreatment'
  | 'getPreviewActivityTypeLabel'
  | 'getUnsupportedActivityTypeDisplayLabel'
  | 'getImportValidationIssueDetail'
  | 'getFieldValidationDisplayMessage'
  | 'getConfidenceStyle'
  | 'getPreviewDatePeriod'
>;

type DraftRecordsReviewProps = {
  headerProps: Omit<DraftReviewHeaderProps, 'confirmDisabledReason' | 'importSelectionSummary'> & Partial<Pick<DraftReviewHeaderProps, 'confirmDisabledReason' | 'importSelectionSummary'>> & {
    permissionDeniedReason?: string;
    selection?: {
      selectedParsedActivitiesCount: number;
      importableCount: number;
      selectedReadyImportableCount: number;
      selectedTrackedImportableCount: number;
      rowsLeftOutOfImportCount: number;
    };
  };
  bulkProvinceProps: BulkProvinceHelperProps;
  validationProps: Omit<ImportValidationSummaryProps, 'getImportValidationIssueLabel' | 'getImportValidationIssueDetail'> & Partial<Pick<ImportValidationSummaryProps, 'getImportValidationIssueLabel' | 'getImportValidationIssueDetail'>>;
  detectedSourceItemsProps: DetectedSourceItemsPanelProps;
  tableProps: Omit<DraftRecordsTableProps, keyof RowDisplayCallbacks> & Partial<RowDisplayCallbacks> & {
    rowClassifications?: DraftRowClassification[];
    getRowValidationIssues?: (rowIndex: number) => ImportValidationIssue[];
  };
  hasImportValidationErrors: boolean;
};

export function DraftRecordsReview({
  headerProps,
  bulkProvinceProps,
  validationProps,
  detectedSourceItemsProps,
  tableProps,
  hasImportValidationErrors,
}: DraftRecordsReviewProps) {
  const { parsedActivities } = tableProps;
  const rowClassifications = tableProps.rowClassifications ?? [];
  const selection = headerProps.selection ?? {
    selectedParsedActivitiesCount: 0, importableCount: 0, selectedReadyImportableCount: 0,
    selectedTrackedImportableCount: 0, rowsLeftOutOfImportCount: 0,
  };
  const getRowValidationIssues = tableProps.getRowValidationIssues ?? ((rowIndex: number) =>
    validationProps.importValidationIssues.filter((issue) => issue.rowIndex === rowIndex)
  );
  function getFieldValidationDisplayMessage(
    field: ImportValidationField,
    message?: string,
  ) {
    if (!message) return '';
    if (field === 'jurisdictionRegion' && isUnsupportedPilotProvinceIssue(message)) {
      return 'No applicable factor';
    }
    if (field === 'jurisdictionRegion') return 'Province required';
    if (field === 'activityType' && message === UNSUPPORTED_ACTIVITY_TYPE_MESSAGE) {
      return 'Unsupported Activity Type';
    }

    return message;
  }

  function getImportValidationIssueLabel(issue: ImportValidationIssue) {
    if (
      issue.field === 'jurisdictionRegion' &&
      isUnsupportedPilotProvinceIssue(issue.message)
    ) {
      return 'No applicable factor';
    }
    if (issue.field === 'jurisdictionRegion') return 'Province needed';
    if (issue.field === 'unit') return 'Unit needs correction';
    if (issue.field === 'quantity') return 'Invalid Amount';
    if (issue.field === 'activityType' && issue.message === UNSUPPORTED_ACTIVITY_TYPE_MESSAGE) {
      return 'Unsupported Activity Type';
    }
    if (issue.field === 'activityType') return 'Missing Activity Type';
    if (issue.field === 'recordDate') return 'Missing Date';

    return 'Needs Review';
  }

  function getImportValidationIssueDetail(issue: ImportValidationIssue) {
    if (
      issue.field === 'jurisdictionRegion' &&
      isUnsupportedPilotProvinceIssue(issue.message)
    ) {
      return UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE;
    }
    if (issue.field === 'jurisdictionRegion') {
      return 'Electricity records require province before factor matching.';
    }
    if (issue.field === 'activityType' && issue.message === UNSUPPORTED_ACTIVITY_TYPE_MESSAGE) {
      return 'This activity type is not supported in the current CarbonLite pilot.';
    }

    return issue.message;
  }

  function isUntouchedDefaultParsedActivity(item: EditableParsedActivity) {
    return (
      !String(item.activityType.value ?? '').trim() &&
      !String(item.recordDate.value ?? '').trim() &&
      !String(item.unit.value ?? '').trim() &&
      !String(item.facilityName.value ?? '').trim() &&
      !String(item.sourceReference.value ?? '').trim() &&
      !String(item.notes.value ?? '').trim() &&
      (item.quantity.value === null ||
        item.quantity.value === undefined ||
        Number(item.quantity.value) === 0)
    );
  }

  function getRowStatusLabel(rowIndex: number, item: EditableParsedActivity) {
    const issues = getRowValidationIssues(rowIndex);
    const classification = rowClassifications[rowIndex];
    const storedReviewLabel = getStoredReviewLabel(item);
    const explicitStatus = getExplicitReviewStatus(item);

    if (isUntouchedDefaultParsedActivity(item)) return 'Draft';
    if (explicitStatus === 'READY') return 'Calculated';
    if (explicitStatus === 'TRACKED_ONLY') return 'Tracked Metric';
    if (classification === 'TRACKED_METRIC') return 'Tracked Metric';
    if (
      issues.some(
        (issue) =>
          issue.field === 'activityType' &&
          issue.message === UNSUPPORTED_ACTIVITY_TYPE_MESSAGE,
      )
    ) {
      return 'Unsupported Activity';
    }
    if (issues.some((issue) => issue.field === 'activityType')) return 'Missing Activity Type';
    if (issues.some((issue) => issue.field === 'quantity')) return 'Invalid Amount';
    if (
      issues.some(
        (issue) =>
          issue.field === 'jurisdictionRegion' &&
          isUnsupportedPilotProvinceIssue(issue.message),
      )
    ) {
      return 'No applicable factor';
    }
    if (issues.some((issue) => issue.field === 'jurisdictionRegion')) return 'Province needed';
    if (issues.some((issue) => issue.field === 'unit')) return 'Unit needs correction';
    if (isCanonicalReadyReviewRow(item)) return 'Calculated';
    if (storedReviewLabel) return storedReviewLabel;
    return issues.length > 0 ? 'Needs Review' : 'Ready for Calculation';
  }

  function getRowIssueText(rowIndex: number) {
    const issues = getRowValidationIssues(rowIndex);
    const item = parsedActivities[rowIndex];
    if (item && isUntouchedDefaultParsedActivity(item)) return '-';
    const storedReviewLabel = item ? getStoredReviewLabel(item) : null;
    const primaryIssue = getPrimaryReviewIssue(issues);
    return primaryIssue
      ? getImportValidationIssueLabel(primaryIssue)
      : storedReviewLabel
      ? storedReviewLabel
      : '-';
  }

  function getRowIssueTitle(rowIndex: number) {
    const issues = getRowValidationIssues(rowIndex);
    const item = parsedActivities[rowIndex];
    const storedReviewDetail = item ? getStoredReviewDetail(item) : null;
    const primaryIssue = getPrimaryReviewIssue(issues);
    return primaryIssue
      ? getImportValidationIssueDetail(primaryIssue)
      : storedReviewDetail ?? undefined;
  }

  function getRowReportTreatment(rowIndex: number, item: EditableParsedActivity) {
    if (isUntouchedDefaultParsedActivity(item)) return '-';
    const classification = rowClassifications[rowIndex];
    if (classification === 'TRACKED_METRIC') return 'Tracked Metric';
    if (classification === 'READY') return 'Included in totals';
    return 'Not included in totals';
  }

  function getStoredReviewLabel(item: EditableParsedActivity) {
    if (isCanonicalReadyReviewRow(item)) return null;

    const signals = [
      item.status,
      item.matchingStatus,
      item.calculationStatus,
      item.reportTreatment,
    ].map(normalizeClassificationSignal);

    if (signals.some((signal) => ['UNIT_MISMATCH', 'INVALID_UNIT'].includes(signal))) {
      return 'Unit needs correction';
    }
    if (signals.some((signal) => ['MISSING_PROVINCE', 'MISSING_JURISDICTION'].includes(signal))) {
      return 'Province needed';
    }
    if (signals.some((signal) => signal === 'FACTOR_NOT_APPROVED')) return 'No approved factor';
    if (signals.some((signal) => signal === 'NO_FACTOR_FOUND')) return 'No applicable factor';
    if (signals.some((signal) => signal === 'MISSING_FACTOR')) return 'No applicable factor';
    if (signals.some((signal) => ['REQUIRES_REVIEW', 'NEEDS_REVIEW', 'EXCLUDED'].includes(signal))) {
      return 'Needs Review';
    }

    return null;
  }

  function getStoredReviewDetail(item: EditableParsedActivity) {
    const signals = [item.calculationStatus, item.matchingStatus, item.status]
      .map(normalizeClassificationSignal);
    const knownStatus = signals.find((signal) => formatCustomerStatusLabel(signal));
    if (knownStatus) {
      return getCustomerStatusMessage(knownStatus, {
        activityType: item.activityType.value,
        quantity: item.quantity.value,
      });
    }
    if (item.calculationMessage) return item.calculationMessage;
    if (getStoredReviewLabel(item) === 'Needs Review') return 'This row must be reviewed before import.';

    return null;
  }

  function getPrimaryReviewIssue(issues: ImportValidationIssue[]) {
    const fieldPriority: ImportValidationField[] = ['quantity', 'activityType', 'recordDate', 'unit', 'jurisdictionRegion'];
    return fieldPriority.map((field) => issues.find((issue) => issue.field === field)).find(Boolean) ?? issues[0];
  }

  function isUnsupportedPilotProvinceIssue(message?: string) {
    return message === UNSUPPORTED_PILOT_ELECTRICITY_PROVINCE_MESSAGE;
  }

  function getPreviewDatePeriod(item: EditableParsedActivity) {
    const startDate = item.recordDate.value ?? '';
    const endDate = item.periodEndDate ?? '';

    if (startDate && endDate && endDate !== startDate) {
      return `${startDate} to ${endDate}`;
    }

    return startDate;
  }

  function getConfidenceStyle(confidence: string): React.CSSProperties {
    if (confidence === 'low') {
      return {
        background: '#fff1f1',
        border: '1px solid #f5c2c7',
      };
    }

    if (confidence === 'medium') {
      return {
        background: '#fff8e6',
        border: '1px solid #f3d28b',
      };
    }

    return {
      background: '#f6fff7',
      border: '1px solid #b7e4c7',
    };
  }

  function getPreviewActivityTypeLabel(value?: string | null) {
    return getActivityTypeLabel(value);
  }

  function getUnsupportedActivityTypeDisplayLabel() {
    return 'Custom (Unsupported)';
  }

  function getConfirmImportDisabledReason() {
    if (!headerProps.canImportData) return headerProps.permissionDeniedReason ?? '';
    if (headerProps.confirmingId || headerProps.generatingMetrics) return undefined;
    if (headerProps.extractedRowCount === 0) return 'No importable records found.';
    if (selection.selectedParsedActivitiesCount === 0) {
      return selection.importableCount > 0
        ? 'Select at least one calculated record or tracked metric to import.'
        : 'No importable records found.';
    }
    if (headerProps.selectedImportableActivitiesCount === 0) {
      return 'Selected rows contain blocking errors. Select calculated rows or fix errors.';
    }

    return undefined;
  }

  function getImportSelectionSummary() {
    if (headerProps.extractedRowCount === 0) return '';

    const selectedParts = [];
    if (selection.selectedReadyImportableCount > 0) {
      selectedParts.push(
        `${selection.selectedReadyImportableCount} ready record${
          selection.selectedReadyImportableCount === 1 ? '' : 's'
        }`,
      );
    }
    if (selection.selectedTrackedImportableCount > 0) {
      selectedParts.push(
        `${selection.selectedTrackedImportableCount} tracked metric${
          selection.selectedTrackedImportableCount === 1 ? '' : 's'
        }`,
      );
    }

    if (headerProps.selectedImportableActivitiesCount > 0) {
      return `${selectedParts.join(' and ')} selected. ${selection.rowsLeftOutOfImportCount} row${
        selection.rowsLeftOutOfImportCount === 1 ? '' : 's'
      } will not be imported.`;
    }

    return getConfirmImportDisabledReason() ?? '';
  }

  return (
    <div style={{ ...sectionCardStyle, marginTop: 24 }}>
      <DraftReviewHeader confirmDisabledReason={getConfirmImportDisabledReason()} importSelectionSummary={getImportSelectionSummary()} {...headerProps} />
      {tableProps.parsedActivities.length === 0 ? (
        <div style={{ padding: 16 }}>No extracted activities.</div>
      ) : (
        <>
          {bulkProvinceProps.missingProvinceCount > 0 ? (
            <BulkProvinceHelper {...bulkProvinceProps} />
          ) : null}
          {hasImportValidationErrors ? (
            <ImportValidationSummary getImportValidationIssueLabel={getImportValidationIssueLabel} getImportValidationIssueDetail={getImportValidationIssueDetail} {...validationProps} />
          ) : null}
          <DetectedSourceItemsPanel {...detectedSourceItemsProps} />
          <DraftRecordsTable
            getRowStatusLabel={getRowStatusLabel}
            getRowIssueText={getRowIssueText}
            getRowIssueTitle={getRowIssueTitle}
            getRowReportTreatment={getRowReportTreatment}
            getPreviewActivityTypeLabel={getPreviewActivityTypeLabel}
            getUnsupportedActivityTypeDisplayLabel={getUnsupportedActivityTypeDisplayLabel}
            getImportValidationIssueDetail={getImportValidationIssueDetail}
            getFieldValidationDisplayMessage={getFieldValidationDisplayMessage}
            getConfidenceStyle={getConfidenceStyle}
            getPreviewDatePeriod={getPreviewDatePeriod}
            {...tableProps}
          />
        </>
      )}
    </div>
  );
}
