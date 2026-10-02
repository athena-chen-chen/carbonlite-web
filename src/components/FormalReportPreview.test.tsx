import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FORMAL_REPORT_DISCLAIMER,
  FORMAL_REPORT_METHODOLOGY,
  FormalReportPreview,
  buildConversionFactorTraceabilityRows,
  buildEmissionFactorsUsedInventory,
  formatExecutiveSummaryPreview,
  buildReportCountSummary,
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

function reportFactor(overrides: Record<string, unknown>) {
  return {
    factorId: 'factor-electricity',
    activityType: 'ELECTRICITY',
    factorName: 'Electricity - Alberta',
    factorValue: 0.53,
    inputUnit: 'kWh',
    resultUnit: 'kgCO2e',
    jurisdiction: 'Alberta, Canada',
    sourceAuthority: 'CarbonLite',
    sourceYear: 2026,
    factorType: 'System',
    verified: false,
    ...overrides,
  } as any;
}

function calculatedDetail(overrides: Record<string, unknown>) {
  return {
    activityDataId: 'activity-electricity',
    activityType: 'ELECTRICITY',
    recordDate: '2026-03-01',
    dateEstimated: false,
    reportingYear: 2026,
    jurisdiction: 'Alberta, Canada',
    activityQuantity: 980,
    activityUnit: 'kWh',
    factorId: 'factor-electricity',
    factorName: 'Electricity - Alberta',
    factorValue: 0.53,
    factorInputUnit: 'kWh',
    factorResultUnit: 'kgCO2e',
    factorSource: 'CarbonLite',
    sourceAuthority: 'CarbonLite',
    sourceYear: 2026,
    factorVerified: false,
    factorType: 'System',
    calculatedEmissionsKgCO2e: 519.4,
    calculationStatus: 'CALCULATED',
    status: 'CALCULATED',
    sourceType: 'DOCUMENT_AI',
    sourceReference: 'MARCH-ELEC-001',
    ...overrides,
  } as any;
}

describe('FormalReportPreview', () => {
  it('counts distinct actual emission factors and excludes tracked-only metrics', () => {
    const inventory = buildEmissionFactorsUsedInventory(
      [
        reportFactor({ factorId: 'factor-electricity', factorName: 'Electricity - Alberta' }),
        reportFactor({
          factorId: 'factor-hotel',
          activityType: 'HOTEL',
          factorName: 'Hotel stays',
          factorValue: 15,
          inputUnit: 'nights',
        }),
        reportFactor({
          factorId: null,
          activityType: 'WATER',
          factorName: 'N/A — Tracked Metric',
          factorValue: '',
          inputUnit: 'm3',
        }),
      ],
      [
        calculatedDetail({ activityDataId: 'activity-electricity', factorId: 'factor-electricity' }),
        calculatedDetail({
          activityDataId: 'activity-hotel',
          activityType: 'HOTEL',
          factorId: 'factor-hotel',
          factorName: 'Hotel stays',
          factorValue: 15,
          factorInputUnit: 'nights',
          activityUnit: 'nights',
          calculatedEmissionsKgCO2e: 60,
        }),
        calculatedDetail({
          activityDataId: 'activity-water',
          activityType: 'WATER',
          factorId: null,
          factorName: null,
          factorValue: null,
          factorInputUnit: null,
          calculationStatus: 'TRACKED_ONLY',
          status: 'TRACKED_ONLY',
          scopeOverride: 'TRACKED_METRIC',
          calculatedEmissionsKgCO2e: null,
        }),
      ],
    );

    expect(inventory.map((factor) => factor.factorName)).toEqual([
      'Electricity - Alberta',
      'Hotel stays',
    ]);
  });

  it('counts a reused factor once and keeps the used record count', () => {
    const inventory = buildEmissionFactorsUsedInventory(
      [reportFactor({ factorId: 'factor-electricity' })],
      [
        calculatedDetail({ activityDataId: 'activity-electricity-1', factorId: 'factor-electricity' }),
        calculatedDetail({ activityDataId: 'activity-electricity-2', factorId: 'factor-electricity' }),
      ],
    );

    expect(inventory).toHaveLength(1);
    expect(inventory[0].usedRecordsCount).toBe(2);
  });

  it('returns no emission factors for tracked metrics only', () => {
    const inventory = buildEmissionFactorsUsedInventory(
      [
        reportFactor({
          factorId: null,
          activityType: 'WATER',
          factorName: 'No factor required',
          factorValue: '',
          inputUnit: 'm3',
        }),
      ],
      [
        calculatedDetail({
          activityDataId: 'activity-water',
          activityType: 'WATER',
          factorId: null,
          factorName: null,
          factorValue: null,
          calculationStatus: 'TRACKED_ONLY',
          status: 'TRACKED_ONLY',
          scopeOverride: 'TRACKED_METRIC',
          calculatedEmissionsKgCO2e: null,
        }),
      ],
    );

    expect(inventory).toEqual([]);
  });

  it('excludes missing-factor records from the emission factor inventory', () => {
    const inventory = buildEmissionFactorsUsedInventory(
      [
        reportFactor({ factorId: 'factor-electricity' }),
        reportFactor({
          factorId: null,
          activityType: 'HOTEL',
          factorName: 'Missing factor',
          factorValue: '',
          inputUnit: 'nights',
        }),
      ],
      [
        calculatedDetail({ activityDataId: 'activity-electricity', factorId: 'factor-electricity' }),
        calculatedDetail({
          activityDataId: 'activity-hotel',
          activityType: 'HOTEL',
          factorId: null,
          factorName: null,
          factorValue: null,
          calculationStatus: 'MISSING_FACTOR',
          status: 'MISSING_FACTOR',
          calculatedEmissionsKgCO2e: null,
        }),
      ],
    );

    expect(inventory).toHaveLength(1);
    expect(inventory[0].factorName).toBe('Electricity - Alberta');
  });

  it('renders only actual factors in the Emission Factors Used report table', async () => {
    render(
      <FormalReportPreview
        organizationName="KACH CANADA LTD."
        reportPeriod="2026-03-01 to 2026-03-31"
        scopeLabel="Selected Documents"
        generatedAt="2026-10-01"
        usageTotals={usageTotals}
        totalEstimatedEmissionsKgCO2e={579.4}
        countSummary={{ totalRecordsFound: 3, processedRecords: 2, skippedRecords: 1, missingFactorRecords: 0 }}
        matchedActivityEmissions={[]}
        conversionFactorsUsed={[
          reportFactor({ factorId: 'factor-electricity', factorName: 'Electricity - Alberta' }),
          reportFactor({
            factorId: 'factor-hotel',
            activityType: 'HOTEL',
            factorName: 'Hotel stays',
            factorValue: 15,
            inputUnit: 'nights',
          }),
          reportFactor({
            factorId: null,
            activityType: 'WATER',
            factorName: 'N/A — Tracked Metric',
            factorValue: '',
            inputUnit: 'm3',
          }),
        ]}
        sourceEvidenceRows={[]}
        calculationDetails={[
          calculatedDetail({ activityDataId: 'activity-electricity', factorId: 'factor-electricity' }),
          calculatedDetail({
            activityDataId: 'activity-hotel',
            activityType: 'HOTEL',
            factorId: 'factor-hotel',
            factorName: 'Hotel stays',
            factorValue: 15,
            factorInputUnit: 'nights',
            activityUnit: 'nights',
            calculatedEmissionsKgCO2e: 60,
          }),
          calculatedDetail({
            activityDataId: 'activity-water',
            activityType: 'WATER',
            factorId: null,
            factorName: null,
            factorValue: null,
            calculationStatus: 'TRACKED_ONLY',
            status: 'TRACKED_ONLY',
            scopeOverride: 'TRACKED_METRIC',
            calculatedEmissionsKgCO2e: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText('2 factors used')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Expand I. Emission Factors Used' }));

    const factorSection = screen.getByText('Emission Factors Summary').closest('div');
    expect(factorSection).toBeTruthy();
    expect(within(factorSection!).getAllByText('Electricity - Alberta').length).toBeGreaterThan(0);
    expect(within(factorSection!).getAllByText('Hotel stays').length).toBeGreaterThan(0);
    expect(within(factorSection!).queryByText('Water')).not.toBeInTheDocument();
    expect(within(factorSection!).queryByText('N/A — Tracked Metric')).not.toBeInTheDocument();
  });

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
    expect(screen.getByText('A. Reporting Boundary')).toBeInTheDocument();
    expect(screen.getByText('B. Report Scope')).toBeInTheDocument();
    expect(screen.getByText('C. Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('D. Emissions Hotspots')).toBeInTheDocument();
    expect(screen.getByText('E. Scope Breakdown')).toBeInTheDocument();
    expect(screen.getByText('F. Calculation Quality Summary')).toBeInTheDocument();
    expect(screen.getByText('G. Emissions Breakdown')).toBeInTheDocument();
    expect(screen.getByText('H. Activity Breakdown')).toBeInTheDocument();
    expect(screen.getByText('I. Emission Factors Used')).toBeInTheDocument();
    expect(screen.getByText('J. Calculation Traceability')).toBeInTheDocument();
    expect(screen.getByText('K. Source Evidence Summary')).toBeInTheDocument();
    expect(screen.getByText(/source files and import methods used to create the activity records/i)).toBeInTheDocument();
    expect(screen.getAllByText('fuel-invoice.pdf').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PDF Extraction').length).toBeGreaterThan(0);
    expect(screen.getByText('L. Records Requiring Review')).toBeInTheDocument();
    expect(screen.getByText('M. Methodology and Limitations')).toBeInTheDocument();
    expect(screen.getByText(FORMAL_REPORT_DISCLAIMER)).toBeInTheDocument();
    expect(FORMAL_REPORT_METHODOLOGY).toContain(FORMAL_REPORT_DISCLAIMER);
    expect(FORMAL_REPORT_DISCLAIMER).toContain('not a certified GHG emissions report');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('does not constitute regulatory compliance advice');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('third-party verification');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('audit assurance');
    expect(FORMAL_REPORT_DISCLAIMER).toContain('carbon credit eligibility determination');

    await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

    expect(screen.getAllByText('321.60 kg CO₂e').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CarbonLite system defaults/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Alberta, Canada').length).toBeGreaterThan(0);
    expect(screen.getByText(/Pilot default factor library/)).toBeInTheDocument();
    expect(screen.getAllByText('Unverified / user review required').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getByText('Emissions Workflow Readiness')).toBeInTheDocument();
    expect(screen.getByText(/Calculation Coverage is calculated emission-bearing records divided by eligible emission-bearing records/i)).toBeInTheDocument();
    expect(screen.getByText(/Emissions Workflow Readiness is the percentage of draft or imported records/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculation Coverage and Emissions Workflow Readiness may differ/i)).toBeInTheDocument();
    expect(screen.getByText(/Tracked-only operational metrics are retained for review but excluded from the Calculation Coverage denominator/i)).toBeInTheDocument();
    expect(screen.getAllByText('Diesel').length).toBeGreaterThan(0);
    expect(screen.getByText(FORMAL_REPORT_METHODOLOGY[1])).toBeInTheDocument();
    expect(screen.getByText('100 liters × 2.68 kg CO₂e/liter = 268 kg CO₂e')).toBeInTheDocument();
    expect(screen.getAllByText('2.68 kg CO₂e/L').length).toBeGreaterThan(0);
    expect(screen.getByText('Source File')).toBeInTheDocument();

    expect(screen.getByText('1 record-level reference')).toBeInTheDocument();
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
            factorName: 'Business Travel - Accommodation - Canada - 2025',
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

    expect(screen.getAllByText('kg CO₂e/liter').length).toBeGreaterThan(0);
    expect(screen.getAllByText('kg CO₂e/night').length).toBeGreaterThan(0);
    expect(screen.queryByText('kg CO₂e/liters')).not.toBeInTheDocument();
    expect(screen.queryByText('kg CO₂e/nights')).not.toBeInTheDocument();
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
    expect(screen.getByText('12,500 kWh × 0.53 kg CO₂e/kWh = 6,625 kg CO₂e')).toBeInTheDocument();
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
      estimatedEmissions: '268 kg CO₂e',
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
      '37,285 kg CO₂e · 9 included · 1 tracked metric',
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

  it('reports the carbonlite needs-review first import without duplicate accommodation or tracked-metric coverage drag', async () => {
    const calculationDetails = [
      {
        activityDataId: 'activity-march-elec-001',
        activityType: 'ELECTRICITY',
        recordDate: '2026-03-01',
        dateEstimated: false,
        reportingYear: 2026,
        recordYear: 2026,
        jurisdiction: 'Alberta, Canada',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        activityQuantity: 980,
        activityUnit: 'kWh',
        factorName: 'Electricity - Alberta',
        factorValue: 0.53,
        factorInputUnit: 'kWh',
        factorResultUnit: 'kgCO2e',
        factorSource: 'CarbonLite',
        factorVerified: false,
        calculatedEmissionsKgCO2e: 519.4,
        status: 'CALCULATED' as const,
        scopeOverride: 'SCOPE_2',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceReference: 'MARCH-ELEC-001',
        sourceRow: 2,
      },
      {
        activityDataId: 'activity-march-water-007',
        activityType: 'WATER',
        recordDate: '2026-03-07',
        dateEstimated: false,
        reportingYear: 2026,
        jurisdiction: 'Alberta, Canada',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        activityQuantity: 18,
        activityUnit: 'm3',
        factorSource: 'Tracked metric',
        factorVerified: false,
        calculatedEmissionsKgCO2e: 0,
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        status: 'TRACKED_ONLY' as const,
        scopeOverride: 'TRACKED_METRIC',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceReference: 'MARCH-WATER-007',
        sourceRow: 8,
      },
      {
        activityDataId: 'activity-march-hotel-010',
        activityType: 'HOTEL',
        recordDate: '2026-03-10',
        dateEstimated: false,
        reportingYear: 2026,
        recordYear: 2026,
        jurisdiction: 'Ontario, Canada',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
        activityQuantity: 4,
        activityUnit: 'nights',
        factorName: 'Business Travel - Accommodation - Ontario - 2026',
        factorValue: 15,
        factorInputUnit: 'nights',
        factorResultUnit: 'kgCO2e',
        factorSource: 'CarbonLite',
        factorVerified: false,
        calculatedEmissionsKgCO2e: 60,
        status: 'CALCULATED' as const,
        scopeOverride: 'SCOPE_3',
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceReference: 'MARCH-HOTEL-010',
        sourceRow: 11,
      },
    ];
    const reportCountSummary = buildReportCountSummary(
      {
        totalRecordsFound: 3,
        processedRecords: 3,
        skippedRecords: 0,
        missingFactorRecords: 0,
      },
      calculationDetails,
    );
    const matchedActivityEmissions = [
      {
        activityDataId: 'activity-march-elec-001',
        activityType: 'ELECTRICITY',
        quantity: 980,
        unit: 'kWh',
        estimatedEmissionsKgCO2e: 519.4,
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceReference: 'MARCH-ELEC-001',
        factorId: 'factor-electricity-ab',
      },
      {
        activityDataId: 'activity-march-hotel-010',
        activityType: 'HOTEL',
        quantity: 4,
        unit: 'nights',
        estimatedEmissionsKgCO2e: 60,
        sourceType: 'SPREADSHEET',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceReference: 'MARCH-HOTEL-010',
        factorId: 'factor-hotel-on',
      },
    ];
    const executiveSummary = buildReportExecutiveSummary({
      totalEstimatedEmissionsKgCO2e: 579.4,
      countSummary: reportCountSummary,
      matchedActivityEmissions,
      calculationDetails,
    });
    const sourceEvidenceRows = buildSourceEvidenceRows(
      [
        {
          id: 'activity-march-elec-001',
          activityType: 'ELECTRICITY',
          quantity: 980,
          unit: 'kWh',
          recordDate: '2026-03-01',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-ELEC-001',
          sourceRow: 2,
        },
        {
          id: 'activity-march-water-007',
          activityType: 'WATER',
          quantity: 18,
          unit: 'm3',
          recordDate: '2026-03-07',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-WATER-007',
          sourceRow: 8,
        },
        {
          id: 'activity-march-hotel-010',
          activityType: 'HOTEL',
          quantity: 4,
          unit: 'nights',
          recordDate: '2026-03-10',
          sourceType: 'SPREADSHEET',
          sourceFileName: 'carbonlite_needs_review_test.xlsx',
          sourceReference: 'MARCH-HOTEL-010',
          sourceRow: 11,
        },
      ],
      calculationDetails,
    );

    expect(reportCountSummary.totalRecordsFound).toBe(3);
    expect(reportCountSummary.processedRecords).toBe(2);
    expect(executiveSummary).toMatchObject({
      estimatedEmissions: '579.40 kg CO₂e',
      recordsIncluded: 2,
      trackedMetrics: 1,
      recordsRequiringReview: 0,
      dataQualityCoverage: '100%',
    });
    expect(
      calculationDetails.filter((detail) => detail.activityDataId === 'activity-march-hotel-010'),
    ).toHaveLength(1);
    expect(sourceEvidenceRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceReference: 'MARCH-ELEC-001 · Line item 2',
          reportTreatment: 'Included',
        }),
        expect.objectContaining({
          sourceReference: 'MARCH-WATER-007 · Line item 8',
          reportTreatment: 'Tracked Only',
        }),
        expect.objectContaining({
          sourceReference: 'MARCH-HOTEL-010 · Line item 11',
          reportTreatment: 'Included',
        }),
      ]),
    );

    render(
      <FormalReportPreview
        organizationName="KACH CANADA LTD."
        reportPeriod="2026-03-01 to 2026-03-31"
        scopeLabel="Date Range"
        generatedAt="2026-10-01"
        usageTotals={{
          fuel: 0,
          electricity: 980,
          fuelUnitLabel: 'Grouped by type and unit',
          electricityUnitLabel: 'kWh',
          fuelUsageBreakdown: [],
        }}
        totalEstimatedEmissionsKgCO2e={579.4}
        countSummary={reportCountSummary}
        matchedActivityEmissions={matchedActivityEmissions}
        conversionFactorsUsed={[]}
        sourceEvidenceRows={sourceEvidenceRows}
        calculationDetails={calculationDetails}
      />,
    );

    expect(screen.getAllByText('579.40 kg CO₂e').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Business Travel - Accommodation').length).toBeGreaterThan(0);
    expect(screen.queryByText('120 kg CO₂e')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Expand Record-Level Source Evidence' }));
    expect(screen.getByText('MARCH-HOTEL-010 · Line item 11')).toBeInTheDocument();
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
      '37,285 kg CO₂e · 9 included · 1 requires review',
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
        'kg CO₂e',
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
          sourceReference: 'MARCH-ELEC-001',
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
          sourceReference: 'MARCH-WATER-007',
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
          sourceReference: 'MARCH-HOTEL-010',
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
        sourceReference: '3 record-level references',
        sourceReferences: ['MARCH-ELEC-001', 'MARCH-WATER-007', 'MARCH-HOTEL-010'],
        recordLevelReferenceCount: 3,
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
        sourceReference: 'utility.pdf · Page 2 · Line item 3',
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
        sourceReference: 'Not provided',
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
      sourceReference: 'Not provided',
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
      sourceReference: 'Not provided',
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

    expect(screen.getByText('Not provided · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.queryByText('PDF extraction')).not.toBeInTheDocument();
  });

  it('uses row-level spreadsheet references in activity breakdown', () => {
    render(
      <ActivityBreakdownSection
        matchedActivityEmissions={[
          {
            activityDataId: 'activity-march-elec-001',
            activityType: 'ELECTRICITY',
            quantity: 980,
            unit: 'kWh',
            estimatedEmissionsKgCO2e: 519.4,
            sourceType: 'SPREADSHEET',
            sourceFileName: 'carbonlite_needs_review_test.xlsx',
            sourceReference: 'MARCH-ELEC-001',
            factorId: 'factor-electricity-ab',
          },
          {
            activityDataId: 'activity-march-hotel-010',
            activityType: 'HOTEL',
            quantity: 4,
            unit: 'nights',
            estimatedEmissionsKgCO2e: 60,
            sourceType: 'SPREADSHEET',
            sourceFileName: 'carbonlite_needs_review_test.xlsx',
            sourceReference: 'MARCH-HOTEL-010',
            factorId: 'factor-hotel-on',
          },
        ]}
      />,
    );

    expect(screen.getByText('MARCH-ELEC-001 · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.getByText('MARCH-HOTEL-010 · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.queryByText('carbonlite_needs_review_test.xlsx · Spreadsheet Import')).not.toBeInTheDocument();
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

    expect(screen.getByText('Not provided · Spreadsheet Import')).toBeInTheDocument();
    expect(screen.queryByText(/Golden Test Data\.xlsx · PDF extraction/i)).not.toBeInTheDocument();
  });

  it('uses row-level spreadsheet references for tracked metrics', () => {
    render(
      <RecordsRequiringReviewSection
        formatRecordUnit={(unit) => String(unit ?? '')}
        calculationDetails={[
          {
            activityDataId: 'activity-march-water-007',
            activityType: 'WATER',
            recordDate: '2026-03-07',
            dateEstimated: false,
            reportingYear: 2026,
            jurisdiction: 'Alberta, Canada',
            activityQuantity: 18,
            activityUnit: 'm3',
            calculationStatus: 'TRACKED_ONLY',
            matchingStatus: 'TRACKED_ONLY',
            status: 'TRACKED_ONLY',
            sourceType: 'SPREADSHEET',
            sourceFileName: 'carbonlite_needs_review_test.xlsx',
            sourceReference: 'MARCH-WATER-007',
            sourceRow: 8,
          },
        ]}
      />,
    );

    expect(screen.getByText('MARCH-WATER-007 · Spreadsheet Import · Row 8')).toBeInTheDocument();
    expect(screen.queryByText(/carbonlite_needs_review_test\.xlsx · Spreadsheet Import/i)).not.toBeInTheDocument();
  });
});
