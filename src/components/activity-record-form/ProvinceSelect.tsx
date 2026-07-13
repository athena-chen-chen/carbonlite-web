import type { CSSProperties } from 'react';
import {
  CANADIAN_PROVINCE_OPTIONS,
  normalizeProvince as normalizeProvinceValue,
} from '../../utils/province';

export type ProvinceSelectProps = {
  value?: string | null;
  onChange: (value: string) => void;
  country?: string | null;
  options?: string[];
  required?: boolean;
  disabled?: boolean;
  label?: string;
  showHelperText?: boolean;
  helperText?: string;
  error?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  showLabel?: boolean;
  helperId?: string;
};

export function normalizeProvince(value?: string | null) {
  return normalizeProvinceValue(value);
}

export function ProvinceSelect({
  value,
  onChange,
  country,
  options = CANADIAN_PROVINCE_OPTIONS,
  required = false,
  disabled = false,
  label = 'Province',
  showHelperText = false,
  helperText = 'Required for electricity.',
  error,
  placeholder = 'Select province',
  ariaLabel,
  className,
  compact = false,
  showLabel = true,
  helperId,
}: ProvinceSelectProps) {
  const normalizedValue = normalizeProvince(value) ?? '';
  const normalizedOptions = getProvinceOptions(options, normalizedValue);
  const descriptionId = showHelperText ? helperId : undefined;

  return (
    <label className={className} style={{ ...fieldStyle, ...provinceFieldStyle }}>
      {showLabel ? <span>{label}</span> : null}
      <select
        value={normalizedValue}
        onChange={(event) => onChange(normalizeProvince(event.target.value) ?? '')}
        aria-label={ariaLabel ?? (required ? 'Province required for electricity records' : 'Province')}
        aria-describedby={descriptionId}
        required={required}
        disabled={disabled}
        data-country={country ?? undefined}
        style={inputStyle(Boolean(error), compact)}
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((province) => (
          <option key={province} value={province}>
            {province}
          </option>
        ))}
      </select>
      {showHelperText ? (
        <span
          id={descriptionId}
          style={helperTextStyle}
          title="Province is required because electricity factors vary by province."
        >
          {helperText}
        </span>
      ) : null}
      {error ? <span style={errorTextStyle}>{error}</span> : null}
    </label>
  );
}

function getProvinceOptions(options: string[], currentValue: string) {
  const normalizedOptions = options
    .map((option) => normalizeProvince(option))
    .filter((option): option is string => Boolean(option));
  const uniqueOptions = Array.from(new Set(normalizedOptions));

  if (currentValue && !uniqueOptions.includes(currentValue)) {
    return [...uniqueOptions, currentValue];
  }

  return uniqueOptions;
}

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 5,
  color: '#334155',
  fontSize: 12,
  fontWeight: 800,
  maxWidth: '100%',
};

const provinceFieldStyle: CSSProperties = {
  flex: '0 0 min(100%, 180px)',
};

const inputStyle = (invalid = false, compact = false): CSSProperties => ({
  width: '100%',
  minWidth: compact ? 160 : 180,
  boxSizing: 'border-box',
  padding: compact ? '7px 9px' : '8px 10px',
  borderRadius: 8,
  border: invalid ? '1px solid #dc2626' : '1px solid #cbd5e1',
  background: invalid ? '#fff1f2' : '#fff',
});

const helperTextStyle: CSSProperties = {
  marginTop: 3,
  color: '#64748b',
  fontSize: 11,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

const errorTextStyle: CSSProperties = {
  color: '#dc2626',
  fontSize: 12,
};
