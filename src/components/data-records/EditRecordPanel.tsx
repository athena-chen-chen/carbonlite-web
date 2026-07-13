import {
  ActivityRecordForm,
  type ActivityRecordField,
  type ActivityRecordFormValues,
} from '../activity-record-form/ActivityRecordForm';

type EditRecordPanelProps = {
  record: {
    id: string;
    activityType?: string | null;
    recordDate?: string | null;
  };
  draftValues: ActivityRecordFormValues;
  activityTypes: string[];
  provinceOptions: string[];
  validationMessages?: Record<string, string>;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onChange: (field: ActivityRecordField, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  normalizeProvince?: (value?: string | null) => string;
};

export function EditRecordPanel({
  record,
  draftValues,
  activityTypes,
  provinceOptions,
  validationMessages = {},
  selected,
  onSelectedChange,
  onChange,
  onSave,
  onCancel,
  onDelete,
  normalizeProvince,
}: EditRecordPanelProps) {
  const normalizedProvince =
    normalizeProvince?.(draftValues.jurisdictionRegion) ?? draftValues.jurisdictionRegion;

  return (
    <ActivityRecordForm
      values={{
        ...draftValues,
        jurisdictionRegion: normalizedProvince,
      }}
      activityTypes={activityTypes}
      provinceOptions={provinceOptions}
      fieldErrors={validationMessages}
      facilityField="facilityId"
      borderColor="#dbeafe"
      maxWidth={960}
      onChange={(field, value) => {
        if (field === 'jurisdictionRegion') {
          onChange(field, normalizeProvince?.(value) ?? value);
          return;
        }

        onChange(field, value);
      }}
      header={
        <label style={selectionLabelStyle}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select record ${record.activityType ?? 'activity'} ${record.recordDate?.slice(0, 10) ?? record.id}`}
            onChange={(event) => onSelectedChange(event.target.checked)}
          />
          <span style={editingBadgeStyle}>Editing</span>
        </label>
      }
      actions={
        <>
          <button type="button" onClick={onSave} style={primaryActionBtn}>
            Save
          </button>
          <button type="button" onClick={onCancel} style={secondaryActionBtn}>
            Cancel
          </button>
          {onDelete ? (
            <button type="button" onClick={onDelete} style={dangerActionBtn}>
              Delete
            </button>
          ) : null}
        </>
      }
    />
  );
}

const selectionLabelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const editingBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: '#0369a1',
  background: '#dbeafe',
  whiteSpace: 'nowrap',
};

const formActionButtonBaseStyle: React.CSSProperties = {
  minWidth: 88,
  minHeight: 38,
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};

const primaryActionBtn: React.CSSProperties = {
  ...formActionButtonBaseStyle,
  border: 'none',
  background: '#10b981',
  color: '#fff',
};

const secondaryActionBtn: React.CSSProperties = {
  ...formActionButtonBaseStyle,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
};

const dangerActionBtn: React.CSSProperties = {
  ...formActionButtonBaseStyle,
  border: '1px solid #fca5a5',
  background: '#fff1f2',
  color: '#be123c',
};
