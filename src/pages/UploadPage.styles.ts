import type { CSSProperties } from 'react';

export const inputReviewPalette = {
  primaryGreen: '#047857',
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  mutedText: '#94A3B8',
  border: '#E2E8F0',
  subtleBorder: '#F1F5F9',
  white: '#FFFFFF',
  subtleBackground: '#F8FAFC',
  disabledBackground: '#F1F5F9',
  successBackground: '#ECFDF5',
  warningBackground: '#FFFBEB',
  warningText: '#B45309',
  errorBackground: '#FEF2F2',
  errorText: '#B91C1C',
  infoText: '#475569',
};

export const readOnlyNoticeStyle: CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.5,
};

export const sampleBannerStyle: CSSProperties = {
  marginBottom: 24,
  padding: 16,
  borderRadius: 12,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.subtleBackground,
  color: inputReviewPalette.primaryText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
};

export const dataHandlingNoticeStyle: CSSProperties = {
  ...sampleBannerStyle,
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: 8,
  marginBottom: 20,
  flexDirection: 'column',
  fontSize: 13,
  lineHeight: 1.5,
};

export const methodTabsStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  marginBottom: 20,
};

export function methodTabStyle(active: boolean): CSSProperties {
  return {
    display: 'grid',
    gap: 6,
    textAlign: 'left',
    padding: 16,
    borderRadius: 8,
    border: active ? `2px solid ${inputReviewPalette.primaryGreen}` : `1px solid ${inputReviewPalette.border}`,
    background: active ? inputReviewPalette.successBackground : inputReviewPalette.white,
    color: inputReviewPalette.primaryText,
    cursor: 'pointer',
    boxShadow: active ? '0 8px 20px rgba(16, 185, 129, 0.12)' : 'none',
  };
}

export const templateActionRowStyle: CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  marginBottom: 16,
};

export const uploadCardStyle: CSSProperties = {
  border: `1px solid ${inputReviewPalette.border}`,
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
  background: inputReviewPalette.white,
};

export const sectionCardStyle: CSSProperties = {
  border: `1px solid ${inputReviewPalette.border}`,
  borderRadius: 12,
  background: inputReviewPalette.white,
  overflow: 'visible',
};

export const fileInfoStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: inputReviewPalette.subtleBackground,
  border: `1px solid ${inputReviewPalette.border}`,
};

export const selectedFileListStyle: CSSProperties = {
  margin: '8px 0 0',
  paddingLeft: 20,
  color: '#475569',
  lineHeight: 1.7,
};

export const uploadWorkflowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.subtleBackground,
};

export const uploadWorkflowStepStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: '#334155',
  fontSize: 14,
  fontWeight: 600,
};

export const uploadWorkflowNumberStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: '50%',
  background: inputReviewPalette.successBackground,
  color: inputReviewPalette.primaryGreen,
  fontSize: 12,
  fontWeight: 800,
  flex: '0 0 auto',
};

export const uploadActionStackStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  justifyItems: 'start',
};

const sampleCsvRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  fontSize: 14,
};

export const issueTextStyle: CSSProperties = {
  display: '-webkit-box',
  maxWidth: '100%',
  overflow: 'hidden',
  color: '#92400e',
  fontSize: 12,
  lineHeight: 1.4,
  fontWeight: 700,
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflowWrap: 'anywhere',
};

export const mutedIssueStyle: CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: '#94a3b8',
  fontSize: 12,
};

export const includedTreatmentStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: inputReviewPalette.primaryGreen,
  background: inputReviewPalette.successBackground,
};

export const trackedTreatmentStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: inputReviewPalette.infoText,
  background: inputReviewPalette.subtleBackground,
};

export const excludedTreatmentStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'nowrap',
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 700,
  color: inputReviewPalette.errorText,
  background: inputReviewPalette.errorBackground,
};

function linkButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: 0,
    background: 'transparent',
    color: disabled ? '#94a3b8' : '#047857',
    padding: 0,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
  };
}

export const uploadDropzoneStyle = (
  isDragging: boolean,
  isProcessing: boolean,
): CSSProperties => ({
  display: 'grid',
  gap: 6,
  padding: 18,
  borderRadius: 12,
  border: `2px dashed ${isDragging ? inputReviewPalette.primaryGreen : inputReviewPalette.border}`,
  background: isDragging ? inputReviewPalette.successBackground : inputReviewPalette.subtleBackground,
  color: isProcessing ? inputReviewPalette.mutedText : inputReviewPalette.primaryText,
  cursor: isProcessing ? 'not-allowed' : 'pointer',
  opacity: isProcessing ? 0.72 : 1,
  transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease',
});

const nativeFileInputStyle: CSSProperties = {
  width: '100%',
  maxWidth: 360,
};

export const documentToggleRowStyle: CSSProperties = {
  margin: '14px 0 16px',
  display: 'flex',
  alignItems: 'center',
};

export const successStyle: CSSProperties = {
  position: 'sticky',
  top: 88,
  zIndex: 5,
  marginTop: 12,
  marginBottom: 16,
  padding: 14,
  borderRadius: 10,
  border: '1px solid #BBF7D0',
  background: inputReviewPalette.successBackground,
  color: inputReviewPalette.primaryGreen,
};

export const successLinkStyle: CSSProperties = {
  color: '#047857',
  fontWeight: 600,
  cursor: 'pointer',
};

export const errorStyle: CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  border: '1px solid #FDE68A',
  background: inputReviewPalette.warningBackground,
  color: inputReviewPalette.warningText,
};

export const emptyStateStyle: CSSProperties = {
  padding: 24,
  background: '#f8fafc',
  color: '#0f172a',
};

export const previewHeaderStyle: CSSProperties = {
  padding: 16,
  borderBottom: `1px solid ${inputReviewPalette.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

export const importReviewCountsStyle: CSSProperties = {
  marginTop: 8,
  color: '#475569',
  fontSize: 13,
  fontWeight: 700,
};

export const importSelectionHelpStyle: CSSProperties = {
  flexBasis: '100%',
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.4,
  maxWidth: 520,
};

export const detectedSourceItemsPanelStyle: CSSProperties = {
  margin: '0 16px 16px',
  padding: 14,
  border: '1px solid #bfdbfe',
  borderRadius: 8,
  background: '#eff6ff',
};

export const detectedSourceItemsHeadingStyle: CSSProperties = {
  margin: '0 0 10px',
  fontSize: 15,
  color: '#1e3a8a',
};

export const detectedSourceItemsGridStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
};

export const detectedSourceItemStyle: CSSProperties = {
  padding: 12,
  borderRadius: 8,
  border: '1px solid #dbeafe',
  background: '#fff',
  display: 'grid',
  gap: 6,
};

export const detectedSourceItemHeaderStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  alignItems: 'center',
  color: '#0f172a',
};

export const detectedSourceItemBadgeStyle: CSSProperties = {
  borderRadius: 999,
  padding: '3px 8px',
  fontSize: 12,
  fontWeight: 800,
  color: '#1e40af',
  background: '#dbeafe',
  whiteSpace: 'nowrap',
};

export const detectedSourceItemMetaStyle: CSSProperties = {
  color: '#334155',
  fontSize: 13,
  lineHeight: 1.45,
};

export const detectedSourceItemReasonStyle: CSSProperties = {
  color: '#7c2d12',
  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.45,
};

export const detectedSourceItemHelpStyle: CSSProperties = {
  color: '#475569',
  fontSize: 12,
  lineHeight: 1.45,
};

export const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '10px 8px',
  borderBottom: `1px solid ${inputReviewPalette.border}`,
  boxSizing: 'border-box',
  color: inputReviewPalette.infoText,
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: 'nowrap',
  background: inputReviewPalette.subtleBackground,
};

export const tdStyle: CSSProperties = {
  padding: 8,
  borderBottom: `1px solid ${inputReviewPalette.subtleBorder}`,
  boxSizing: 'border-box',
  verticalAlign: 'top',
  minWidth: 0,
  maxWidth: 0,
};

export const selectedPreviewRowStyle: CSSProperties = {
  background: '#F0FDF4',
};

export const inputReviewTableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  maxWidth: '100%',
  width: '100%',
  WebkitOverflowScrolling: 'touch',
};

export const inputReviewTableStyle: CSSProperties = {
  width: '100%',
  minWidth: 1040,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

export const inputReviewSelectColStyle: CSSProperties = { width: 52 };

export const inputReviewFileNameColStyle: CSSProperties = { width: 'auto' };

export const inputReviewTypeColStyle: CSSProperties = { width: 156 };

export const inputReviewStatusColStyle: CSSProperties = { width: 156 };

export const inputReviewSizeColStyle: CSSProperties = { width: 96 };

export const inputReviewCreatedAtColStyle: CSSProperties = { width: 160 };

export const inputReviewActionsColStyle: CSSProperties = { width: 236 };

export const inputReviewFileNameTdStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const inputReviewTypeTdStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: 'none',
  paddingRight: 20,
  whiteSpace: 'nowrap',
};

export const inputReviewStatusTdStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: 'none',
  paddingLeft: 14,
  paddingRight: 14,
  whiteSpace: 'nowrap',
};

export const inputReviewCreatedAtTdStyle: CSSProperties = {
  ...tdStyle,
  maxWidth: 'none',
  whiteSpace: 'nowrap',
};

export const previewTableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  width: '100%',
  maxWidth: '100%',
  WebkitOverflowScrolling: 'touch',
};

export const previewScrollHintStyle: CSSProperties = {
  margin: '0 16px 6px',
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'right',
  cursor: 'default',
  userSelect: 'none',
};

export const previewTableStyle: CSSProperties = {
  width: '100%',
  minWidth: 2720,
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

export const activityTypeThStyle: CSSProperties = {
  ...thStyle,
};

export const activityTypeTdStyle: CSSProperties = {
  ...tdStyle,
  padding: '10px 12px',
  maxWidth: 'none',
  overflow: 'visible',
};

export const previewTdStyle: CSSProperties = {
  ...tdStyle,
  padding: '10px 12px',
  maxWidth: 'none',
  overflow: 'visible',
};

export const previewFieldStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  minWidth: 0,
};

export const previewSelectColStyle: CSSProperties = { width: 48 };

export const previewStatusColStyle: CSSProperties = { width: 220 };

export const previewActivityTypeColStyle: CSSProperties = { width: 280 };

export const previewDateColStyle: CSSProperties = { width: 220 };

export const previewQuantityColStyle: CSSProperties = { width: 160 };

export const previewUnitColStyle: CSSProperties = { width: 160 };

export const previewCountryColStyle: CSSProperties = { width: 180 };

export const previewProvinceColStyle: CSSProperties = { width: 220 };

export const previewFacilityColStyle: CSSProperties = { width: 220 };

export const previewSourceReferenceColStyle: CSSProperties = { width: 260 };

export const previewIssueColStyle: CSSProperties = { width: 220 };

export const previewTreatmentColStyle: CSSProperties = { width: 160 };

export const previewNotesColStyle: CSSProperties = { width: 260 };

export const previewActionsColStyle: CSSProperties = { width: 112 };

export function activityTypeSelectStyle(confidence: string): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 30px 8px 8px',
    borderRadius: 6,
    ...getPreviewConfidenceStyle(confidence),
  };
}

export function validatedInputStyle(
  baseStyle: CSSProperties,
  hasError: boolean,
): CSSProperties {
  return {
    ...baseStyle,
    ...(hasError ? validationInputOverrideStyle : {}),
  };
}

function getPreviewConfidenceStyle(confidence: string): CSSProperties {
  if (confidence === 'low') {
    return {
      background: inputReviewPalette.errorBackground,
      border: '1px solid #FECACA',
    };
  }

  if (confidence === 'medium') {
    return {
      background: inputReviewPalette.warningBackground,
      border: '1px solid #FDE68A',
    };
  }

  return {
    background: inputReviewPalette.white,
    border: `1px solid ${inputReviewPalette.border}`,
  };
}

export const validationInputOverrideStyle: CSSProperties = {
  background: inputReviewPalette.errorBackground,
  border: `1px solid ${inputReviewPalette.errorText}`,
};

export const fieldErrorStyle: CSSProperties = {
  color: '#b91c1c',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.35,
  overflowWrap: 'anywhere',
  whiteSpace: 'normal',
};

export const validationSummaryStyle: CSSProperties = {
  margin: '0 16px 14px',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #FECACA',
  background: inputReviewPalette.errorBackground,
  color: inputReviewPalette.errorText,
  fontSize: 14,
};

export const bulkProvincePanelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'end',
  gap: 12,
  flexWrap: 'wrap',
  margin: '0 16px 14px',
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.subtleBackground,
};

export const bulkProvinceHelpTextStyle: CSSProperties = {
  margin: '4px 0 0',
  color: '#475569',
  fontSize: 13,
  lineHeight: 1.4,
};

export const bulkProvinceControlStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  minWidth: 220,
};

export const bulkProvinceLabelStyle: CSSProperties = {
  color: '#334155',
  fontSize: 12,
  fontWeight: 700,
};

export const bulkProvinceSelectStyle: CSSProperties = {
  padding: '9px 10px',
  borderRadius: 8,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.white,
};

export const dateSuggestionStyle: CSSProperties = {
  marginTop: 6,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
  color: '#475569',
  fontSize: 12,
};

export const datePeriodStyle: CSSProperties = {
  color: '#475569',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
  overflowWrap: 'anywhere',
};

export const useSuggestionButtonStyle: CSSProperties = {
  padding: '3px 7px',
  borderRadius: 6,
  border: '1px solid #86efac',
  background: '#f0fdf4',
  color: '#047857',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

export function rowStatusBadgeStyle(status: string): CSSProperties {
  const isReady = status === 'Calculated' || status === 'Ready for Calculation';
  const isTrackedMetric = status === 'Tracked Metric';
  const isReview = ['Needs Review', 'Missing Province', 'Missing Factor'].includes(status);

  return {
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 700,
    color: isReady
      ? inputReviewPalette.primaryGreen
      : isTrackedMetric
      ? inputReviewPalette.infoText
      : isReview
      ? inputReviewPalette.warningText
      : inputReviewPalette.errorText,
    background: isReady
      ? inputReviewPalette.successBackground
      : isTrackedMetric
      ? inputReviewPalette.subtleBackground
      : isReview
      ? inputReviewPalette.warningBackground
      : inputReviewPalette.errorBackground,
  };
}

export function optionalInputStyle(
  confidence: string,
  value: string | null,
  options?: { neutralWhenPresent?: boolean },
): CSSProperties {
  const isEmpty = !String(value ?? '').trim();

  return {
    width: '100%',
    boxSizing: 'border-box',
    padding: 8,
    borderRadius: 6,
    ...(isEmpty
      ? {
          background: inputReviewPalette.white,
          border: `1px solid ${inputReviewPalette.border}`,
        }
      : options?.neutralWhenPresent
      ? {
          background: inputReviewPalette.white,
          border: `1px solid ${inputReviewPalette.border}`,
        }
      : getPreviewConfidenceStyle(confidence)),
  };
}

export const documentActionTdStyle: CSSProperties = {
  ...tdStyle,
  width: 236,
  minWidth: 236,
  maxWidth: 236,
  whiteSpace: 'nowrap',
  verticalAlign: 'middle',
};

export const documentActionRowCompactStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  gap: 8,
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'nowrap',
};

export const disabledActionWrapStyle: CSSProperties = {
  display: 'inline-flex',
  cursor: 'not-allowed',
};

export const missingFileNoticeStyle: CSSProperties = {
  margin: '0 16px 12px',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontWeight: 600,
  lineHeight: 1.5,
};

export function documentPrimaryActionButtonStyle(disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 112,
    minHeight: 34,
    padding: '6px 12px',
    borderRadius: 8,
    border: disabled ? `1px solid ${inputReviewPalette.border}` : `1px solid ${inputReviewPalette.primaryGreen}`,
    background: disabled ? inputReviewPalette.disabledBackground : inputReviewPalette.primaryGreen,
    color: disabled ? inputReviewPalette.mutedText : inputReviewPalette.white,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    pointerEvents: disabled ? 'none' : 'auto',
  };
}

export function documentSecondaryActionButtonStyle(disabled: boolean, danger: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    padding: '6px 10px',
    borderRadius: 8,
    border: danger ? '1px solid #FECACA' : `1px solid ${inputReviewPalette.border}`,
    background: disabled ? inputReviewPalette.disabledBackground : inputReviewPalette.white,
    color: disabled ? inputReviewPalette.mutedText : danger ? inputReviewPalette.errorText : '#334155',
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export const documentMenuWrapStyle: CSSProperties = {
  position: 'relative',
};

export const kebabButtonStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.white,
  color: inputReviewPalette.primaryText,
  cursor: 'pointer',
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1,
};

export const documentMenuStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 40,
  zIndex: 20,
  width: 224,
  minWidth: 180,
  padding: 6,
  borderRadius: 10,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.white,
  boxShadow: '0 14px 30px rgba(15, 23, 42, 0.12)',
};

export const documentMenuSeparatorStyle: CSSProperties = {
  height: 1,
  margin: '6px 4px',
  background: inputReviewPalette.border,
};

export function documentMenuItemStyle(disabled: boolean): CSSProperties {
  return {
    width: '100%',
    padding: '9px 10px',
    border: 'none',
    borderRadius: 8,
    background: 'transparent',
    color: disabled ? inputReviewPalette.mutedText : inputReviewPalette.primaryText,
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left',
    fontWeight: 600,
  };
}

export function documentMenuDangerItemStyle(disabled: boolean): CSSProperties {
  return {
    ...documentMenuItemStyle(disabled),
    color: disabled ? inputReviewPalette.mutedText : inputReviewPalette.errorText,
  };
}

export const uploadedDocumentsHeaderStyle: CSSProperties = {
  padding: 16,
  borderBottom: `1px solid ${inputReviewPalette.border}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

export const selectedDocumentsActionWrapStyle: CSSProperties = {
  display: 'grid',
  justifyItems: 'end',
  gap: 4,
  maxWidth: 360,
};

export const selectedDocumentsActionHelpStyle: CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  lineHeight: 1.35,
  textAlign: 'right',
};

export function selectedDocumentsReportButtonStyle(
  selectedCount: number,
  disabled: boolean,
): CSSProperties {
  const enabled = selectedCount > 0 && !disabled;

  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: enabled ? `1px solid ${inputReviewPalette.primaryGreen}` : `1px solid ${inputReviewPalette.border}`,
    background: enabled ? inputReviewPalette.primaryGreen : inputReviewPalette.disabledBackground,
    color: enabled ? inputReviewPalette.white : inputReviewPalette.mutedText,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700,
  };
}

export const secondaryButtonStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: `1px solid ${inputReviewPalette.border}`,
  background: inputReviewPalette.white,
  color: '#334155',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
};

export function primaryButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: disabled ? `1px solid ${inputReviewPalette.border}` : `1px solid ${inputReviewPalette.primaryGreen}`,
    background: disabled ? inputReviewPalette.disabledBackground : inputReviewPalette.primaryGreen,
    color: disabled ? inputReviewPalette.mutedText : inputReviewPalette.white,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export function secondaryActionButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: `1px solid ${inputReviewPalette.border}`,
    background: disabled ? inputReviewPalette.disabledBackground : inputReviewPalette.white,
    color: disabled ? inputReviewPalette.mutedText : '#334155',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export function confirmButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 8,
    border: enabled ? `1px solid ${inputReviewPalette.primaryGreen}` : `1px solid ${inputReviewPalette.border}`,
    background: enabled ? inputReviewPalette.primaryGreen : inputReviewPalette.disabledBackground,
    color: enabled ? inputReviewPalette.white : inputReviewPalette.mutedText,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontWeight: 700,
  };
}

export function dangerButtonStyle(disabled: boolean): CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: `1px solid ${inputReviewPalette.errorText}`,
    background: disabled ? inputReviewPalette.disabledBackground : inputReviewPalette.errorText,
    color: disabled ? inputReviewPalette.mutedText : inputReviewPalette.white,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

export const deleteButtonStyle: CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: `1px solid ${inputReviewPalette.errorText}`,
  background: inputReviewPalette.white,
  color: inputReviewPalette.errorText,
  cursor: 'pointer',
};

export const dateWarningStyle: CSSProperties = {
  color: '#92400e',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.35,
  overflowWrap: 'anywhere',
  whiteSpace: 'normal',
};

export const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.45)',
};

export const modalStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  borderRadius: 16,
  border: '1px solid #e5e7eb',
  background: '#fff',
  padding: 24,
  boxShadow: '0 25px 80px rgba(15, 23, 42, 0.25)',
};

export const documentDetailsModalStyle: CSSProperties = {
  ...modalStyle,
  maxWidth: 560,
};

export const documentDetailsHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
};

export const documentDetailsTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  color: '#0f172a',
};

export const documentDetailsSubtitleStyle: CSSProperties = {
  margin: '6px 0 0',
  color: '#64748b',
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
};

export const modalCloseButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#fff',
  color: '#334155',
  width: 36,
  height: 36,
  cursor: 'pointer',
  fontSize: 22,
  lineHeight: 1,
};

export const documentDetailsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  margin: 0,
};

export const documentMetadataFieldStyle: CSSProperties = {
  padding: 12,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#f8fafc',
};

export const documentMetadataLabelStyle: CSSProperties = {
  marginBottom: 4,
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
};

export const documentMetadataValueStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 14,
  overflowWrap: 'anywhere',
};

export const warningTextStyle: CSSProperties = {
  margin: '16px 0',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #fed7aa',
  background: '#fff7ed',
  color: '#9a3412',
  fontWeight: 600,
};

export const modalActionRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 20,
};
