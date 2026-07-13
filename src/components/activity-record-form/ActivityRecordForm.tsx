import type { CSSProperties, ReactNode } from 'react';
import { ActivityRecordFields } from './ActivityRecordFields';
import type { ActivityRecordField, ActivityRecordFormValues } from './types';
import { getProvinceOptionsForActivity } from '../../utils/province';

export type { ActivityRecordField, ActivityRecordFormValues } from './types';

type ActivityRecordFormProps = {
  values: ActivityRecordFormValues;
  activityTypes: string[];
  provinceOptions: string[];
  onChange: (field: ActivityRecordField, value: string) => void;
  fieldErrors?: Record<string, string>;
  facilityField?: 'facilityId' | 'facilityName';
  header?: ReactNode;
  review?: ReactNode;
  actions?: ReactNode;
  maxWidth?: number;
  borderColor?: string;
  helperId?: string;
};

export function ActivityRecordForm({
  values,
  activityTypes,
  provinceOptions,
  onChange,
  fieldErrors = {},
  facilityField = 'facilityId',
  header,
  review,
  actions,
  maxWidth = 960,
  borderColor = '#e2e8f0',
  helperId,
}: ActivityRecordFormProps) {
  const isElectricity = String(values.activityType ?? '').toUpperCase() === 'ELECTRICITY';
  const availableProvinceOptions = getProvinceOptionsForActivity(
    values.activityType,
    values.jurisdictionRegion,
    provinceOptions,
  );

  return (
    <div style={{ ...cardStyle, maxWidth, borderColor }}>
      {header ? <div style={headerStyle}>{header}</div> : null}

      <ActivityRecordFields
        values={values}
        onChange={onChange}
        errors={fieldErrors}
        activityTypeOptions={activityTypes}
        provinceOptions={availableProvinceOptions}
        facilityField={facilityField}
        isElectricity={isElectricity}
        helperId={helperId}
      />

      {review ? <div>{review}</div> : null}
      {actions ? <div style={actionsStyle}>{actions}</div> : null}
    </div>
  );
}

const cardStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: 14,
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 8px 18px rgba(15, 23, 42, 0.05)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};
