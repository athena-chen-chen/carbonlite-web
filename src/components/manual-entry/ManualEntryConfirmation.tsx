import type { ActivityDataItem } from '../../services/activityData';
import { getActivityTypeLabel } from '../../utils/activityType';
import { formatRecordDisplayStatus, formatCalculationStatusLabel } from '../../utils/terminology';

export function ManualEntryConfirmation({ record, onAddAnother }: {
  record: ActivityDataItem;
  onAddAnother: () => void;
}) {
  const status = formatRecordDisplayStatus(record) || formatCalculationStatusLabel(record.calculationStatus);
  const emissions = record.calculatedEmissionsKgCO2e ?? record.calculatedEmission;
  const hasEmissions = emissions != null && String(emissions).trim() !== '' && Number.isFinite(Number(emissions));
  const facility = record.facilityName || (typeof record.facility === 'string' ? record.facility : record.facility?.name);
  const location = [facility, record.jurisdictionRegion, record.jurisdictionCountry].filter(Boolean).join(', ');

  return (
    <div role="status" aria-label="Manual entry saved" style={{
      flexBasis: '100%', display: 'grid', gap: 8, padding: 16,
      border: '1px solid #86efac', borderRadius: 10, background: '#f0fdf4', color: '#14532d',
    }}>
      <strong>Manual entry saved</strong>
      {record.activityType ? <span>{getActivityTypeLabel(record.activityType)}</span> : null}
      {record.quantity != null ? <span>{record.quantity} {record.unit}</span> : null}
      {location ? <span>{location}</span> : null}
      {status ? <span>{status}</span> : null}
      {hasEmissions ? <span>{Number(emissions).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kgCO2e</span> : null}
      <span>Your saved record is in Data Records.</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <a href={record.id ? `/activity-records?recordId=${encodeURIComponent(record.id)}` : '/activity-records'}>
          View in Data Records
        </a>
        <button type="button" onClick={onAddAnother}>Add another entry</button>
      </div>
    </div>
  );
}
