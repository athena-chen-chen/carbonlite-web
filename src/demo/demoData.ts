export const DEMO_STORAGE_KEY = 'carbonliteDemoMode';

export function isDemoMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.localStorage.getItem(DEMO_STORAGE_KEY) === 'enabled' ||
    window.location.search.includes('demo=1')
  );
}

export function enableDemoMode() {
  window.localStorage.setItem(DEMO_STORAGE_KEY, 'enabled');
}

export function disableDemoMode() {
  window.localStorage.removeItem(DEMO_STORAGE_KEY);
}

export const demoDocuments = [
  {
    id: 'demo-fuel-invoice',
    fileName: 'Prairie Logistics - diesel fuel invoice.pdf',
    fileUrl: '/demo/sample-fuel-invoice.pdf',
    mimeType: 'application/pdf',
    fileSize: 186400,
    type: 'PDF',
    status: 'REVIEW_REQUIRED',
    createdAt: '2026-03-29T09:15:00.000Z',
    updatedAt: '2026-03-29T09:15:00.000Z',
  },
  {
    id: 'demo-utility-bill',
    fileName: 'NorthGrid utility bill - March 2026.pdf',
    fileUrl: '/demo/sample-utility-bill.pdf',
    mimeType: 'application/pdf',
    fileSize: 212900,
    type: 'PDF',
    status: 'REVIEW_REQUIRED',
    createdAt: '2026-03-30T10:20:00.000Z',
    updatedAt: '2026-03-30T10:20:00.000Z',
  },
  {
    id: 'demo-activity-csv',
    fileName: 'March activity data import.csv',
    fileUrl: '/demo/sample-activity-data.csv',
    mimeType: 'text/csv',
    fileSize: 4800,
    type: 'SPREADSHEET',
    status: 'IMPORTED',
    createdAt: '2026-03-31T14:05:00.000Z',
    updatedAt: '2026-03-31T14:05:00.000Z',
  },
];

export const demoParsedActivities = [
  {
    activityType: { value: 'DIESEL', confidence: 'high' as const },
    recordDate: { value: '2026-03-27', confidence: 'high' as const },
    quantity: { value: 1280, confidence: 'high' as const },
    unit: { value: 'liters', confidence: 'high' as const },
    sourceReference: {
      value: 'Prairie Logistics invoice #FL-2048',
      confidence: 'high' as const,
    },
    notes: {
      value: 'Fleet diesel purchase for March delivery routes.',
      confidence: 'medium' as const,
    },
  },
  {
    activityType: { value: 'ELECTRICITY', confidence: 'high' as const },
    recordDate: { value: '2026-03-31', confidence: 'high' as const },
    quantity: { value: 18450, confidence: 'high' as const },
    unit: { value: 'kWh', confidence: 'high' as const },
    sourceReference: {
      value: 'NorthGrid utility bill account 8841',
      confidence: 'high' as const,
    },
    notes: {
      value: 'Warehouse and office electricity use.',
      confidence: 'medium' as const,
    },
  },
  {
    activityType: { value: 'NATURAL_GAS', confidence: 'medium' as const },
    recordDate: { value: '2026-03-31', confidence: 'high' as const },
    quantity: { value: 920, confidence: 'medium' as const },
    unit: { value: 'm3', confidence: 'high' as const },
    sourceReference: {
      value: 'March activity data import.csv',
      confidence: 'medium' as const,
    },
    notes: {
      value: 'Heating fuel from monthly operations spreadsheet.',
      confidence: 'medium' as const,
    },
  },
];

export const demoActivityRecords = demoParsedActivities.map((activity, index) => ({
  id: `demo-activity-${index + 1}`,
  activityType: activity.activityType.value,
  recordDate: activity.recordDate.value,
  quantity: activity.quantity.value,
  unit: activity.unit.value,
  sourceType: index === 2 ? 'IMPORT' : 'AI_EXTRACTION',
  sourceReference: activity.sourceReference.value,
  notes: activity.notes.value,
}));

export const demoMetricsSummary = {
  totalsByMetric: [
    {
      metricType: 'FUEL_USAGE',
      unit: 'liters',
      totalValue: '1,280',
      count: 1,
    },
    {
      metricType: 'ELECTRICITY_USAGE',
      unit: 'kWh',
      totalValue: '18,450',
      count: 1,
    },
    {
      metricType: 'CARBON_EMISSION',
      unit: 'kg CO2e',
      totalValue: '11,420',
      count: 3,
    },
  ],
  totalsByFacility: [
    {
      facilityId: 'Calgary warehouse',
      metricType: 'CARBON_EMISSION',
      unit: 'kg CO2e',
      totalValue: '11,420',
    },
  ],
};
