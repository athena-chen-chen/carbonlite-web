import type { CSSProperties } from 'react';

type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';
type BadgeVariant = 'solid' | 'soft' | 'outline';

type BadgeDisplay = {
  label: string;
  tone: BadgeTone;
  description?: string;
};

export type StatusBadgeProps = {
  status: string | null | undefined;
  label?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
  showTooltip?: boolean;
  className?: string;
  title?: string;
};

export type IssueBadgeProps = {
  issueType: string | null | undefined;
  label?: string;
  size?: BadgeSize;
  variant?: BadgeVariant;
  showTooltip?: boolean;
  className?: string;
  title?: string;
};

export const STATUS_DISPLAY_MAP: Record<string, BadgeDisplay> = {
  READY: { label: 'Ready', tone: 'success' },
  MATCHED: { label: 'Matched', tone: 'success' },
  CALCULATED: { label: 'Calculated', tone: 'success' },
  INCLUDED: { label: 'Included', tone: 'success' },
  REQUIRES_REVIEW: { label: 'Requires Review', tone: 'warning' },
  NEEDS_REVIEW: { label: 'Requires Review', tone: 'warning' },
  MISSING_PROVINCE: { label: 'Missing Province', tone: 'warning' },
  MISSING_JURISDICTION: { label: 'Missing Province', tone: 'warning' },
  MISSING_FACTOR: { label: 'Missing Factor', tone: 'warning' },
  INVALID_UNIT: { label: 'Invalid Unit', tone: 'danger' },
  UNIT_MISMATCH: { label: 'Unit Mismatch', tone: 'danger' },
  MISSING_UNIT: { label: 'Missing Unit', tone: 'danger' },
  NOT_EMISSIONS_FACTOR_REQUIRED: { label: 'Not Emissions Factor Required', tone: 'info' },
  TRACKED_ONLY: { label: 'Tracked Only', tone: 'info' },
  TRACKED_METRIC: { label: 'Tracked Metric', tone: 'info' },
  EXCLUDED: { label: 'Excluded', tone: 'warning' },
  SKIPPED: { label: 'Skipped', tone: 'neutral' },
  ERROR: { label: 'Error', tone: 'danger' },
  PLACEHOLDER: { label: 'Placeholder', tone: 'warning' },
  INTERNAL_REVIEW_REQUIRED: { label: 'Internal Review Required', tone: 'warning' },
  UNKNOWN: { label: 'Unknown', tone: 'neutral' },
};

export const ISSUE_DISPLAY_MAP: Record<string, BadgeDisplay> = {
  MISSING_PROVINCE: {
    label: 'Missing Province',
    tone: 'warning',
    description: 'Province is required before this record can be calculated.',
  },
  MISSING_JURISDICTION: {
    label: 'Missing Province',
    tone: 'warning',
    description: 'Province is required before this record can be calculated.',
  },
  MISSING_FACTOR: {
    label: 'Missing Factor',
    tone: 'warning',
    description: 'No matching conversion factor was found.',
  },
  INVALID_UNIT: {
    label: 'Invalid Unit',
    tone: 'danger',
    description: 'The unit could not be normalized or matched.',
  },
  MISSING_UNIT: {
    label: 'Missing Unit',
    tone: 'danger',
    description: 'Unit is required before this record can be calculated.',
  },
  TRACKED_ONLY: {
    label: 'Tracked Metric',
    tone: 'info',
    description: 'This record is tracked but not included in emissions totals.',
  },
  TRACKED_METRIC: {
    label: 'Tracked Metric',
    tone: 'info',
    description: 'This record is tracked but not included in emissions totals.',
  },
  MISSING_DATA: {
    label: 'Missing Data',
    tone: 'danger',
    description: 'Required data is missing.',
  },
  ERROR: {
    label: 'Error',
    tone: 'danger',
    description: 'This record could not be processed.',
  },
  UNKNOWN: {
    label: 'Unknown Issue',
    tone: 'neutral',
    description: 'This record needs review.',
  },
};

export function StatusBadge({
  status,
  label,
  size = 'sm',
  variant = 'soft',
  showTooltip = false,
  className,
  title,
}: StatusBadgeProps) {
  const display = getBadgeDisplay(status, STATUS_DISPLAY_MAP, STATUS_DISPLAY_MAP.UNKNOWN);

  return (
    <span
      className={className}
      style={badgeStyle(display.tone, size, variant)}
      title={title ?? (showTooltip ? display.description : undefined)}
    >
      {label ?? display.label}
    </span>
  );
}

export function IssueBadge({
  issueType,
  label,
  size = 'sm',
  variant = 'soft',
  showTooltip = false,
  className,
  title,
}: IssueBadgeProps) {
  const display = getBadgeDisplay(issueType, ISSUE_DISPLAY_MAP, ISSUE_DISPLAY_MAP.UNKNOWN);

  return (
    <span
      className={className}
      style={badgeStyle(display.tone, size, variant)}
      title={title ?? (showTooltip ? display.description : undefined)}
    >
      {label ?? display.label}
    </span>
  );
}

function getBadgeDisplay(
  value: string | null | undefined,
  map: Record<string, BadgeDisplay>,
  fallback: BadgeDisplay,
) {
  const normalized = normalizeBadgeKey(value);
  if (!normalized) return fallback;

  return map[normalized] ?? {
    label: toTitleCase(normalized),
    tone: fallback.tone,
  };
}

function normalizeBadgeKey(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toUpperCase();
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function badgeStyle(tone: BadgeTone, size: BadgeSize, variant: BadgeVariant): CSSProperties {
  const palette = {
    success: { color: '#047857', background: '#d1fae5', border: '#bbf7d0' },
    warning: { color: '#92400e', background: '#fef3c7', border: '#fde68a' },
    danger: { color: '#be123c', background: '#fff1f2', border: '#fecdd3' },
    info: { color: '#0369a1', background: '#dbeafe', border: '#bfdbfe' },
    neutral: { color: '#475569', background: '#f1f5f9', border: '#e2e8f0' },
  }[tone];
  const isSolid = variant === 'solid';
  const isOutline = variant === 'outline';

  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: 999,
    padding: size === 'md' ? '4px 10px' : '3px 8px',
    fontSize: size === 'md' ? 13 : 12,
    fontWeight: 700,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    color: isSolid ? '#fff' : palette.color,
    background: isSolid ? palette.color : isOutline ? '#fff' : palette.background,
    border: isOutline ? `1px solid ${palette.border}` : '1px solid transparent',
  };
}
