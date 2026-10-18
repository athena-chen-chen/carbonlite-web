import type { MetricsCountSummary } from '../../components/MetricsSummarySection';
import type {
  BuildCanonicalReportDataInput,
  RegulatoryReportingReference,
  ReportDocumentControlMetadata,
} from './reportTypes';

const REPORT_DOCUMENT_VERSION = '0.1';
const REPORT_STATUS_PILOT_DRAFT = 'Pilot Draft';
const REPORT_REVIEWER_NOT_ASSIGNED = 'Not yet assigned';
const REPORT_REVIEW_STATUS_NOT_REVIEWED = 'Not reviewed';
const CARBONLITE_TEMPLATE_VERSION = 'CarbonLite Pilot Demo v0.1';
const BASE_REGULATORY_REPORTING_SYSTEMS = [
  'Federal GHGRP Single Window reporting',
] as const;
const ALBERTA_REGULATORY_REPORTING_SYSTEMS = [
  'Alberta SGRR / SWIM reporting',
  'Alberta TIER compliance reporting',
] as const;
const FEDERAL_FUEL_CHARGE_REMOVAL_DATE = '2025-04-01';
const FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE = '2025-03-31';
const FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL = 'April 1, 2025';
const FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE_LABEL = 'March 31, 2025';
const HISTORICAL_FEDERAL_FUEL_CHARGE_REFERENCE =
  `Historical federal fuel-charge requirements may be relevant for reporting periods before ${FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL}.`;
const TRANSITIONAL_FEDERAL_FUEL_CHARGE_REFERENCE =
  `Historical federal fuel-charge requirements may apply to activities before ${FEDERAL_FUEL_CHARGE_REMOVAL_DATE_LABEL}. The federal fuel charge ceased for activities after ${FEDERAL_FUEL_CHARGE_CEASED_AFTER_DATE_LABEL}.`;

export function buildReportMetadata(input: BuildCanonicalReportDataInput & {
  reportCountSummary: MetricsCountSummary;
}) {
  const documentControl = buildReportDocumentControlMetadata({
    organizationName: input.organization.name,
    organizationId: input.organization.id,
    reportPeriod: input.reportingPeriod.label,
    reportScope: input.reportScope,
    reportScopeLabel: input.reportScopeLabel,
    generatedBy: input.organization.generatedBy,
    periodEnd: input.reportingPeriod.endDate,
    selectedRecordIds: input.selectedRecordIds ?? [],
    selectedDocumentIds: input.selectedDocumentIds ?? [],
    activityDataIds: input.calculationDetails.map((detail) => detail.activityDataId),
    activityRecordIds: input.activities.map((activity) => activity.id),
    totalRecordsFound: input.reportCountSummary.totalRecordsFound,
    processedRecords: input.reportCountSummary.processedRecords,
    totalEstimatedEmissionsKgCO2e: input.totalEstimatedEmissionsKgCO2e,
  });
  const regulatoryReportingReference = buildRegulatoryReportingReference({
    reportStartDate: input.reportingPeriod.startDate,
    reportEndDate: input.reportingPeriod.endDate,
    hasAlbertaContext: hasAlbertaReportingContext(input),
    thresholdReferences: input.regulatoryThresholdReferences ?? [],
  });

  return {
    metadata: {
      outputGeneratedDate: input.outputGeneratedDate,
      organizationName: input.organization.name,
      reportPeriod: input.reportingPeriod.label,
      reportScope: input.reportScope,
      reportScopeLabel: input.reportScopeLabel,
      documentControl,
    },
    documentControl,
    regulatoryReportingReference,
  };
}

export function buildRegulatoryReportingReference({
  reportStartDate,
  reportEndDate,
  hasAlbertaContext,
  thresholdReferences = [],
}: {
  reportStartDate?: string | null;
  reportEndDate?: string | null;
  hasAlbertaContext: boolean;
  thresholdReferences?: RegulatoryReportingReference['thresholdReferences'];
}): RegulatoryReportingReference {
  const currentSystems = hasAlbertaContext
    ? [...BASE_REGULATORY_REPORTING_SYSTEMS, ...ALBERTA_REGULATORY_REPORTING_SYSTEMS]
    : [...BASE_REGULATORY_REPORTING_SYSTEMS];
  const historicalNotes: string[] = [];
  const startDate = normalizeDateOnlyForComparison(reportStartDate);
  const endDate = normalizeDateOnlyForComparison(reportEndDate);

  if (startDate && endDate) {
    if (endDate < FEDERAL_FUEL_CHARGE_REMOVAL_DATE) {
      historicalNotes.push(HISTORICAL_FEDERAL_FUEL_CHARGE_REFERENCE);
    } else if (startDate < FEDERAL_FUEL_CHARGE_REMOVAL_DATE) {
      historicalNotes.push(TRANSITIONAL_FEDERAL_FUEL_CHARGE_REFERENCE);
    }
  }

  return {
    currentSystems,
    historicalNotes,
    thresholdReferences,
  };
}

export function buildReportDocumentControlMetadata(input: {
  organizationName: string;
  organizationId?: string | null;
  reportPeriod: string;
  reportScope: string;
  reportScopeLabel: string;
  generatedBy?: string | null;
  periodEnd?: string | null;
  selectedRecordIds: string[];
  selectedDocumentIds: string[];
  activityDataIds: string[];
  activityRecordIds: string[];
  totalRecordsFound: number;
  processedRecords: number;
  totalEstimatedEmissionsKgCO2e: number;
}): ReportDocumentControlMetadata {
  const reportingYear = getDateOnlyYear(input.periodEnd) ?? getReportPeriodYear(input.reportPeriod) ?? 2026;
  const stablePayload = [
    input.organizationId || input.organizationName,
    input.reportPeriod,
    input.reportScope,
    input.reportScopeLabel,
    input.selectedRecordIds.slice().sort().join(','),
    input.selectedDocumentIds.slice().sort().join(','),
    input.activityDataIds.slice().sort().join(','),
    input.activityRecordIds.slice().sort().join(','),
    input.totalRecordsFound,
    input.processedRecords,
    Math.round(input.totalEstimatedEmissionsKgCO2e * 1000) / 1000,
  ].join('|');

  return {
    reportId: `CL-DRAFT-${reportingYear}-${stableHash(stablePayload)}`,
    reportVersion: REPORT_DOCUMENT_VERSION,
    reportStatus: REPORT_STATUS_PILOT_DRAFT,
    generatedWith: CARBONLITE_TEMPLATE_VERSION,
    generatedBy: String(input.generatedBy ?? '').trim() || 'Unknown user',
    reviewer: REPORT_REVIEWER_NOT_ASSIGNED,
    reviewStatus: REPORT_REVIEW_STATUS_NOT_REVIEWED,
  };
}

function normalizeDateOnlyForComparison(value?: string | null) {
  const candidate = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function getDateOnlyYear(value?: string | null) {
  const match = String(value ?? '').match(/^(\d{4})-\d{2}-\d{2}/);
  return match ? Number(match[1]) : null;
}

function getReportPeriodYear(reportPeriod: string) {
  const match = reportPeriod.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

function hasAlbertaReportingContext(input: Pick<BuildCanonicalReportDataInput, 'calculationDetails' | 'activities'>) {
  return (
    input.calculationDetails.some((item) =>
      /\balberta\b|\bab\b/i.test(
        `${item.jurisdictionRegion ?? ''} ${item.jurisdiction ?? ''}`,
      ),
    ) ||
    input.activities.some((item) =>
      /\balberta\b|\bab\b/i.test(`${item.jurisdictionRegion ?? ''} ${item.jurisdiction ?? ''}`),
    )
  );
}
