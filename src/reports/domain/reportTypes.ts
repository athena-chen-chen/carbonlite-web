import type { SourceEvidenceCounts } from './reportSemantics';
import type { ActivityUsageTotals } from '../../utils/activityAggregation';
import type { CalculationAuditDetail } from '../../services/metrics';
import type { ConversionFactorItem } from '../../services/conversionFactors';
import type { SpreadsheetReviewRowItem } from '../../services/spreadsheetReviewRows';
import type {
  FormalActivityEmission,
  FormalConversionFactorUsed,
  buildSourceEvidenceRows,
  ReportExecutiveSummary,
  ReportSkippedReasonSummary,
} from '../../components/FormalReportPreview';
import type {
  DataReadinessSummary,
  HotspotAnalysis,
  MetricsCountSummary,
  MetricsSummaryTableRow,
} from '../../components/MetricsSummarySection';
import type { InventoryBoundary } from '../../constants/inventoryBoundary';
import type {
  ReportingReadinessAssessment,
  SourceReviewReadinessSummary,
} from '../../utils/reportingReadiness';
import type {
  FacilityRegulatoryThresholdReference,
  SiteFacilityRollup,
} from '../../utils/siteFacilityBreakdown';
import type { getCalculationCoverageCounts } from '../../utils/reportCredibility';

export type CanonicalReportActivity = {
  id: string;
  activityType: string;
  recordDate?: string | null;
  quantity?: string | number | null;
  unit?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  sourceDocumentId?: string | null;
  sourceFileName?: string | null;
  sourceSheetName?: string | null;
  sourcePage?: string | number | null;
  sourceRow?: string | number | null;
  sourceTextSnippet?: string | null;
  costCad?: string | number | null;
  costCurrency?: string | null;
  jurisdiction?: string | null;
  jurisdictionRegion?: string | null;
  notes?: string | null;
};

export type ReportDocumentControlMetadata = {
  reportId: string;
  reportVersion: string;
  reportStatus: string;
  generatedWith: string;
  generatedBy: string;
  reviewer: string;
  reviewStatus: string;
};

export type RegulatoryReportingReference = {
  currentSystems: string[];
  historicalNotes: string[];
  thresholdReferences: FacilityRegulatoryThresholdReference[];
};

export type SourceReviewSummary = Omit<SourceReviewReadinessSummary, 'needsReviewRows'> & {
  sourceFiles: string[];
  readyCount: number;
  trackedOnlyCount: number;
  resolutionPercent: number;
  needsReviewRows: SpreadsheetReviewRowItem[];
};

export type CanonicalReportData = {
  metadata: {
    outputGeneratedDate: string;
    organizationName: string;
    reportPeriod: string;
    reportScope: string;
    reportScopeLabel: string;
    documentControl: ReportDocumentControlMetadata;
  };
  inventory: {
    importedRecordCount: number;
    includedRecordCount: number;
    trackedMetricCount: number;
    importedNeedsReviewCount: number;
    totalKgCO2e: number;
  };
  reportingPeriod: {
    startDate: string | null;
    endDate: string | null;
    label: string;
  };
  calculationQuality: {
    calculationCoverage: string;
    coverageCounts: ReturnType<typeof getCalculationCoverageCounts>;
    dataReadinessSummary: DataReadinessSummary;
  };
  sourceReview: SourceReviewSummary;
  scopeBreakdown: {
    totals: Record<'Scope 1' | 'Scope 2' | 'Scope 3' | 'Unclassified', number>;
  };
  facilityBreakdown: SiteFacilityRollup;
  hotspots: HotspotAnalysis;
  factorReview: {
    factorsUsedCount: number;
    factorsRequiringReviewCount: number;
    factors: FormalConversionFactorUsed[];
  };
  readiness: ReportingReadinessAssessment;
  limitations: ReportLimitations;
  regulatoryReportingReference: RegulatoryReportingReference;
  totalsByMetric: MetricsSummaryTableRow[];
  // Existing presentation projections carried with the snapshot for closure-free exports.
  matchedActivityEmissions: FormalActivityEmission[];
  sourceEvidenceCounts: SourceEvidenceCounts;
  sourceEvidenceRows: ReturnType<typeof buildSourceEvidenceRows>;

  outputGeneratedDate: string;
  organizationName: string;
  reportPeriod: string;
  reportScopeLabel: string;
  documentControl: ReportDocumentControlMetadata;
  executiveSummary: ReportExecutiveSummary;
  reportCountSummary: MetricsCountSummary;
  primarySkippedReasons: ReportSkippedReasonSummary;
  hotspotAnalysis: HotspotAnalysis;
  calculationCoverage: string;
  coverageCounts: ReturnType<typeof getCalculationCoverageCounts>;
  scopeSummary: Record<'Scope 1' | 'Scope 2' | 'Scope 3' | 'Unclassified', number>;
  sourceReviewSummary: SourceReviewSummary;
  reportingReadinessAssessment: ReportingReadinessAssessment;
  dataReadinessSummary: DataReadinessSummary;
  inventoryBoundary: InventoryBoundary;
  totalEstimatedEmissionsKgCO2e: number;
  calculationDetails: CalculationAuditDetail[];
};

export type InventorySummary = CanonicalReportData['inventory'];

export type CalculationQualitySummary = CanonicalReportData['calculationQuality'];

export type ScopeBreakdown = CanonicalReportData['scopeBreakdown'];

export type FactorReviewSummary = CanonicalReportData['factorReview'];

export type ReportLimitations = {
  sourceReviewLimitation: string | null;
};

export type BuildCanonicalReportDataInput = {
  activities: CanonicalReportActivity[];
  reviewRows: SpreadsheetReviewRowItem[];
  calculationDetails: CalculationAuditDetail[];
  matchedActivityEmissions: FormalActivityEmission[];
  conversionFactorsUsed?: FormalConversionFactorUsed[];
  factors?: ConversionFactorItem[];
  usageTotals: ActivityUsageTotals;
  countSummary: MetricsCountSummary;
  totalEstimatedEmissionsKgCO2e: number;
  inventoryBoundary: InventoryBoundary;
  reportingPeriod: {
    startDate: string | null;
    endDate: string | null;
    label: string;
  };
  organization: {
    name: string;
    id?: string | null;
    generatedBy?: string | null;
  };
  reportScope: string;
  reportScopeLabel: string;
  selectedRecordIds?: string[];
  selectedDocumentIds?: string[];
  outputGeneratedDate: string;
  regulatoryThresholdReferences?: FacilityRegulatoryThresholdReference[];
};
