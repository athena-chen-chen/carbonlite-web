import { render, screen, within } from '@testing-library/react';
import {
  FORMAL_REPORT_DISCLAIMER,
  FormalReportPreview,
  buildSourceEvidenceRows,
} from './FormalReportPreview';

const usageTotals = {
  fuel: 120,
  electricity: 450,
  fuelUnitLabel: 'L / m3',
  electricityUnitLabel: 'kWh',
};

const countSummary = {
  totalRecordsFound: 2,
  processedRecords: 2,
  skippedRecords: 0,
  missingFactorRecords: 0,
};

describe('FormalReportPreview', () => {
  it('renders consultant report sections from the shared summary model', () => {
    render(
      <FormalReportPreview
        organizationName="KACH CANADA LTD."
        reportPeriod="2026-01-01 to 2026-12-31"
        scopeLabel="Date Range"
        generatedAt="2026-05-28"
        usageTotals={usageTotals}
        totalEstimatedEmissionsKgCO2e={321.6}
        countSummary={countSummary}
        matchedActivityEmissions={[
          {
            activityDataId: 'activity-1',
            activityType: 'DIESEL',
            quantity: 120,
            unit: 'L',
            estimatedEmissionsKgCO2e: 321.6,
            sourceType: 'AI_EXTRACTION',
            sourceReference: 'fuel-invoice.pdf',
            notes: 'Imported from AI extraction.',
            factorId: 'factor-1',
          },
        ]}
        conversionFactorsUsed={[
          {
            factorId: 'factor-1',
            activityType: 'DIESEL',
            factorName: 'Diesel factor',
            factorValue: 2.68,
            inputUnit: 'L',
            resultUnit: 'kgCO2e',
            sourceAuthority: 'MVP Default',
            sourceYear: 2025,
            factorType: 'System',
            verified: false,
          },
        ]}
        sourceEvidenceRows={[
          {
            sourceReference: 'fuel-invoice.pdf',
            sourceType: 'AI Extraction',
            recordCount: 1,
            notes: 'Imported from AI extraction.',
          },
        ]}
      />,
    );

    expect(screen.getByText('Consultant Report View')).toBeInTheDocument();
    expect(screen.getByText('A. Report Scope')).toBeInTheDocument();
    expect(screen.getByText('B. Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('C. Totals by Metric')).toBeInTheDocument();
    expect(screen.getByText('D. Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('E. Conversion Factors Used')).toBeInTheDocument();
    expect(screen.getByText('F. Source Evidence')).toBeInTheDocument();
    expect(screen.getByText('G. Methodology and Disclaimer')).toBeInTheDocument();
    expect(screen.getAllByText('321.6 kgCO2e').length).toBeGreaterThan(0);
    expect(screen.getByText('MVP Default')).toBeInTheDocument();
    expect(screen.getByText(FORMAL_REPORT_DISCLAIMER)).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    expect(within(tables[0]).getByText('CARBON_EMISSION')).toBeInTheDocument();
  });

  it('shows empty states when no records or factors are available', () => {
    render(
      <FormalReportPreview
        organizationName="Workspace"
        reportPeriod="Selected records"
        scopeLabel="Selected Records (0)"
        generatedAt="2026-05-28"
        usageTotals={{
          fuel: 0,
          electricity: 0,
          fuelUnitLabel: 'L / m3',
          electricityUnitLabel: 'kWh',
        }}
        totalEstimatedEmissionsKgCO2e={0}
        countSummary={{
          totalRecordsFound: 0,
          processedRecords: 0,
          skippedRecords: 0,
          missingFactorRecords: 0,
        }}
        matchedActivityEmissions={[]}
        conversionFactorsUsed={[]}
        sourceEvidenceRows={[]}
      />,
    );

    expect(screen.getByText('No metrics available for this report scope.')).toBeInTheDocument();
    expect(screen.getByText('No activity records with matching conversion factors.')).toBeInTheDocument();
    expect(screen.getByText('No conversion factors found for this report scope.')).toBeInTheDocument();
    expect(screen.getByText('No source evidence available.')).toBeInTheDocument();
  });
});

describe('buildSourceEvidenceRows', () => {
  it('groups source evidence by source reference and source type', () => {
    expect(
      buildSourceEvidenceRows([
        {
          sourceReference: 'utility.pdf',
          sourceType: 'AI_EXTRACTION',
          notes: 'Page 1',
        },
        {
          sourceReference: 'utility.pdf',
          sourceType: 'AI_EXTRACTION',
          notes: 'Page 2',
        },
      ]),
    ).toEqual([
      {
        sourceReference: 'utility.pdf',
        sourceType: 'AI Extraction',
        recordCount: 2,
        notes: 'Page 1; Page 2',
      },
    ]);
  });
});
