import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CalculationQualitySummary, SourceReviewSummary } from '../domain/reportTypes';
import {
  CalculationQualitySection,
  FacilityBreakdownSection,
  SourceDatasetReviewSection,
} from './ReportPresentationSections';
import type { ReportingReadinessAssessment } from '../../utils/reportingReadiness';

const noop = () => {};

function readiness(): ReportingReadinessAssessment {
  return {
    overallStatus: 'NEEDS_ATTENTION',
    items: [
      {
        code: 'BOUNDARY_DEFINED',
        label: 'Reporting boundary defined',
        workflowStageId: 'BOUNDARY',
        workflowStageLabel: 'Boundary',
        status: 'COMPLETE',
        evidence: 'Boundary reviewed.',
      },
      {
        code: 'SOURCE_REVIEW_COMPLETE',
        label: 'Source data assessed',
        workflowStageId: 'SOURCE_DATA',
        workflowStageLabel: 'Import',
        status: 'NEEDS_ATTENTION',
        evidence: 'One source row requires review.',
      },
      {
        code: 'REVIEWER_APPROVAL',
        label: 'Reviewer approval',
        workflowStageId: 'REPORT',
        workflowStageLabel: 'Report',
        status: 'NOT_REVIEWED',
        evidence: 'Reviewer approval has not been recorded.',
      },
    ],
  };
}

function calculationQuality(overrides: Partial<CalculationQualitySummary> = {}): CalculationQualitySummary {
  return {
    calculationCoverage: '100%',
    coverageCounts: {
      calculatedRecords: 2,
      eligibleEmissionBearingRecords: 2,
    },
    dataReadinessSummary: {
      score: 100,
      level: 'Good',
      message: 'Ready',
      optionalDataCompleteness: {
        score: 0,
        costDataCount: 0,
        totalRecords: 3,
        missingCostDataCount: 3,
        message: '0 of 3 imported activity records include optional cost data',
      },
      checks: [],
      totalRecords: 3,
      recordsReadyForCalculation: 2,
      recordsRequiringReview: 0,
      trackedOnlyCount: 1,
      missingFactorCount: 0,
      invalidUnitCount: 0,
      missingJurisdictionCount: 0,
    },
    ...overrides,
  };
}

function sourceReview(overrides: Partial<SourceReviewSummary> = {}): SourceReviewSummary {
  return {
    available: true,
    availability: 'STRUCTURED_REVIEW_AVAILABLE',
    sourceType: 'SPREADSHEET',
    status: 'COMPLETE',
    evidence: '5 source rows were assessed.',
    limitation: 'No unresolved source-data issues are currently recorded for this report scope.',
    sourceFiles: ['review.xlsx'],
    totalRows: 5,
    readyCount: 5,
    trackedOnlyCount: 0,
    resolvedCount: 5,
    needsReviewCount: 0,
    resolutionPercent: 100,
    needsReviewRows: [],
    ...overrides,
  };
}

describe('report presentation sections', () => {
  it('renders calculation quality from canonical quality and readiness data', () => {
    render(
      <CalculationQualitySection
        data={calculationQuality()}
        readiness={readiness()}
        sourceReview={sourceReview()}
        primarySkippedReasonsText="None"
        expanded
        onToggle={noop}
      />,
    );

    expect(screen.getByText('Calculation Coverage')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Optional Data Completeness')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0 of 3 imported activity records include optional cost data')).toBeInTheDocument();
    expect(screen.getByText('Boundary: Reporting boundary defined')).toBeInTheDocument();
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getAllByText('Needs attention').length).toBeGreaterThan(0);
    expect(screen.getByText('Not reviewed')).toBeInTheDocument();
  });

  it('renders structured and limited source review without fabricating limited counts', () => {
    const { rerender } = render(
      <SourceDatasetReviewSection
        data={sourceReview()}
        expanded
        onToggle={noop}
      />,
    );

    expect(screen.getByText('5 of 5 source rows resolved/imported · 0 need attention')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Limited')).not.toBeInTheDocument();

    rerender(
      <SourceDatasetReviewSection
        data={sourceReview({
          available: false,
          availability: 'DOCUMENT_LINEAGE_AVAILABLE',
          sourceType: 'DOCUMENT',
          status: 'LIMITED',
          sourceFiles: ['bill.pdf'],
          totalRows: 0,
          readyCount: 0,
          resolvedCount: 1,
          needsReviewCount: 0,
          resolutionPercent: 0,
        })}
        expanded
        onToggle={noop}
      />,
    );

    expect(screen.getByText('Document source lineage available; structured validation counts limited')).toBeInTheDocument();
    expect(screen.getAllByText('Limited').length).toBeGreaterThan(0);
    expect(screen.getByText(/Structured unresolved-source-row counts are not available/i)).toBeInTheDocument();
  });

  it('renders unsupported Alberta electricity as uncalculated Needs Review source data', () => {
    render(
      <SourceDatasetReviewSection
        data={sourceReview({
          status: 'NEEDS_ATTENTION',
          totalRows: 1,
          readyCount: 0,
          resolvedCount: 0,
          needsReviewCount: 1,
          resolutionPercent: 0,
          needsReviewRows: [{
            id: 'unsupported-ab-electricity',
            status: 'NEEDS_REVIEW',
            activityType: 'ELECTRICITY',
            quantity: 980,
            unit: 'kWh',
            jurisdictionCountry: 'Canada',
            jurisdictionRegion: 'Alberta',
            calculationStatus: 'MISSING_FACTOR',
            issues: [{ code: 'MISSING_FACTOR', field: 'factor', message: 'No matching emission factor is available.' }],
          }],
        })}
        expanded
        onToggle={noop}
      />,
    );

    expect(screen.getByText(/Not calculated: no approved corporate-inventory electricity factor/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep this row in Needs Review/i)).toBeInTheDocument();
    expect(screen.queryByText(/0\.53/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 kg/i)).not.toBeInTheDocument();
  });

  it('renders canonical facility groups without applying facility fallback rules', () => {
    render(
      <FacilityBreakdownSection
        data={{
          organizationTotalKgCO2e: 2428.44,
          includedRecords: 5,
          rows: [
            facilityRow('Calgary HQ', 1082.74),
            facilityRow('Vancouver Fleet', 808.5),
            facilityRow('Toronto Sales Trip', 45),
            facilityRow('Corporate Travel', 492.2),
          ],
        }}
        expanded
        onToggle={vi.fn()}
      />,
    );

    const section = screen.getByRole('region', { name: 'Emissions by Site / Facility' });
    expect(within(section).getByText('Calgary HQ')).toBeInTheDocument();
    expect(within(section).getByText('Vancouver Fleet')).toBeInTheDocument();
    expect(within(section).getByText('Toronto Sales Trip')).toBeInTheDocument();
    expect(within(section).getByText('Corporate Travel')).toBeInTheDocument();
    expect(within(section).queryByText('Unassigned')).not.toBeInTheDocument();
  });
});

function facilityRow(siteFacility: string, totalKgCO2e: number) {
  return {
    siteFacility,
    jurisdictionCountry: 'Canada',
    jurisdictionRegion: 'AB',
    jurisdictionSource: 'activity',
    scope1KgCO2e: totalKgCO2e,
    scope2KgCO2e: 0,
    scope3KgCO2e: 0,
    totalKgCO2e,
    includedRecords: 1,
    activityBreakdown: [{
      activityType: 'Natural Gas',
      totalKgCO2e,
      includedRecords: 1,
    }],
  };
}
