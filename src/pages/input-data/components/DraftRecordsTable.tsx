import type { CSSProperties } from 'react';
import type { EditableParsedActivity, ImportValidationField, ImportValidationIssue } from '../inputData.types';
import { activityTypes } from '../../../constants/activityTypes';
import { getParsedActivityRowKey } from '../domain/importIdentity';
import {
  issueTextStyle,
  mutedIssueStyle,
  includedTreatmentStyle,
  trackedTreatmentStyle,
  excludedTreatmentStyle,
  thStyle,
  tdStyle,
  selectedPreviewRowStyle,
  previewTableWrapStyle,
  previewScrollHintStyle,
  previewTableStyle,
  activityTypeThStyle,
  activityTypeTdStyle,
  previewTdStyle,
  previewFieldStackStyle,
  previewSelectColStyle,
  previewStatusColStyle,
  previewActivityTypeColStyle,
  previewDateColStyle,
  previewQuantityColStyle,
  previewUnitColStyle,
  previewCountryColStyle,
  previewProvinceColStyle,
  previewFacilityColStyle,
  previewSourceReferenceColStyle,
  previewIssueColStyle,
  previewTreatmentColStyle,
  previewNotesColStyle,
  previewActionsColStyle,
  activityTypeSelectStyle,
  validatedInputStyle,
  validationInputOverrideStyle,
  fieldErrorStyle,
  dateSuggestionStyle,
  datePeriodStyle,
  useSuggestionButtonStyle,
  rowStatusBadgeStyle,
  optionalInputStyle,
  deleteButtonStyle,
  dateWarningStyle,
} from '../../UploadPage.styles';

export type DraftRecordsTableProps = {
  parsedActivities: EditableParsedActivity[];
  getFieldValidationMessage: (rowIndex: number, field: ImportValidationField) => string | undefined;
  getRowStatusLabel: (rowIndex: number, item: EditableParsedActivity) => string;
  getRowIssueText: (rowIndex: number) => string;
  getRowIssueTitle: (rowIndex: number) => string | undefined;
  isParsedActivityImportable: (rowIndex: number, item: EditableParsedActivity) => boolean;
  isParsedActivityAlreadyImported: (item: EditableParsedActivity) => boolean;
  getRowReportTreatment: (rowIndex: number, item: EditableParsedActivity) => string;
  toggleParsedActivitySelected: (index: number, checked: boolean) => void;
  updateParsedActivityField: (index: number, field: keyof EditableParsedActivity, value: string) => void;
  removeParsedActivity: (index: number) => void;
  getPreviewActivityTypeLabel: (value?: string | null) => string;
  getUnsupportedActivityTypeDisplayLabel: () => string;
  getImportValidationIssueDetail: (issue: ImportValidationIssue) => string;
  getFieldValidationDisplayMessage: (field: ImportValidationField, message?: string) => string;
  getConfidenceStyle: (confidence: string) => CSSProperties;
  getPreviewDatePeriod: (item: EditableParsedActivity) => string;
  getRecordDateSuggestion: (item: EditableParsedActivity) => string;
};

export function DraftRecordsTable({
  parsedActivities,
  getFieldValidationMessage,
  getRowStatusLabel,
  getRowIssueText,
  getRowIssueTitle,
  isParsedActivityImportable,
  isParsedActivityAlreadyImported,
  getRowReportTreatment,
  toggleParsedActivitySelected,
  updateParsedActivityField,
  removeParsedActivity,
  getPreviewActivityTypeLabel,
  getUnsupportedActivityTypeDisplayLabel,
  getImportValidationIssueDetail,
  getFieldValidationDisplayMessage,
  getConfidenceStyle,
  getPreviewDatePeriod,
  getRecordDateSuggestion,
}: DraftRecordsTableProps) {
  return (
    <>
      <div style={previewScrollHintStyle}>Scroll horizontally to view all columns →</div>
      <div style={previewTableWrapStyle}>
      <table style={previewTableStyle}>
        <colgroup>
          <col style={previewSelectColStyle} />
          <col style={previewStatusColStyle} />
          <col style={previewActivityTypeColStyle} />
          <col style={previewDateColStyle} />
          <col style={previewQuantityColStyle} />
          <col style={previewUnitColStyle} />
          <col style={previewCountryColStyle} />
          <col style={previewProvinceColStyle} />
          <col style={previewFacilityColStyle} />
          <col style={previewSourceReferenceColStyle} />
          <col style={previewIssueColStyle} />
          <col style={previewTreatmentColStyle} />
          <col style={previewNotesColStyle} />
          <col style={previewActionsColStyle} />
        </colgroup>
        <thead>
          <tr style={{ background: '#fafafa' }}>
            <th style={thStyle}>Select</th>
            <th style={thStyle}>Status</th>
            <th style={activityTypeThStyle}>Activity Type</th>
            <th style={thStyle}>Record Date</th>
            <th style={thStyle}>Quantity</th>
            <th style={thStyle}>Unit</th>
            <th style={thStyle}>Country</th>
            <th style={thStyle}>Province</th>
            <th style={thStyle}>Site / Facility</th>
            <th style={thStyle}>Source Reference</th>
            <th style={thStyle}>Issue</th>
            <th style={thStyle}>Report Treatment</th>
            <th style={thStyle}>Notes</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {parsedActivities.map((item, index) => {
            const activityTypeError = getFieldValidationMessage(index, 'activityType');
            const recordDateError = getFieldValidationMessage(index, 'recordDate');
            const quantityError = getFieldValidationMessage(index, 'quantity');
            const unitError = getFieldValidationMessage(index, 'unit');
            const provinceError = getFieldValidationMessage(index, 'jurisdictionRegion');
            const rowStatusLabel = getRowStatusLabel(index, item);
            const rowIssueText = getRowIssueText(index);
            const rowIssueTitle = getRowIssueTitle(index);
            const rowIsImportable = isParsedActivityImportable(index, item);
            const rowAlreadyImported = isParsedActivityAlreadyImported(item);
            const rowReportTreatment = getRowReportTreatment(index, item);

            return (
            <tr
              key={getParsedActivityRowKey(item, index)}
              style={item.selected && rowIsImportable ? selectedPreviewRowStyle : undefined}
            >
              <td style={tdStyle}>
                <input
                  type="checkbox"
                  checked={item.selected && rowIsImportable}
                  disabled={!rowIsImportable}
                  aria-label={`Select preview row ${index + 1}`}
                  title={
                    rowAlreadyImported
                      ? 'This source row has already been imported.'
                      : !rowIsImportable
                      ? 'Fix validation issues before selecting this row.'
                      : undefined
                  }
                  onChange={(e) =>
                    toggleParsedActivitySelected(index, e.target.checked)
                  }
                />
              </td>

              <td style={previewTdStyle}>
                <span
                  style={rowStatusBadgeStyle(rowStatusLabel)}
                  title={
                    rowStatusLabel === 'Unsupported Activity'
                      ? 'Unsupported Activity Type'
                      : rowStatusLabel
                  }
                >
                  {rowStatusLabel}
                </span>
              </td>

              <td style={activityTypeTdStyle}>
                <div style={previewFieldStackStyle}>
                  <select
                    data-validation-field="activityType"
                    data-validation-row={index}
                    value={item.activityType.value ?? ''}
                    onChange={(e) =>
                      updateParsedActivityField(index, 'activityType', e.target.value)
                    }
                    style={validatedInputStyle(
                      activityTypeSelectStyle(item.activityType.confidence),
                      Boolean(activityTypeError),
                    )}
                    title={
                      item.activityType.value &&
                      !activityTypes.some(type => type === item.activityType.value)
                        ? `Unsupported activity type: ${item.activityType.value}`
                        : getPreviewActivityTypeLabel(item.activityType.value)
                    }
                  >
                    <option value="">-- Select --</option>
                    {item.activityType.value &&
                    !activityTypes.some(type => type === item.activityType.value) ? (
                      <option value={item.activityType.value}>
                        {getUnsupportedActivityTypeDisplayLabel()}
                      </option>
                    ) : null}
                    {activityTypes.map((type) => (
                      <option key={type} value={type}>
                        {getPreviewActivityTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                {activityTypeError ? (
                  <div style={fieldErrorStyle} title={getImportValidationIssueDetail({
                    rowIndex: index,
                    field: 'activityType',
                    message: activityTypeError,
                  })}>
                    {getFieldValidationDisplayMessage('activityType', activityTypeError)}
                  </div>
                ) : null}
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    data-validation-field="recordDate"
                    data-validation-row={index}
                    type="text"
                    value={item.recordDate.value ?? ''}
                    placeholder={item.dateEstimated ? 'Missing date' : 'YYYY-MM-DD'}
                    onChange={(e) =>
                      updateParsedActivityField(index, 'recordDate', e.target.value)
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 8,
                      borderRadius: 6,
                      ...getConfidenceStyle(item.recordDate.confidence),
                      ...(recordDateError ? validationInputOverrideStyle : {}),
                    }}
                  />
                  {item.periodEndDate ? (
                    <div style={datePeriodStyle}>{getPreviewDatePeriod(item)}</div>
                  ) : null}
                  {recordDateError ? (
                    <div style={fieldErrorStyle}>{recordDateError}</div>
                  ) : null}
                  {recordDateError ? (
                    <div style={dateSuggestionStyle}>
                      Suggested: {getRecordDateSuggestion(item)}
                      <button
                        type="button"
                        onClick={() =>
                          updateParsedActivityField(
                            index,
                            'recordDate',
                            getRecordDateSuggestion(item),
                          )
                        }
                        style={useSuggestionButtonStyle}
                      >
                        Use Suggestion
                      </button>
                    </div>
                  ) : null}
                  {item.dateEstimated ? (
                    <div style={dateWarningStyle}>
                      {item.recordDate.value
                        ? `Date estimated: ${item.recordDate.value}`
                        : 'Missing date'}
                    </div>
                  ) : null}
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    data-validation-field="quantity"
                    data-validation-row={index}
                    type="number"
                    min="0"
                    value={item.quantity.value ?? ''}
                    onChange={(e) =>
                      updateParsedActivityField(index, 'quantity', e.target.value)
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 8,
                      borderRadius: 6,
                      ...getConfidenceStyle(item.quantity.confidence),
                      ...(quantityError ? validationInputOverrideStyle : {}),
                    }}
                  />
                  {quantityError ? (
                    <div style={fieldErrorStyle}>{quantityError}</div>
                  ) : null}
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    data-validation-field="unit"
                    data-validation-row={index}
                    type="text"
                    value={item.unit.value ?? ''}
                    onChange={(e) =>
                      updateParsedActivityField(index, 'unit', e.target.value)
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 8,
                      borderRadius: 6,
                      ...getConfidenceStyle(item.unit.confidence),
                      ...(unitError ? validationInputOverrideStyle : {}),
                    }}
                  />
                  {unitError ? (
                    <div style={fieldErrorStyle}>{unitError}</div>
                  ) : null}
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    type="text"
                    value={item.jurisdictionCountry.value ?? ''}
                    placeholder="Canada"
                    onChange={(e) =>
                      updateParsedActivityField(index, 'jurisdictionCountry', e.target.value)
                    }
                    style={optionalInputStyle(
                      item.jurisdictionCountry.confidence,
                      item.jurisdictionCountry.value,
                      { neutralWhenPresent: true },
                    )}
                  />
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  {/* TODO: Consider ProvinceSelect here after preserving extraction confidence styling. */}
                  <input
                    data-validation-field="jurisdictionRegion"
                    data-validation-row={index}
                    type="text"
                    value={item.jurisdictionRegion.value ?? ''}
                    placeholder="Province"
                    onChange={(e) =>
                      updateParsedActivityField(index, 'jurisdictionRegion', e.target.value)
                    }
                    style={validatedInputStyle(
                      optionalInputStyle(
                        item.jurisdictionRegion.confidence,
                        item.jurisdictionRegion.value,
                        { neutralWhenPresent: true },
                      ),
                      Boolean(provinceError),
                    )}
                  />
                  {provinceError ? (
                    <div style={fieldErrorStyle} title={getRowIssueTitle(index)}>
                      {getFieldValidationDisplayMessage('jurisdictionRegion', provinceError)}
                    </div>
                  ) : null}
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    type="text"
                    value={item.facilityName.value ?? ''}
                    placeholder="Optional site or facility"
                    onChange={(e) =>
                      updateParsedActivityField(index, 'facilityName', e.target.value)
                    }
                    style={optionalInputStyle(
                      item.facilityName.confidence,
                      item.facilityName.value,
                      { neutralWhenPresent: true },
                    )}
                    title={item.facilityName.value ?? 'Optional site or facility'}
                  />
                </div>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    type="text"
                    value={item.sourceReference.value ?? ''}
                    placeholder={item.documentFileName}
                    onChange={(e) =>
                      updateParsedActivityField(index, 'sourceReference', e.target.value)
                    }
                    style={optionalInputStyle(
                      item.sourceReference.confidence,
                      item.sourceReference.value,
                      { neutralWhenPresent: true },
                    )}
                    title={item.sourceReference.value ?? item.documentFileName}
                  />
                </div>
              </td>

              <td style={previewTdStyle}>
                <span
                  style={rowIssueText === '-' ? mutedIssueStyle : issueTextStyle}
                  title={rowIssueTitle}
                >
                  {rowIssueText}
                </span>
              </td>

              <td style={previewTdStyle}>
                <span
                  style={
                    rowReportTreatment === 'Included in GHG Total'
                      ? includedTreatmentStyle
                      : rowReportTreatment === 'Tracked Metric'
                      ? trackedTreatmentStyle
                      : excludedTreatmentStyle
                  }
                >
                  {rowReportTreatment}
                </span>
              </td>

              <td style={previewTdStyle}>
                <div style={previewFieldStackStyle}>
                  <input
                    type="text"
                    value={item.notes.value ?? ''}
                    placeholder="Optional notes"
                    onChange={(e) =>
                      updateParsedActivityField(index, 'notes', e.target.value)
                    }
                    style={optionalInputStyle(item.notes.confidence, item.notes.value, {
                      neutralWhenPresent: true,
                    })}
                    title={item.notes.value ?? ''}
                  />
                </div>
              </td>

              <td style={previewTdStyle}>
                <button
                  type="button"
                  onClick={() => removeParsedActivity(index)}
                  style={deleteButtonStyle}
                >
                  Delete
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
