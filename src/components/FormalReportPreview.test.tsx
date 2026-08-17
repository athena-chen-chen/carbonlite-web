import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FORMAL_REPORT_DISCLAIMER,
  FORMAL_REPORT_METHODOLOGY,
  FormalReportPreview,
  buildConversionFactorTraceabilityRows,
  formatExecutiveSummaryPreview,
  buildReportExecutiveSummary,
  buildSourceEvidenceRows,
  buildSourceEvidenceSummaryRows,
} from './FormalReportPreview';
import { CalculationTraceabilitySection } from './reports/sections/CalculationTraceabilitySection';
import { ActivityBreakdownSection } from './reports/sections/ActivityBreakdownSection';
import { EmissionFactorsUsedSection } from './reports/sections/EmissionFactorsUsedSection';
import { RecordsRequiringReviewSection } from './reports/sections/RecordsRequiringReviewSection';
import { buildDataReadinessSummary } from './MetricsSummarySection';

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
  it('renders consultant report sections from the shared summary model', async () => {
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
            notes: 'Imported from document extraction.',
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
          sourceAuthority: 'CarbonLite system defaults',
            sourceDocument: 'Pilot default factor library',
            sourceYear: 2025,
            factorType: 'System',
            verified: false,
          },
        ]}
        sourceEvidenceRows={[
          {
            activityType: 'DIESEL',
            quantity: '120',
            unit: 'L',
        sourceFile: 'fuel-invoice.pdf',
        sourceReference: 'fuel-invoice.pdf · Page 1 · Line item 3',
        sourceType: 'PDF Extraction',
        importMethod: 'PDF Extraction',
        recordDate: '2025-01-31',
        matchingStatus: 'Matched',
        reportTreatment: 'Included',
        notes: 'Imported from document extraction.',
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
            factorSource: 'CarbonLite system defaults',
            sourceAuthority: 'CarbonLite system defaults',
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

    expect(screen.getAllByText('CarbonLite').length).toBeGreaterThan(0);
    expect(screen.getByText('Pilot reporting workflow')).toBeInTheDocument();
    expect(screen.getByText('Pilot Emissions Data Readiness Report')).toBeInTheDocument();
    expect(screen.getByText('Prepared for review as part of a pilot emissions data readiness and reporting workflow.')).toBeInTheDocument();
    expect(screen.queryByText('Environmental Reporting Platform')).not.toBeInTheDocument();
    expect(screen.queryByText('Emissions Summary Report')).not.toBeInTheDocument();
    expect(screen.getAllByText('KACH CANADA LTD.').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('2026-01-01 to 2026-12-31').length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('Date Range').length).toBeGreaterThan(0);
    expect(screen.getByText('Prepared by:')).toBeInTheDocument();
    expect(screen.getByText('A. Report Scope')).toBeInTheDocument();
    expect(screen.getByText('B. Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('C. Emissions Hotspots')).toBeInTheDocument();
    expect(screen.getByText('D. Scope Breakdown')).toBeInTheDocument();
    expect(screen.getByText('E. Calculation Quality Summary')).toBeInTheDocument();
    expect(screen.getByText('F. Emissions Breakdown')).toBeInTheDocument();
    expect(screen.getByText('G. Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('H. Emission Factors Used')).toBeInTheDocument();
    expect(screen.getByText('I. Calculation Traceability')).toBeInTheDocument();
    expect(screen.getByText('J. Source Evidence Summary')).toBeInTheDocument();
    expect(screen.getByText(/source files and import methods used to create the activity records/i)).toBeInTheDocument();
    expect(screen.getAllByText('fuel-invoice.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PDF Extraction').length).toBeGreaterThan(0);
    expect(screen.getByText('K. Records Requiring Review')).toBeInTheDocument();
    expect(screen.getByText('L. Methodology and Limitations')).toBeInTheDocument();
    expect(screen.getByText(FORMAL_REPORT_DISCLAIMER)).toBeInTheDocument();
    expect(FORMAL_REPORT_METHODOLOGY).toContain(FORMAL_REPORT_DISCLAIMER);
    expect(FORMAL_REPORT_DISCLAIMER).toContain('not a certified GHG emissions report');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('does not constitute regulatory compliance advice');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('third-party verification');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('audit assurance');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('carbon credit eligibility determination');

    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

    expect(screen.getAllByText('321.60 kgCO2e').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CarbonLite system defaults/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alberta, Canada').length).toBeGreaterThan(0);
    expect(screen.getByText(/Pilot default factor library/)).toBeInTheDocument();
    expect(screen.getAllByText('Unverified / user review required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getByText('Data Readiness Score')).toBeInTheDocument();
    expect(screen.getByText(/Data Quality Coverage reflects the percentage of records/i)).toBeInTheDocument();
    expect(screen.getByText(/Data Readiness Score is a broader pilot readiness signal/i)).toBeInTheDocument();
    expect(screen.getByText(/related but not identical/i)).toBeInTheDocument();
    expect(screen.getByText(/Tracked operational metrics such as Water are retained for review/i)).toBeInTheDocument();
    expect(screen.getAllByText('Diesel').length).toBeGreaterThan(0);
    expect(screen.getByText(FORMAL_REPORT_METHODOLOGY[1])).toBeInTheDocument();
    expect(screen.getByText('100 liters × 2.68 kgCO2e/liter = 268 kgCO2e')).toBeInTheDocument();
    expect(screen.getAllByText('2.68 kgCO2e/L').length).toBeGreaterThan(0);
    expect(screen.getByText('Source File')).toBeInTheDocument();

    expect(screen.queryByText('fuel-invoice.pdf · Page 1 · Line item 3')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Record-Level Source Evidence' }));
    expect(screen.getByText('fuel-invoice.pdf · Page 1 · Line item 3')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    const emissionsBreakdownTable = tables.find((table) =>
      within(table).queryByText('Total Calculated Emissions'),
    );
    expect(emissionsBreakdownTable).toBeTruthy();
    expect(within(emissionsBreakdownTable!).getAllByText('Input Data').length).toBeGreaterThan(0);
    expect(within(emissionsBreakdownTable!).getByText('Calculated Result')).toBeInTheDocument();
    expect(within(emissionsBreakdownTable!).getByText('Diesel')).toBeInTheDocument();
    expect(within(emissionsBreakdownTable!).queryByText('Count')).not.toBeInTheDocument();
  });

  it('shows precise factor values in report factor tables', () => {
    render(
      <EmissionFactorsUsedSection
        formatJurisdiction={(jurisdiction) => jurisdiction || 'Canada - National'}
        conversionFactorsUsed={[
          {
            factorId: 'factor-air-travel',
            activityType: 'AIR_TRAVEL',
            factorName: 'Air Travel - Canada - 2025',
            factorValue: 0.115,
            inputUnit: 'km',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Canada - National',
            sourceAuthority: 'CarbonLite',
            sourceYear: 2025,
            factorType: 'System',
            confidenceLevel: 'LOW',
            verificationStatus: 'PILOT_ESTIMATE',
            assumptions: 'Pilot-stage estimate. Consultant review recommended before official reporting.',
            verified: false,
          },
        ]}
      />,
    );

    expect(screen.getByText('0.115')).toBeInTheDocument();
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pilot Estimate · Consultant Review Recommended').length).toBeGreaterThan(0);
    expect(screen.getByRole('columnheader', { name: 'Source Year' })).toBeInTheDocument();
    expect(screen.getByText('Factor Details / Assumptions')).toBeInTheDocument();
    expect(screen.getByText(/Detailed source, version, confidence level, and assumptions/i)).toBeInTheDocument();
    expect(screen.getByText('Pilot-stage estimate. Consultant review recommended before official reporting.')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Confidence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Assumptions' })).not.toBeInTheDocument();
    expect(screen.queryByText('0.12')).not.toBeInTheDocument();
  });

  it('uses singular denominators for report factor units', () => {
    render(
      <EmissionFactorsUsedSection
        formatJurisdiction={(jurisdiction) => jurisdiction || 'Canada - National'}
        conversionFactorsUsed={[
          {
            factorId: 'factor-gasoline',
            activityType: 'GASOLINE',
            factorName: 'Gasoline - Canada - 2025',
            factorValue: 2.31,
            inputUnit: 'liters',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Canada - National',
            sourceAuthority: 'CarbonLite',
            sourceYear: 2025,
            factorType: 'System',
            confidenceLevel: 'MEDIUM',
            verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
            verified: false,
          },
          {
            factorId: 'factor-hotel',
            activityType: 'HOTEL',
            factorName: 'Hotel - Canada - 2025',
            factorValue: 15,
            inputUnit: 'nights',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Canada - National',
            sourceAuthority: 'CarbonLite',
            sourceYear: 2025,
            factorType: 'System',
            confidenceLevel: 'LOW',
            verificationStatus: 'PILOT_ESTIMATE',
            verified: false,
          },
        ]}
      />,
    );

    expect(screen.getAllByText('kgCO2e/liter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kgCO2e/night').length).toBeGreaterThan(0);
    expect(screen.queryByText('kgCO2e/liters')).not.toBeInTheDocument();
    expect(screen.queryByText('kgCO2e/nights')).not.toBeInTheDocument();
  });

  it('shows pilot electricity factors under internal review even when stored as draft', () => {
    render(
      <EmissionFactorsUsedSection
        formatJurisdiction={(jurisdiction) => jurisdiction || 'Canada - National'}
        conversionFactorsUsed={[
          {
            factorId: 'factor-electricity-ab',
            activityType: 'ELECTRICITY',
            factorName: 'Electricity - Alberta',
            factorValue: 0.53,
            inputUnit: 'kWh',
            resultUnit: 'kgCO2e',
            jurisdiction: 'Alberta, Canada',
            sourceAuthority: 'CarbonLite',
            sourceYear: 2025,
            factorType: 'System',
            confidenceLevel: 'PILOT_ESTIMATE',
            verificationStatus: 'DRAFT',
            verified: false,
          },
        ]}
      />,
    );

    expect(screen.getAllByText('Internal Review Required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pilot Estimate').length).toBeGreaterThan(0);
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('keeps calculation traceability readable with review notes instead of dense factor metadata columns', () => {
    render(
      <CalculationTraceabilitySection
        calculationDetails={[
          {
            activityDataId: 'activity-electricity-ab',
            activityType: 'ELECTRICITY',
            recordDate: '2026-07-20',
            dateEstimated: false,
            reportingYear: 2026,
            recordYear: 2026,
            activityQuantity: 12500,
            activityUnit: 'kWh',
            factorName: 'Electricity - Alberta',
            factorValue: 0.53,
            factorInputUnit: 'kWh',
            factorResultUnit: 'kgCO2e',
            factorYear: 2025,
            sourceYear: 2025,
            factorVerified: false,
            calculatedEmissionsKgCO2e: 6625,
            calculationStatus: 'CALCULATED',
            matchingStatus: 'MATCHED',
            status: 'CALCULATED',
          },
        ]}
        formatRecordUnit={(unit) => String(unit || '-')}
        formatScopeLabel={() => 'Scope 2'}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Review Note' })).toBeInTheDocument();
    expect(screen.getByText('12,500 kWh × 0.53 kgCO2e/kWh = 6,625 kgCO2e')).toBeInTheDocument();
    expect(screen.getByText('Prior-year factor used; review before formal reporting.')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Version' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Assumptions' })).not.toBeInTheDocument();
  });

  it('shows empty states when no records or factors are available', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

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
      trackedMetrics: 0,
      recordsRequiringReview: 1,
      primaryActivityTypes: 'Diesel, Electricity',
      missingFactorCount: 1,
      dataQualityCoverage: '75%',
    });
  });

  it('separates tracked-only Water from records requiring review in preview counts', () => {
    const calculationDetails = [
      ...Array.from({ length: 9 }, (_, index) => ({
        activityDataId: `activity-${index}`,
        activityType: index === 0 ? 'ELECTRICITY' : 'DIESEL',
        recordDate: '2026-07-20',
        dateEstimated: false,
        reportingYear: 2026,
        jurisdiction: 'Canada',
        activityQuantity: 100,
        activityUnit: index === 0 ? 'kWh' : 'liters',
        factorSource: 'CarbonLite',
        factorVerified: false,
        calculatedEmissionsKgCO2e: 100,
        status: 'CALCULATED' as const,
        sourceType: 'SPREADSHEET',
      })),
      {
        activityDataId: 'activity-water',
        activityType: 'WATER',
        recordDate: '2026-07-20',
        dateEstimated: false,
        reportingYear: 2026,
        jurisdiction: 'Canada',
        activityQuantity: 100,
        activityUnit: 'm3',
        factorSource: 'Tracked metric',
        factorVerified: false,
        calculatedEmissionsKgCO2e: 0,
        status: 'TRACKED_ONLY' as const,
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        sourceType: 'SPREADSHEET',
        notes: 'Tracked metric only. No emission factor required.',
      },
    ];
    const summary = buildReportExecutiveSummary({
      totalEstimatedEmissionsKgCO2e: 37285,
      countSummary: {
        totalRecordsFound: 10,
        processedRecords: 9,
        skippedRecords: 1,
        missingFactorRecords: 0,
      },
      matchedActivityEmissions: [
        {
          activityDataId: 'activity-electricity',
          activityType: 'ELECTRICITY',
          quantity: 63600,
          unit: 'kWh',
          estimatedEmissionsKgCO2e: 33247,
          sourceType: 'SPREADSHEET',
          factorId: 'factor-electricity',
        },
      ],
      calculationDetails,
    });

    expect(summary.recordsIncluded).toBe(9);
    expect(summary.trackedMetrics).toBe(1);
    expect(summary.recordsRequiringReview).toBe(0);
    expect(formatExecutiveSummaryPreview(summary)).toBe(
      '37,285 kgCO2e · 9 included · 1 tracked metric',
    );
    expect(formatExecutiveSummaryPreview(summary)).not.toContain('1 require review');
    expect(formatExecutiveSummaryPreview(summary)).not.toContain('1 requires review');

    render(
      <FormalReportPreview
        organizationName="KACH CANADA LTD."
        reportPeriod="2026"
        scopeLabel="Annual"
        generatedAt="2026-08-14"
        usageTotals={usageTotals}
        totalEstimatedEmissionsKgCO2e={37285}
        countSummary={{
          totalRecordsFound: 10,
          processedRecords: 9,
          skippedRecords: 1,
          missingFactorRecords: 0,
        }}
        matchedActivityEmissions={[]}
        conversionFactorsUsed={[]}
        sourceEvidenceRows={[]}
        calculationDetails={calculationDetails}
      />,
    );

    expect(screen.getAllByText('Records Included in GHG Total').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tracked Operational Metrics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Records Requiring Review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Records Requiring Review')[0].parentElement).toHaveTextContent('0');
    expect(screen.queryByText('Records Skipped')).not.toBeInTheDocument();
    expect(screen.queryByText(/Skipped reasons/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tracked operational metrics are retained for review/i)).toBeInTheDocument();
  });

  it('shows singular grammar for one true record requiring review', () => {
    const summary = buildReportExecutiveSummary({
      totalEstimatedEmissionsKgCO2e: 37285,
      countSummary: {
        totalRecordsFound: 10,
        processedRecords: 9,
        skippedRecords: 1,
        missingFactorRecords: 0,
      },
      matchedActivityEmissions: [],
      calculationDetails: [
        {
          activityDataId: 'activity-missing-province',
          activityType: 'ELECTRICITY',
          recordDate: '2026-07-20',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Canada',
          activityQuantity: 100,
          activityUnit: 'kWh',
          factorSource: '',
          factorVerified: false,
          calculatedEmissionsKgCO2e: 0,
          status: 'MISSING_JURISDICTION',
          sourceType: 'SPREADSHEET',
        },
      ],
    });

    expect(summary.recordsRequiringReview).toBe(1);
    expect(summary.trackedMetrics).toBe(0);
    expect(formatExecutiveSummaryPreview(summary)).toBe(
      '37,285 kgCO2e · 9 included · 1 requires review',
    );
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
        'Diesel',
        '2.68',
        'L',
        'kgCO2e',
        'Not specified',
        'Source not specified',
        'Source not specified',
        'Unverified / user review required',
        'Custom',
        'Not specified',
        'Not specified',
        'Assumption not documented. Review recommended before formal reporting.',
        'Source not specified',
        'Source not specified',
        1,
      ],
    ]);
  });

  it('does not render database ids as factor versions and discloses Scope 3 consultant review', () => {
    const rows = buildConversionFactorTraceabilityRows([
      {
        factorId: 'factor-air-travel',
        factorVersionId: 'cmr75gvgt0009gdjbmhpv7zdd',
        activityType: 'AIR_TRAVEL',
        factorName: 'Air Travel - 2025',
        factorValue: 0.115,
        inputUnit: 'km',
        resultUnit: 'kgCO2e',
        sourceAuthority: 'CarbonLite',
        sourceDocument: 'CarbonLite MVP Default Factors v1.0',
        sourceYear: 2025,
        factorType: 'System',
        verified: false,
        confidenceLevel: 'LOW',
        verificationStatus: 'INTERNAL_REVIEW_REQUIRED',
      },
    ]);

    expect(rows[0][7]).toBe('Internal Review Required · Consultant Review Recommended');
    expect(rows[0][10]).toBe('v1.0');
    expect(rows[0][11]).toMatch(/Consultant review recommended/i);
    expect(rows[0]).not.toContain('cmr75gvgt0009gdjbmhpv7zdd');
  });
});

describe('buildSourceEvidenceRows', () => {
  it('summarizes source evidence by source file and treatment counts', () => {
    expect(
      buildSourceEvidenceSummaryRows([
        {
          activityType: 'Electricity',
          quantity: '12,500',
          unit: 'kWh',
          recordDate: '2026-07-20',
          sourceFile: 'Golden Test Data.xlsx',
          sourceType: 'Spreadsheet Import',
          importMethod: 'Spreadsheet Import',
          sourceReference: 'Golden Test Data.xlsx',
          matchingStatus: 'Matched',
          reportTreatment: 'Included',
          notes: '',
        },
        {
          activityType: 'Water',
          quantity: '100',
          unit: 'm3',
          recordDate: '2026-07-20',
          sourceFile: 'Golden Test Data.xlsx',
          sourceType: 'Spreadsheet Import',
          importMethod: 'Spreadsheet Import',
          sourceReference: 'Golden Test Data.xlsx',
          matchingStatus: 'Tracked Metric',
          reportTreatment: 'Tracked Only',
          notes: '',
        },
        {
          activityType: 'Electricity',
          quantity: '100',
          unit: 'kWh',
          recordDate: '2026-07-20',
          sourceFile: 'Golden Test Data.xlsx',
          sourceType: 'Spreadsheet Import',
          importMethod: 'Spreadsheet Import',
          sourceReference: 'Golden Test Data.xlsx',
          matchingStatus: 'Missing Factor',
          reportTreatment: 'Requires Review',
          notes: '',
        },
      ]),
    ).toEqual([
      {
        sourceFile: 'Golden Test Data.xlsx',
        sourceType: 'Spreadsheet Import',
        importMethod: 'Spreadsheet Import',
        sourceReference: 'Golden Test Data.xlsx',
        includedRecords: 1,
        trackedMetrics: 1,
        recordsRequiringReview: 1,
      },
    ]);
  });

  it('keeps source evidence per activity and preserves source references', () => {
    expect(
      buildSourceEvidenceRows([
        {
          activityType: 'ELECTRICITY',
          quantity: 500,
          unit: 'kWh',
          sourceFileName: 'utility.pdf',
          sourceReference: 'utility.pdf',
          sourcePage: 2,
          sourceRow: 3,
          sourceType: 'AI_EXTRACTION',
          sourceTextSnippet: 'Metered usage 500 kWh',
          recordDate: '2026-01-31',
        },
        {
          activityType: 'GASOLINE',
          quantity: 100,
          unit: 'L',
          sourceType: 'MANUAL',
          recordDate: '2026-02-01',
        },
      ]),
    ).toEqual([
      {
        activityType: 'Electricity',
        quantity: '500',
        unit: 'kWh',
        recordDate: '2026-01-31',
        sourceFile: 'utility.pdf',
        sourceReference: 'utility.pdf',
        sourceType: 'PDF Extraction',
        importMethod: 'PDF Extraction',
        matchingStatus: 'Source Review Required',
        reportTreatment: 'Source Review Required',
        notes: 'Metered usage 500 kWh',
      },
      {
        activityType: 'Gasoline',
        quantity: '100',
        unit: 'L',
        recordDate: '2026-02-01',
        sourceFile: 'Manual Entry',
        sourceReference: 'Manual Entry',
        sourceType: 'Manual Entry',
        importMethod: 'Manual Entry',
        matchingStatus: 'Source Review Required',
        reportTreatment: 'Source Review Required',
        notes: '',
      },
    ]);
  });

  it('does not label spreadsheet imports as PDF extraction in source evidence', () => {
    expect(
      buildSourceEvidenceRows([
        {
          activityType: 'ELECTRICITY',
          quantity: 12500,
          unit: 'kWh',
          sourceFileName: 'Golden Test Data.xlsx',
          sourceReference: 'PDF extraction',
          sourceType: 'AI_EXTRACTION',
          recordDate: '2026-07-20',
        },
      ]),
    ).toEqual([
      {
        activityType: 'Electricity',
        quantity: '12,500',
        unit: 'kWh',
        recordDate: '2026-07-20',
        sourceFile: 'Golden Test Data.xlsx',
        sourceReference: 'Golden Test Data.xlsx',
        sourceType: 'Spreadsheet Import',
        importMethod: 'Spreadsheet Import',
        matchingStatus: 'Source Review Required',
        reportTreatment: 'Source Review Required',
        notes: '',
      },
    ]);
  });

  it('marks tracked-only Water as source evidence without requiring review', () => {
    const rows = buildSourceEvidenceRows(
      [
        {
          id: 'water-1',
          activityType: 'WATER',
          quantity: 100,
          unit: 'm3',
          recordDate: '2026-07-20',
          sourceFileName: 'Golden Test Data.xlsx',
          sourceReference: 'PDF extraction',
          sourceType: 'AI_EXTRACTION',
        },
      ],
      [
        {
          activityDataId: 'water-1',
          activityType: 'WATER',
          recordDate: '2026-07-20',
          dateEstimated: false,
          reportingYear: 2026,
          jurisdiction: 'Canada',
          activityQuantity: 100,
          activityUnit: 'm3',
          calculationStatus: 'TRACKED_ONLY',
          matchingStatus: 'TRACKED_ONLY',
          status: 'TRACKED_ONLY',
        },
      ],
    );

    expect(rows[0]).toMatchObject({
      sourceFile: 'Golden Test Data.xlsx',
      sourceType: 'Spreadsheet Import',
      importMethod: 'Spreadsheet Import',
      sourceReference: 'Golden Test Data.xlsx',
      matchingStatus: 'Tracked Metric',
      reportTreatment: 'Tracked Only',
    });
    expect(rows[0].notes).toContain('Water is tracked as an operational metric');
    expect(rows[0].notes).toContain('excluded from GHG emissions totals');
  });

  it('uses a safe fallback when an imported source file is unavailable', () => {
    const rows = buildSourceEvidenceRows([
      {
        activityType: 'ELECTRICITY',
        quantity: 250,
        unit: 'kWh',
        sourceReference: 'Spreadsheet import',
        sourceType: 'SPREADSHEET',
        recordDate: '2026-07-20',
      },
    ]);

    expect(rows[0]).toMatchObject({
      sourceFile: 'Source file unavailable',
      sourceReference: 'Source file unavailable',
      sourceType: 'Spreadsheet Import',
      importMethod: 'Spreadsheet Import',
    });
    expect(rows[0].sourceReference).not.toMatch(/Spreadsheet import|PDF extraction|cmr|document id/i);
  });

  it('uses canonical matched calculation fields instead of stale import notes', () => {
    const rows = buildSourceEvidenceRows(
      [
        {
          id: 'activity-electricity-ab',
          activityType: 'ELECTRICITY',
          quantity: 12500,
          unit: 'kWh',
          sourceType: 'MANUAL',
          notes: 'No matching conversion factor is available for this record.',
        },
      ],
      [
        {
          activityDataId: 'activity-electricity-ab',
          activityType: 'ELECTRICITY',
          recordDate: '2026-07-20',
          dateEstimated: false,
          reportingYear: 2026,
          recordYear: 2026,
          jurisdiction: 'Alberta, Canada',
          activityQuantity: 12500,
          activityUnit: 'kWh',
          factorName: 'Electricity - Alberta',
          factorYear: 2025,
          factorSource: 'CarbonLite',
          factorVerified: false,
          calculatedEmission: 6625,
          calculatedEmissionsKgCO2e: 6625,
          calculationStatus: 'CALCULATED',
          matchingStatus: 'MATCHED',
          status: 'CALCULATED',
          sourceType: 'MANUAL',
        },
      ],
    );

    expect(rows[0].notes).toBe(
      'Matched factor: Electricity - Alberta - 2025. Using latest available prior-year factor because no factor was found for the record year.',
    );
    expect(rows[0].notes).not.toMatch(/No matching conversion factor is available/i);
  });
});

describe('report data quality and source consistency', () => {
  it('does not count tracked-only Water as requiring review', () => {
    const summary = buildDataReadinessSummary([
      {
        activityDataId: 'electricity-1',
        activityType: 'ELECTRICITY',
        recordDate: '2026-07-20',
        dateEstimated: false,
        reportingYear: 2026,
        jurisdiction: 'Alberta, Canada',
        jurisdictionRegion: 'Alberta',
        activityQuantity: 12500,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        factorInputUnit: 'kWh',
        factorResultUnit: 'kgCO2e',
        calculatedEmissionsKgCO2e: 6625,
        calculationStatus: 'CALCULATED',
        matchingStatus: 'MATCHED',
        status: 'CALCULATED',
        sourceType: 'AI_EXTRACTION',
        sourceFileName: 'Golden Test Data.xlsx',
      },
      {
        activityDataId: 'water-1',
        activityType: 'WATER',
        recordDate: '2026-07-20',
        dateEstimated: false,
        reportingYear: 2026,
        jurisdiction: 'Canada',
        activityQuantity: 100,
        activityUnit: 'm3',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        status: 'TRACKED_ONLY',
        sourceType: 'AI_EXTRACTION',
        sourceFileName: 'Golden Test Data.xlsx',
        sourceReference: 'PDF extraction',
      },
    ]);

    expect(summary.recordsReadyForCalculation).toBe(1);
    expect(summary.trackedOnlyCount).toBe(1);
    expect(summary.recordsRequiringReview).toBe(0);
    expect(summary.missingFactorCount).toBe(0);
    expect(summary.missingJurisdictionCount).toBe(0);
    expect(summary.invalidUnitCount).toBe(0);
  });

  it('uses spreadsheet labels in activity breakdown instead of stale PDF extraction references', () => {
    render(
      <ActivityBreakdownSection
        matchedActivityEmissions={[
          {
            activityDataId: 'electricity-1',
            activityType: 'ELECTRICITY',
            quantity: 12500,
            unit: 'kWh',
            estimatedEmissionsKgCO2e: 6625,
            sourceType: 'AI_EXTRACTION',
            sourceFileName: 'Golden Test Data.xlsx',
            sourceReference: 'PDF extraction',
            factorId: 'factor-electricity-ab',
          },
        ]}
      />,
    );

    expect(screen.getByText('Golden Test Data.xlsx · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.queryByText('PDF extraction')).not.toBeInTheDocument();
  });
});

describe('RecordsRequiringReviewSection', () => {
  it('shows Water as tracked metric without Fix record action', () => {
    render(
      <RecordsRequiringReviewSection
        formatRecordUnit={(unit) => String(unit ?? '')}
        calculationDetails={[
          {
            activityDataId: 'water-1',
            activityType: 'WATER',
            recordDate: '2026-07-20',
            dateEstimated: false,
            reportingYear: 2026,
            jurisdiction: 'Canada',
            activityQuantity: 100,
            activityUnit: 'm3',
            factorSource: 'Tracked metric',
            factorVerified: false,
            calculationStatus: 'TRACKED_ONLY',
            matchingStatus: 'TRACKED_ONLY',
            status: 'TRACKED_ONLY',
            sourceType: 'MANUAL',
          },
        ]}
      />,
    );

    expect(screen.getByText('Tracked Metrics')).toBeInTheDocument();
    expect(screen.getByText('Tracked Metric')).toBeInTheDocument();
    expect(screen.getByText(/Water is tracked as an operational metric/i)).toBeInTheDocument();
    expect(screen.getByText(/No action required unless emissions factor is provided/i)).toBeInTheDocument();
    expect(screen.queryByText('Fix record')).not.toBeInTheDocument();
  });

  it('uses spreadsheet labels for tracked metric source references', () => {
    render(
      <RecordsRequiringReviewSection
        formatRecordUnit={(unit) => String(unit ?? '')}
        calculationDetails={[
          {
            activityDataId: 'water-1',
            activityType: 'WATER',
            recordDate: '2026-07-20',
            dateEstimated: false,
            reportingYear: 2026,
            jurisdiction: 'Canada',
            activityQuantity: 100,
            activityUnit: 'm3',
            calculationStatus: 'TRACKED_ONLY',
            matchingStatus: 'TRACKED_ONLY',
            status: 'TRACKED_ONLY',
            sourceType: 'AI_EXTRACTION',
            sourceFileName: 'Golden Test Data.xlsx',
            sourceReference: 'PDF extraction',
          },
        ]}
      />,
    );

    expect(screen.getByText('Golden Test Data.xlsx · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.queryByText(/Golden Test Data\.xlsx · PDF extraction/i)).not.toBeInTheDocument();
  });
});
