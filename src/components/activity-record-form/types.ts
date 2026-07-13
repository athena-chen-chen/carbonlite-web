export type ActivityRecordFormValues = {
  activityType?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  recordDate?: string | null;
  jurisdictionCountry?: string | null;
  jurisdictionRegion?: string | null;
  facilityId?: string | null;
  facilityName?: string | null;
  sourceReference?: string | null;
  notes?: string | null;
};

export type ActivityRecordField =
  | 'activityType'
  | 'quantity'
  | 'unit'
  | 'recordDate'
  | 'jurisdictionCountry'
  | 'jurisdictionRegion'
  | 'facilityId'
  | 'facilityName'
  | 'sourceReference'
  | 'notes';
