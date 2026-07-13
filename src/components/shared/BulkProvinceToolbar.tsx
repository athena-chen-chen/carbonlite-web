import type { CSSProperties } from 'react';
import { ProvinceSelect } from '../activity-record-form/ProvinceSelect';

export type BulkProvinceToolbarProps = {
  selectedCount: number;
  eligibleCount?: number;
  selectedProvince: string | null;
  onProvinceChange: (province: string) => void;
  onApply: () => void;
  isApplying?: boolean;
  disabled?: boolean;
  showEligibleCount?: boolean;
  label?: string;
  applyLabel?: string;
  helperText?: string;
  className?: string;
  provinceOptions?: string[];
};

export function BulkProvinceToolbar({
  selectedCount,
  eligibleCount,
  selectedProvince,
  onProvinceChange,
  onApply,
  isApplying = false,
  disabled = false,
  showEligibleCount = true,
  label = 'Set province for electricity records',
  applyLabel = 'Apply province',
  helperText,
  className,
  provinceOptions,
}: BulkProvinceToolbarProps) {
  const effectiveHelperText =
    helperText ??
    (eligibleCount === 0
      ? 'No selected electricity records need province.'
      : 'Apply a province to selected electricity records that need province-specific factor matching.');
  const applyDisabled =
    disabled ||
    isApplying ||
    selectedCount === 0 ||
    !selectedProvince ||
    eligibleCount === 0;

  return (
    <div className={className} style={toolbarStyle}>
      <div style={labelGroupStyle}>
        <span style={labelStyle}>{label}</span>
        <span style={helperTextStyle}>{effectiveHelperText}</span>
      </div>
      <ProvinceSelect
        value={selectedProvince}
        onChange={onProvinceChange}
        options={provinceOptions}
        ariaLabel="Province to apply to selected electricity records"
        showLabel={false}
        compact
      />
      <button
        type="button"
        onClick={onApply}
        disabled={applyDisabled}
        style={buttonStyle(!applyDisabled)}
      >
        {isApplying ? 'Applying...' : applyLabel}
      </button>
      <span style={countStyle}>{formatCountMessage(selectedCount, eligibleCount, showEligibleCount)}</span>
    </div>
  );
}

function formatCountMessage(
  selectedCount: number,
  eligibleCount?: number,
  showEligibleCount = true,
) {
  const selectedLabel = selectedCount === 0 ? 'No records selected' : `${selectedCount} selected`;

  if (showEligibleCount && eligibleCount !== undefined) {
    return `${selectedLabel} · ${eligibleCount} electricity records eligible`;
  }

  return selectedLabel;
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
};

const labelGroupStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  minWidth: 180,
  maxWidth: 360,
};

const labelStyle: CSSProperties = {
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 800,
};

const helperTextStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.25,
};

const countStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: 'nowrap',
};

function buttonStyle(enabled: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: enabled ? '1px solid #2563eb' : '1px solid #d1d5db',
    background: enabled ? '#2563eb' : '#f3f4f6',
    color: enabled ? '#fff' : '#6b7280',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
}
