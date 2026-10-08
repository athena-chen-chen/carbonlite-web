import { render, screen } from '@testing-library/react';
import { CalculationQualitySection } from './CalculationQualitySection';
import type {
  ReportingReadinessAssessment,
  ReportingReadinessItem,
  ReportingReadinessStatus,
} from '../../../utils/reportingReadiness';

const baseItem: Omit<ReportingReadinessItem, 'code' | 'status'> = {
  label: 'Test readiness item',
  workflowStageId: 'REPORT',
  workflowStageLabel: 'Stage 6: Generate Report',
  evidence: 'Evidence for this readiness item.',
};

const reportCountSummary = {
  totalRecordsFound: 1,
  processedRecords: 1,
} as any;

const primarySkippedReasons = {
  missingFactor: 0,
  missingJurisdiction: 0,
  invalidUnit: 0,
  trackedOnly: 0,
  missingData: 0,
  invalidQuantity: 0,
  outsideDateRange: 0,
  outsideScope: 0,
};

function renderWithStatus(status: ReportingReadinessStatus | string) {
  const readinessAssessment: ReportingReadinessAssessment = {
    overallStatus: status === 'COMPLETE' ? 'READY' : 'NOT_REVIEWED',
    items: [
      {
        ...baseItem,
        code: 'REVIEWER_APPROVAL',
        status: status as ReportingReadinessStatus,
      },
    ],
  };

  render(
    <CalculationQualitySection
      reportCountSummary={reportCountSummary}
      primarySkippedReasons={primarySkippedReasons}
      dataQualityCoverage="100%"
      readinessAssessment={readinessAssessment}
      reviewReasonsLabel="None"
    />,
  );
}

describe('CalculationQualitySection readiness rows', () => {
  it.each([
    ['COMPLETE', 'Complete'],
    ['NEEDS_ATTENTION', 'Needs attention'],
    ['NOT_REVIEWED', 'Not reviewed'],
    ['NOT_APPLICABLE', 'Not applicable'],
    ['LIMITED', 'Limited'],
  ] as const)('renders %s readiness without crashing', (status, label) => {
    renderWithStatus(status);

    expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    expect(screen.getByText(/Evidence for this readiness item/i)).toBeInTheDocument();
  });

  it('renders unexpected runtime readiness values with neutral fallback styling', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderWithStatus('UNKNOWN_STATUS');

    expect(screen.getAllByText('Not reviewed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not reviewed')[1]).toHaveStyle({
      background: '#f8fafc',
      color: '#475569',
      border: '1px solid #cbd5e1',
    });
    expect(warn).toHaveBeenCalledWith('Unexpected reporting readiness status', 'UNKNOWN_STATUS');
  });
});
