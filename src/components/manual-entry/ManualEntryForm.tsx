import type { CSSProperties, ReactNode } from 'react';
import {
  ActivityRecordForm,
  type ActivityRecordField,
  type ActivityRecordFormValues,
} from '../activity-record-form/ActivityRecordForm';

export type ManualEntryField = ActivityRecordField;

export type ManualEntryFormRow = ActivityRecordFormValues & {
  id: string;
  errors?: string[];
  status?: 'draft' | 'saved' | 'error' | 'saving';
};

type ManualEntryFormProps = {
  values: ManualEntryFormRow;
  rowNumber: number;
  title?: string;
  description?: string;
  activityTypes: string[];
  provinceOptions: string[];
  hasErrors?: boolean;
  review?: ReactNode;
  onChange: (field: ManualEntryField, value: string) => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel: string;
  canRemove?: boolean;
  removeLabel?: string;
  removeAriaLabel?: string;
  onRemove?: () => void;
  savedActions?: ReactNode;
};

export function ManualEntryForm({
  values,
  rowNumber,
  title,
  description,
  activityTypes,
  provinceOptions,
  hasErrors = false,
  review,
  onChange,
  onSave,
  saveDisabled = false,
  saveLabel,
  canRemove = false,
  removeLabel = 'Clear Draft',
  removeAriaLabel,
  onRemove,
  savedActions,
}: ManualEntryFormProps) {
  return (
    <div
      role="group"
      aria-label={`Activity row ${rowNumber}`}
      style={{
        ...manualEntryFormShellStyle,
        background: hasErrors ? '#fff1f2' : '#f8fafc',
      }}
    >
      {title || description ? (
        <div style={formHeaderStyle}>
          {title ? <strong>{title}</strong> : null}
          {description ? <span>{description}</span> : null}
        </div>
      ) : null}
      <ActivityRecordForm
        values={values}
        activityTypes={activityTypes}
        provinceOptions={provinceOptions}
        facilityField="facilityName"
        helperId={`province-helper-${values.id}`}
        maxWidth={960}
        onChange={onChange}
        review={review}
        actions={
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={saveDisabled}
              aria-label={`Save row ${rowNumber}`}
              style={rowSaveButtonStyle(saveDisabled, values.status === 'saved')}
            >
              {saveLabel}
            </button>
            {canRemove && onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={removeAriaLabel ?? `Clear draft row ${rowNumber}`}
                style={removeButtonStyle}
              >
                {removeLabel}
              </button>
            ) : null}
            {savedActions}
          </>
        }
      />
    </div>
  );
}

const manualEntryFormShellStyle = {
  display: 'grid',
  gap: 12,
  padding: 10,
  borderBottom: '1px solid #e2e8f0',
};

const formHeaderStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  color: '#334155',
  fontSize: 13,
  lineHeight: 1.4,
};

function rowSaveButtonStyle(disabled = false, saved = false): CSSProperties {
  if (saved) {
    return {
      padding: '8px 14px',
      borderRadius: 8,
      border: '1px solid #86efac',
      background: '#dcfce7',
      color: '#166534',
      fontWeight: 700,
      cursor: 'default',
    };
  }

  return {
    padding: '8px 14px',
    borderRadius: 8,
    border: disabled ? '1px solid #d1d5db' : '1px solid #10b981',
    background: disabled ? '#f3f4f6' : '#10b981',
    color: disabled ? '#6b7280' : '#fff',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const removeButtonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fff',
  color: '#b91c1c',
  fontWeight: 700,
  cursor: 'pointer',
};
