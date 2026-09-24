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
  applyingLabel?: string;
  helperText?: string;
  disabledReason?: string | null;
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
  label = 'Set province for selected electricity records',
  applyLabel = 'Set province',
  applyingLabel = 'Applying...',
  helperText,
  disabledReason,
  className,
  provinceOptions,
}: BulkProvinceToolbarProps) {
  const effectiveHelperText =
    helperText ??
    disabledReason ??
    (eligibleCount === 0
      ? 'No selected electricity records.'
      : 'Apply a province to selected electricity records. Non-electricity records will be ignored.');
  const shouldShowDisabledReason = Boolean(
    disabledReason && disabledReason !== effectiveHelperText && selectedCount > 0,
  );
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
        {shouldShowDisabledReason ? <span style={disabledReasonStyle}>{disabledReason}</span> : null}
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
        title={applyDisabled ? disabledReason ?? undefined : undefined}
        style={buttonStyle(!applyDisabled)}
      >
        {isApplying ? applyingLabel : applyLabel}
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
  const selectedLabel =
    selectedCount === 0
      ? 'No records selected.'
      : `${selectedCount} record${selectedCount === 1 ? '' : 's'} selected`;

  if (showEligibleCount && eligibleCount !== undefined) {
    if (selectedCount === 0) {
      return selectedLabel;
    }

    return `${selectedLabel} · ${eligibleCount} electricity record${eligibleCount === 1 ? '' : 's'} selected.`;
  }

  return selectedLabel;
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #E2E8F0',
  background: '#F8FAFC',
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

const disabledReasonStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
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
    border: enabled ? '1px solid #047857' : '1px solid #E2E8F0',
    background: enabled ? '#047857' : '#F1F5F9',
    color: enabled ? '#fff' : '#6b7280',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  };
}
