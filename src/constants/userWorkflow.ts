// Interactive navigation only. The canonical six-stage audit/report model lives
// in carbonliteWorkflow.ts and must remain independent of this presentation.
export const USER_WORKFLOW = [
  { title: 'Organization & boundary', action: 'Set boundary', route: '/organization-profile', subtitle: 'Set the reporting period, locations, and emissions boundary for this report.' },
  { title: 'Input data', action: 'Add data', route: '/input-data', subtitle: 'Upload bills or spreadsheets, or add activity data manually.' },
  { title: 'Data records', action: 'Resolve issues', route: '/data-records', subtitle: 'Review imported records and resolve missing or invalid data.' },
  { title: 'Calculation results', action: 'Calculation results', route: '/metrics-summary', subtitle: 'Review emissions calculations, matched factors, and records needing attention.' },
  { title: 'Reports', action: 'Generate report', route: '/reports', subtitle: 'Review results and export the Executive, Technical, or CSV report.' },
] as const;
