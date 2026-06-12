import { render, screen, within } from '@testing-library/react';
import {
  FORMAL_REPORT_DISCLAIMER,
  FORMAL_REPORT_METHODOLOGY,
  FormalReportPreview,
  buildConversionFactorTraceabilityRows,
  buildReportExecutiveSummary,
  buildSourceEvidenceRows,
} from './FormalReportPreview';

const usageTotals = {
  fuel: 120,
  electricity: 450,
  fuelUnitLabel: 'Grouped by type and unit',
  electricityUnitLabel: 'kWh',
  fuelUsageBreakdown: [
    { activityType: 'DIESEL', total: 120, unit: 'L' },
  ],
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
          jurisdiction: 'Alberta, Canada',
          sourceAuthority: 'MVP Default',
            sourceDocument: 'Pilot default factor library',
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
        calculationDetails={[
          {
            activityDataId: 'activity-1',
            activityType: 'DIESEL',
            recordDate: '2025-01-31T00:00:00.000Z',
            dateEstimated: false,
            reportingYear: 2025,
            jurisdiction: 'Alberta, Canada',
            activityQuantity: 100,
            activityUnit: 'L',
            factorId: 'factor-1',
            factorName: 'Diesel factor',
            factorValue: 2.68,
            factorInputUnit: 'L',
            factorResultUnit: 'kgCO2e',
            factorPriority: 'UNVERIFIED_SYSTEM',
            factorSource: 'MVP Default',
            sourceAuthority: 'MVP Default',
            sourceDocument: 'Pilot default factor library',
            sourceUrl: null,
            sourceYear: 2025,
            factorVerified: false,
            factorType: 'System',
            calculatedEmissionsKgCO2e: 268,
            status: 'CALCULATED',
            sourceType: 'MANUAL',
            sourceReference: 'fuel-invoice.pdf',
          },
        ]}
      />,
    );

    expect(screen.getAllByText('CarbonLite AI').length).toBeGreaterThan(0);
    expect(screen.getByText('Environmental Reporting Platform')).toBeInTheDocument();
    expect(screen.getByText('Emissions Summary Report')).toBeInTheDocument();
    expect(screen.getAllByText('KACH CANADA LTD.').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('2026-01-01 to 2026-12-31').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Date Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Prepared by:')).toBeInTheDocument();
    expect(screen.getByText('A. Report Scope')).toBeInTheDocument();
    expect(screen.getByText('B. Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('C. Calculation Quality Summary')).toBeInTheDocument();
    expect(screen.getByText('D. Totals by Metric')).toBeInTheDocument();
    expect(screen.getByText('E. Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('F. Conversion Factors Used')).toBeInTheDocument();
    expect(screen.getByText('G. Calculation Details')).toBeInTheDocument();
    expect(screen.getByText('H. Source Evidence')).toBeInTheDocument();
    expect(screen.getByText('I. Methodology and Disclaimer')).toBeInTheDocument();
    expect(screen.getAllByText('321.6 kgCO2e').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MVP Default').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alberta, Canada').length).toBeGreaterThan(0);
    expect(screen.getByText('Pilot default factor library')).toBeInTheDocument();
    expect(screen.getByText('Unverified / user review required')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DIESEL').length).toBeGreaterThan(0);
    expect(screen.getByText(FORMAL_REPORT_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByText(FORMAL_REPORT_METHODOLOGY[1])).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    expect(within(tables[0]).getByText('Carbon Emissions')).toBeInTheDocument();
    expect(within(tables[0]).getByText('Fuel Usage — Diesel')).toBeInTheDocument();
    expect(within(tables[0]).queryByText('Count')).not.toBeInTheDocument();
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
          fuelUnitLabel: 'Grouped by type and unit',
          electricityUnitLabel: 'kWh',
          fuelUsageBreakdown: [],
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
        calculationDetails={[]}
      />,
    );

    expect(screen.getByText('No metrics available for this report scope.')).toBeInTheDocument();
    expect(screen.getByText('No activity records with matching conversion factors.')).toBeInTheDocument();
    expect(screen.getByText('No conversion factors found for this report scope.')).toBeInTheDocument();
    expect(screen.getByText('No source evidence available.')).toBeInTheDocument();
  });
});

describe('Version 1 report presentation data', () => {
  it('derives executive summary values from the same report records and metrics', () => {
    expect(
      buildReportExecutiveSummary({
        totalEstimatedEmissionsKgCO2e: 268,
        countSummary: {
          totalRecordsFound: 4,
          processedRecords: 3,
          skippedRecords: 1,
          missingFactorRecords: 1,
        },
        matchedActivityEmissions: [
          {
            activityDataId: 'activity-1',
            activityType: 'DIESEL',
            quantity: 100,
            unit: 'L',
            estimatedEmissionsKgCO2e: 268,
            sourceType: 'MANUAL',
            factorId: 'factor-1',
          },
          {
            activityDataId: 'activity-2',
            activityType: 'ELECTRICITY',
            quantity: 100,
            unit: 'kWh',
            estimatedEmissionsKgCO2e: 40,
            sourceType: 'CSV',
            factorId: 'factor-2',
          },
        ],
      }),
    ).toEqual({
      estimatedEmissions: '268 kgCO2e',
      recordsIncluded: 3,
      recordsSkipped: 1,
      primaryActivityTypes: 'DIESEL, ELECTRICITY',
      missingFactorCount: 1,
      dataQualityCoverage: '75%',
    });
  });

  it('formats factor traceability fallbacks and review status', () => {
    expect(
      buildConversionFactorTraceabilityRows([
        {
          factorId: 'factor-1',
          activityType: 'DIESEL',
          factorName: 'Diesel factor',
          factorValue: 2.68,
          inputUnit: 'L',
          resultUnit: 'kgCO2e',
          sourceAuthority: '',
          sourceDocument: null,
          sourceYear: null,
          factorType: 'Custom',
          verified: false,
        },
      ]),
    ).toEqual([
      [
        'DIESEL',
        'Not specified',
        'L',
        2.68,
        'kgCO2e',
        'Source not specified',
        'Source not specified',
        'Source not specified',
        'Source not specified',
        'Unverified / user review required',
        'Custom',
      ],
    ]);
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
