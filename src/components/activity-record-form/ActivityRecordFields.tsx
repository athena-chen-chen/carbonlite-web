import type { CSSProperties } from 'react';
import { ProvinceSelect } from './ProvinceSelect';
import type { ActivityRecordField, ActivityRecordFormValues } from './types';

export type SharedActivityRecordFieldProps = {
  values: ActivityRecordFormValues;
  onChange: (field: ActivityRecordField, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  compact?: boolean;
};

export type ActivityDetailsFieldsProps = SharedActivityRecordFieldProps & {
  activityTypeOptions: string[];
  unitOptions?: string[];
};

export type LocationSourceFieldsProps = SharedActivityRecordFieldProps & {
  provinceOptions: string[];
  facilityField?: 'facilityId' | 'facilityName';
  isElectricity?: boolean;
  showProvinceHelper?: boolean;
  showProvinceLabel?: boolean;
  includeNotes?: boolean;
  helperId?: string;
};

export function ActivityDetailsFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  compact = false,
  activityTypeOptions,
  unitOptions,
}: ActivityDetailsFieldsProps) {
  return (
    <div>
      <div style={sectionLabelStyle}>Activity details</div>
      <div style={fieldRowStyle}>
        <label style={{ ...fieldStyle, ...activityTypeFieldStyle }}>
          <span>Activity Type</span>
          <select
            value={values.activityType ?? ''}
            onChange={(event) => onChange('activityType', event.target.value)}
            disabled={disabled}
            style={inputStyle(Boolean(errors.activityType), compact)}
          >
            <option value="">Select type</option>
            {activityTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.activityType ? <span style={errorTextStyle}>{errors.activityType}</span> : null}
        </label>

        <label style={{ ...fieldStyle, ...quantityFieldStyle }}>
          <span>Quantity</span>
          <input
            type="number"
            value={values.quantity ?? ''}
            onChange={(event) => onChange('quantity', event.target.value)}
            disabled={disabled}
            placeholder="Quantity"
            style={inputStyle(Boolean(errors.quantity), compact)}
          />
          {errors.quantity ? <span style={errorTextStyle}>{errors.quantity}</span> : null}
        </label>

        <label style={{ ...fieldStyle, ...unitFieldStyle }}>
          <span>Unit</span>
          {unitOptions?.length ? (
            <select
              value={values.unit ?? ''}
              onChange={(event) => onChange('unit', event.target.value)}
              disabled={disabled}
              style={inputStyle(Boolean(errors.unit), compact)}
            >
              <option value="">Select unit</option>
              {unitOptions.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={values.unit ?? ''}
              onChange={(event) => onChange('unit', event.target.value)}
              disabled={disabled}
              placeholder="Unit"
              style={inputStyle(Boolean(errors.unit), compact)}
            />
          )}
          {errors.unit ? <span style={errorTextStyle}>{errors.unit}</span> : null}
        </label>

        <label style={{ ...fieldStyle, ...dateFieldStyle }}>
          <span>Date</span>
          <input
            type="date"
            value={values.recordDate ?? ''}
            onChange={(event) => onChange('recordDate', event.target.value)}
            disabled={disabled}
            style={inputStyle(Boolean(errors.recordDate), compact)}
          />
          {errors.recordDate ? <span style={errorTextStyle}>{errors.recordDate}</span> : null}
        </label>
      </div>
    </div>
  );
}

export function LocationSourceFields({
  values,
  onChange,
  errors = {},
  disabled = false,
  compact = false,
  provinceOptions,
  facilityField = 'facilityId',
  isElectricity = false,
  showProvinceHelper = isElectricity,
  showProvinceLabel = true,
  includeNotes = true,
  helperId,
}: LocationSourceFieldsProps) {
  return (
    <div>
      <div style={sectionLabelStyle}>Location and source</div>
      <div style={fieldRowStyle}>
        <label style={{ ...fieldStyle, ...countryFieldStyle }}>
          <span>Country</span>
          <input
            value={values.jurisdictionCountry ?? ''}
            onChange={(event) => onChange('jurisdictionCountry', event.target.value)}
            disabled={disabled}
            placeholder="Canada"
            style={inputStyle(Boolean(errors.jurisdictionCountry), compact)}
          />
          {errors.jurisdictionCountry ? (
            <span style={errorTextStyle}>{errors.jurisdictionCountry}</span>
          ) : null}
        </label>

        <ProvinceSelect
          value={values.jurisdictionRegion}
          onChange={(value) => onChange('jurisdictionRegion', value)}
          country={values.jurisdictionCountry}
          options={provinceOptions}
          required={isElectricity}
          disabled={disabled}
          showHelperText={showProvinceHelper}
          error={errors.jurisdictionRegion}
          compact={compact}
          showLabel={showProvinceLabel}
          helperId={helperId}
        />

        <label style={{ ...fieldStyle, ...facilityFieldStyle }}>
          <span>Facility</span>
          <input
            value={(facilityField === 'facilityName' ? values.facilityName : values.facilityId) ?? ''}
            onChange={(event) => onChange(facilityField, event.target.value)}
            disabled={disabled}
            placeholder="Facility"
            style={inputStyle(Boolean(errors[facilityField]), compact)}
          />
          {errors[facilityField] ? <span style={errorTextStyle}>{errors[facilityField]}</span> : null}
        </label>

        <label style={{ ...fieldStyle, ...sourceReferenceFieldStyle }}>
          <span>Source Reference</span>
          <input
            value={values.sourceReference ?? ''}
            onChange={(event) => onChange('sourceReference', event.target.value)}
            disabled={disabled}
            placeholder="Source reference"
            style={inputStyle(Boolean(errors.sourceReference), compact)}
          />
          {errors.sourceReference ? <span style={errorTextStyle}>{errors.sourceReference}</span> : null}
        </label>

        {includeNotes ? (
          <label style={{ ...fieldStyle, ...notesFieldStyle }}>
            <span>Notes</span>
            <textarea
              value={values.notes ?? ''}
              onChange={(event) => onChange('notes', event.target.value)}
              disabled={disabled}
              placeholder="Optional notes"
              style={{
                ...inputStyle(Boolean(errors.notes), compact),
                minHeight: 72,
                resize: 'vertical',
              }}
            />
            {errors.notes ? <span style={errorTextStyle}>{errors.notes}</span> : null}
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function ActivityRecordFields({
  activityTypeOptions,
  provinceOptions,
  ...props
}: ActivityDetailsFieldsProps & Omit<LocationSourceFieldsProps, keyof SharedActivityRecordFieldProps>) {
  const isElectricity =
    props.isElectricity ?? String(props.values.activityType ?? '').toUpperCase() === 'ELECTRICITY';

  return (
    <>
      <ActivityDetailsFields
        {...props}
        activityTypeOptions={activityTypeOptions}
      />
      <LocationSourceFields
        {...props}
        provinceOptions={provinceOptions}
        isElectricity={isElectricity}
      />
    </>
  );
}

const sectionLabelStyle: CSSProperties = {
  marginBottom: 8,
  color: '#475569',
  fontSize: 12,
  fontWeight: 800,
};

const fieldRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'start',
  gap: 12,
  flexWrap: 'wrap',
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  color: '#334155',
  fontSize: 12,
  fontWeight: 800,
  maxWidth: '100%',
};

const activityTypeFieldStyle: CSSProperties = { flex: '0 0 min(100%, 200px)' };
const quantityFieldStyle: CSSProperties = { flex: '0 0 min(100%, 130px)' };
const unitFieldStyle: CSSProperties = { flex: '0 0 min(100%, 110px)' };
const dateFieldStyle: CSSProperties = { flex: '0 0 min(100%, 160px)' };
const countryFieldStyle: CSSProperties = { flex: '0 0 min(100%, 140px)' };
const facilityFieldStyle: CSSProperties = { flex: '0 0 min(100%, 200px)' };
const sourceReferenceFieldStyle: CSSProperties = { flex: '0 0 min(100%, 240px)' };

const notesFieldStyle: CSSProperties = {
  flex: '0 1 min(100%, 900px)',
  width: '100%',
  maxWidth: 900,
};

const inputStyle = (invalid = false, compact = false): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  padding: compact ? '7px 9px' : '8px 10px',
  borderRadius: 8,
  border: invalid ? '1px solid #dc2626' : '1px solid #cbd5e1',
  background: invalid ? '#fff1f2' : '#fff',
});

const errorTextStyle: CSSProperties = {
  color: '#dc2626',
  fontSize: 12,
};
