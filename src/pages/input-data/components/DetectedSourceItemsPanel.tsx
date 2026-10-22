import { formatDocumentMetadataValue as defaultMetadataValue } from './DocumentDetailsDialog';
import type { EditableDetectedSourceItem } from '../inputData.types';
import {
  detectedSourceItemsPanelStyle,
  detectedSourceItemsHeadingStyle,
  detectedSourceItemsGridStyle,
  detectedSourceItemStyle,
  detectedSourceItemHeaderStyle,
  detectedSourceItemBadgeStyle,
  detectedSourceItemMetaStyle,
  detectedSourceItemReasonStyle,
  detectedSourceItemHelpStyle,
} from '../../UploadPage.styles';

export type DetectedSourceItemsPanelProps = {
  detectedSourceItems: EditableDetectedSourceItem[];
  getDetectedSourceItemLabel?: (item: EditableDetectedSourceItem) => string;
  formatDocumentMetadataValue?: (value?: string | number | null) => string;
  formatDetectedSourceCost?: (value?: string | number | null) => string;
  formatDetectedSourceDetails?: (item: EditableDetectedSourceItem) => string;
};

export function DetectedSourceItemsPanel({
  detectedSourceItems,
  getDetectedSourceItemLabel = defaultGetDetectedSourceItemLabel,
  formatDocumentMetadataValue = defaultMetadataValue,
  formatDetectedSourceCost = defaultFormatDetectedSourceCost,
  formatDetectedSourceDetails = defaultFormatDetectedSourceDetails,
}: DetectedSourceItemsPanelProps) {
  return (
    <>
      {detectedSourceItems.length > 0 ? (
        <div style={detectedSourceItemsPanelStyle} aria-label="Detected source items not used in emissions calculation">
          <h3 style={detectedSourceItemsHeadingStyle}>
            Detected Source Items Not Used in Emissions Calculation
          </h3>
          <div style={detectedSourceItemsGridStyle}>
            {detectedSourceItems.map((item) => (
              <div key={`${item.documentId}-${item.id ?? item.sourceReference ?? item.type}`} style={detectedSourceItemStyle}>
                <div style={detectedSourceItemHeaderStyle}>
                  <strong>{getDetectedSourceItemLabel(item)}</strong>
                  <span style={detectedSourceItemBadgeStyle}>Not imported</span>
                </div>
                <div style={detectedSourceItemMetaStyle}>
                  Source: {item.sourceFileName || item.documentFileName}
                </div>
                <div style={detectedSourceItemMetaStyle}>
                  Service Days: {formatDocumentMetadataValue(item.serviceDays)}
                </div>
                <div style={detectedSourceItemMetaStyle}>
                  Source Cost: {formatDetectedSourceCost(item.sourceCostCad)}
                </div>
                <div style={detectedSourceItemMetaStyle}>
                  Details: {formatDetectedSourceDetails(item)}
                </div>
                <div style={detectedSourceItemReasonStyle}>
                  Reason: {item.reasonDetail || item.reason || 'No supported waste quantity was provided.'}
                </div>
                <div style={detectedSourceItemHelpStyle}>
                  Provide waste mass and disposal/treatment information to calculate emissions.
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}

function defaultGetDetectedSourceItemLabel(item: EditableDetectedSourceItem) {
  const label = String(item.label ?? '').trim();
  if (label) return label;

  return String(item.type ?? '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}

function defaultFormatDetectedSourceCost(value?: string | number | null) {
  const numericValue = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/[$,\s]/g, ''));
  if (!Number.isFinite(numericValue)) return '-';
  return `$${numericValue.toFixed(2)}`;
}

function defaultFormatDetectedSourceDetails(item: EditableDetectedSourceItem) {
  const details = item.sourceDetails ?? [];
  if (!details.length) return '-';

  return details
    .map((detail) => {
      const label = String(detail.label ?? '').trim();
      const amount = detail.amountCad !== undefined && detail.amountCad !== null
        ? defaultFormatDetectedSourceCost(detail.amountCad)
        : String(detail.value ?? '').trim();
      return [label, amount && amount !== '-' ? amount : ''].filter(Boolean).join(': ');
    })
    .filter(Boolean)
    .join('; ');
}
