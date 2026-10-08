export type CarbonLiteWorkflowStageId =
  | 'BOUNDARY'
  | 'SOURCE_DATA'
  | 'DATA_ISSUES'
  | 'FACTORS_CALCULATIONS'
  | 'RESULTS'
  | 'REPORT';

export type CarbonLiteWorkflowStage = {
  id: CarbonLiteWorkflowStageId;
  step: number;
  title: string;
  shortTitle: string;
  description: string;
  route: string;
  primaryRole: string;
  dataContributor: string;
  carbonLite: string;
  reviewer: string;
  primaryPages: string[];
};

export const CARBONLITE_WORKFLOW: CarbonLiteWorkflowStage[] = [
  {
    id: 'BOUNDARY',
    step: 1,
    title: 'Define Reporting Boundary',
    shortTitle: 'Define Boundary',
    description: 'Set the reporting period, organization context, facilities, geography, scopes, exclusions, and notes.',
    route: '/organization-profile',
    primaryRole: 'Reviewer / organization lead',
    dataContributor: 'Provide organization and facility context where known.',
    carbonLite: 'Stores and displays the configured boundary across review and reporting surfaces.',
    reviewer: 'Reviews boundary assumptions, exclusions, and reporting context.',
    primaryPages: ['Organization & Boundary', 'Calculation Review', 'Reports'],
  },
  {
    id: 'SOURCE_DATA',
    step: 2,
    title: 'Collect & Upload Source Data',
    shortTitle: 'Upload Data',
    description: 'Collect source files or enter activity data from invoices, utility bills, spreadsheets, and operational records.',
    route: '/input-data',
    primaryRole: 'SME / Data Contributor',
    dataContributor: 'Uploads source files, imports spreadsheets, or enters activity data.',
    carbonLite: 'Extracts, normalizes, and stages activity data for review.',
    reviewer: 'Usually not required unless the data collection scope is ambiguous.',
    primaryPages: ['Input Data', 'Data Collection Guide'],
  },
  {
    id: 'DATA_ISSUES',
    step: 3,
    title: 'Review & Resolve Data Issues',
    shortTitle: 'Resolve Data Issues',
    description: 'Fix missing fields, quantities, units, dates, jurisdiction, source references, and obvious source-data issues.',
    route: '/input-data',
    primaryRole: 'SME / Data Contributor',
    dataContributor: 'Corrects missing or inconsistent source-data fields.',
    carbonLite: 'Flags issues and re-evaluates row status after corrections.',
    reviewer: 'Assists only when classification or source interpretation is ambiguous.',
    primaryPages: ['Review Rows', 'Input Data', 'Data Records'],
  },
  {
    id: 'FACTORS_CALCULATIONS',
    step: 4,
    title: 'Validate Factors & Calculations',
    shortTitle: 'Validate Calculations',
    description: 'Review factor applicability, provenance, fallback assumptions, calculation status, and traceability.',
    route: '/metrics-summary',
    primaryRole: 'Reviewer / Consultant',
    dataContributor: 'Provides missing operational context when requested.',
    carbonLite: 'Matches candidate factors, calculates emissions, and exposes factor provenance.',
    reviewer: 'Reviews factor selection, assumptions, unresolved exceptions, and calculation outputs.',
    primaryPages: ['Factors', 'Calculation Review'],
  },
  {
    id: 'RESULTS',
    step: 5,
    title: 'Review Results',
    shortTitle: 'Review Results',
    description: 'Review emissions totals, scope breakdowns, site summaries, hotspots, limitations, and records excluded from totals.',
    route: '/metrics-summary',
    primaryRole: 'Reviewer / Consultant with SME context',
    dataContributor: 'Confirms operational context and flags results that do not match business reality.',
    carbonLite: 'Summarizes calculated results, hotspots, limitations, and review-required records.',
    reviewer: 'Interprets material results and readiness for intended use.',
    primaryPages: ['Calculation Review', 'Reports'],
  },
  {
    id: 'REPORT',
    step: 6,
    title: 'Generate & Review Report',
    shortTitle: 'Generate Report',
    description: 'Generate traceable reports and review packages. Review or approve where applicable; CarbonLite does not certify results automatically.',
    route: '/reports',
    primaryRole: 'Reviewer / Consultant',
    dataContributor: 'Generates or exports where permitted and shares operational context.',
    carbonLite: 'Produces traceable report and review-package exports.',
    reviewer: 'Reviews the report and approves where a real approval workflow applies.',
    primaryPages: ['Reports'],
  },
];

export const CARBONLITE_WORKFLOW_STAGE_COUNT = CARBONLITE_WORKFLOW.length;

export function getWorkflowStage(id: CarbonLiteWorkflowStageId) {
  const stage = CARBONLITE_WORKFLOW.find((item) => item.id === id);
  if (!stage) throw new Error(`Unknown CarbonLite workflow stage: ${id}`);
  return stage;
}

export function formatWorkflowStageLabel(stage: CarbonLiteWorkflowStage) {
  return `Stage ${stage.step} of ${CARBONLITE_WORKFLOW_STAGE_COUNT}: ${stage.title}`;
}
