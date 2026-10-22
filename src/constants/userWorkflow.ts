// Interactive navigation only. The canonical six-stage audit/report model lives
// in carbonliteWorkflow.ts and must remain independent of this presentation.
export const USER_WORKFLOW = [
  { title: 'Organization & Boundary', action: 'Set Boundary', route: '/organization-profile', subtitle: 'Set the reporting period, locations, and emissions boundary for this report.' },
  { title: 'Input Data', action: 'Add Data', route: '/input-data', subtitle: 'Upload bills or spreadsheets, or add activity data manually.' },
  { title: 'Data Records', action: 'Resolve Issues', route: '/data-records', subtitle: 'Review imported records and resolve missing or invalid data.' },
  { title: 'Calculation Results', action: 'Calculation Results', route: '/metrics-summary', subtitle: 'Review emissions calculations, matched factors, and records needing attention.' },
  { title: 'Reports', action: 'Generate Report', route: '/reports', subtitle: 'Review results and export the Executive, Technical, or CSV report.' },
] as const;
