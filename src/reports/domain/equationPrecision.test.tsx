import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import type { CalculationAuditDetail } from '../../services/metrics';
import { buildCalculatedFormula, formatFactorValue } from '../../utils/calculationTraceability';
import { aggregateActivityUsage } from '../../utils/activityAggregation';
import { formatPdfText } from '../../utils/numberFormatting';
import { buildPilotCsv, buildPilotCsvRows } from '../../utils/reportCsvExport';
import { buildReviewPackageCalculationTraceabilityCsv } from '../../utils/reportReviewPackageCsvExport';
import { buildEvidenceChainFromCalculationDetail } from '../../utils/businessAuditTrail';
import { CalculationTraceabilitySection } from '../../components/reports/sections/CalculationTraceabilitySection';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';
import { buildCanonicalReportData } from './buildCanonicalReportData';
import { buildTechnicalReviewPdf, buildExecutiveSummaryPdf } from '../pdf';

const gas: CalculationAuditDetail = {
  activityDataId: 'synthetic-precision-gas', activityType: 'NATURAL_GAS', recordDate: '2026-03-31',
  dateEstimated: false, reportingYear: 2026, jurisdiction: 'Alberta, Canada',
  activityQuantity: 2860, calculationQuantity: 2860, activityUnit: 'm3', factorInputUnit: 'm3',
  factorResultUnit: 'kgCO2e/m3', factorValue: 1.972311, factorId: 'synthetic-factor',
  factorName: 'Fictional precision control', factorSource: 'Synthetic fixture only',
  sourceAuthority: 'Synthetic fixture only', factorVerified: true, sourceType: 'MANUAL', status: 'CALCULATED',
  calculatedEmissionsKgCO2e: 5640.809, factorDefaultScope: 'SCOPE_1',
  calculationFormula: '2860 m3 x 1.972 = 5640.809',
};

describe('customer equation precision', () => {
  it('uses available operands, retains the snapshot and discloses rounded results', () => {
    const before = JSON.stringify(gas);
    const formula = buildCalculatedFormula(gas);
    expect(formula).toBe('2,860 m3 × 1.972311 kg CO₂e/m3 ≈ 5,640.81 kg CO₂e (saved result retained; display rounded to 2 decimals)');
    expect(formatFactorValue(1.972311)).toBe('1.972311');
    expect(formatFactorValue(0.000000123456789)).toBe('0.000000123456789');
    expect(JSON.stringify(gas)).toBe(before);
  });

  it('uses effective quantities rather than rounding source quantities or reverse-solving emissions', () => {
    const detail = { ...gas, activityQuantity: 1.23456, calculationQuantity: 1.235, factorValue: 2,
      calculatedEmissionsKgCO2e: 2.47 };
    expect(buildCalculatedFormula(detail)).toContain('Recorded quantity: 1.23456 m3; 1.235 m3 × 2');
    expect(buildCalculatedFormula(detail)).not.toContain('1.23 m3 ×');
  });

  it('keeps evidenced zero exact and does not fabricate precision', () => {
    expect(buildCalculatedFormula({ ...gas, activityQuantity: 0, calculationQuantity: 0, calculatedEmissionsKgCO2e: 0 })).toContain('= 0 kg CO₂e');
    expect(formatFactorValue(null)).toBe('-');
    expect(buildCalculatedFormula({ ...gas, factorValue: null })).toBe('No factor available for this activity.');
  });

  it('uses the same precise formula in preview, CSV and audit/review exports instead of rounded API text', () => {
    const formula = buildCalculatedFormula(gas);
    render(<CalculationTraceabilitySection calculationDetails={[gas]} formatRecordUnit={unit => String(unit)} formatScopeLabel={() => 'Scope 1'} />);
    expect(screen.getByText(formula)).toBeInTheDocument();
    expect(buildPilotCsv([gas])).toContain(formula);
    expect(buildReviewPackageCalculationTraceabilityCsv([gas])).toContain(formula);
    expect(buildEvidenceChainFromCalculationDetail(gas).calculation.formula).toBe(formula);
    expect(buildPilotCsv([{ ...gas, factorValue: 1.972311123456 }])).toContain('1.972311123456');
    expect(buildPilotCsvRows([{ ...gas, factorValue: Number.NaN }])[0]['Matched Factor Value']).toBe('');
    expect(formatPdfText(formula)).toContain('~= 5,640.81');
  });

  it.each(['native', 'conversion'])('renders synthetic %s Technical and Executive PDFs without changing saved inventory or coverage', variant => {
    const { input } = goldenReport('enmax');
    const electricity = { ...gas, activityDataId: 'synthetic-precision-electricity', factorId: 'synthetic-electricity-factor', factorName: 'Fictional electricity precision control', activityType: 'ELECTRICITY', recordDate: '2026-01-31',
      activityQuantity: 3650, calculationQuantity: 3650, activityUnit: 'kWh', factorInputUnit: 'kWh',
      factorResultUnit: 'kgCO2e/kWh', factorValue: .438, factorDefaultScope: 'SCOPE_2', calculatedEmissionsKgCO2e: 1598.7 };
    const details = variant === 'native' ? [gas, electricity] : [converted(), converted({ activityDataId: 'synthetic-rounded-zero', activityQuantity: .0001, calculationQuantity: 0, calculatedEmissionsKgCO2e: 0 })];
    const total = variant === 'native' ? 7239.509 : 540.93;
    const report = buildCanonicalReportData({ ...input, organization: { ...input.organization, name: 'Prairie Example Workshop' },
      calculationDetails: details,
      activities: details.map(row => ({ id: row.activityDataId, activityType: row.activityType, recordDate: row.recordDate,
        quantity: row.activityQuantity, unit: row.activityUnit, sourceType: 'MANUAL' })),
      matchedActivityEmissions: details.map(row => ({ activityDataId: row.activityDataId, activityType: row.activityType,
        quantity: row.activityQuantity, unit: row.activityUnit, factorId: row.factorId!,
        estimatedEmissionsKgCO2e: row.calculatedEmissionsKgCO2e!, sourceType: 'MANUAL' })),
      conversionFactorsUsed: details.map(row => ({ factorId: row.factorId!,
        factorName: row.factorName!, factorValue: row.factorValue!, inputUnit: row.factorInputUnit!, resultUnit: row.factorResultUnit!,
        jurisdiction: 'Alberta, Canada', sourceAuthority: 'Synthetic fixture only', sourceYear: 2026,
        factorType: 'System' as const, verified: true })),
      usageTotals: aggregateActivityUsage(details.map(row => ({ activityType: row.activityType, quantity: row.activityQuantity, unit: row.activityUnit }))),
      countSummary: { totalRecordsFound: 2, processedRecords: 2, skippedRecords: 0, missingFactorRecords: 0,
        skippedReasons: { missingFactor: 0, outsideDateRange: 0, outsideScope: 0, invalidData: 0 } },
      reviewRows: [], totalEstimatedEmissionsKgCO2e: total,
      reportingPeriod: { startDate: '2026-01-01', endDate: '2026-12-31', label: '2026 selected synthetic activities' },
      inventoryBoundary: { ...input.inventoryBoundary, reportingPeriod: '2026-01-01 to 2026-12-31', includedScopes: 'Scope 1 natural gas and Scope 2 electricity', organizationWorkspace: 'Prairie Example Workshop', boundaryStatus: 'DRAFT', boundaryNotes: 'Synthetic selected activities only; not a complete annual inventory. Not independently assured.' } });
    expect(report.inventory.totalKgCO2e).toBe(total);
    expect(report.factorReview.factors).toHaveLength(variant === 'native' ? 2 : 1);
    expect(report.scopeBreakdown.coverage?.['Scope 3'].state).toBe('NOT_ASSESSED');
    for (const [name, pdf] of [['precision-technical', buildTechnicalReviewPdf(report)], ['precision-executive', buildExecutiveSummaryPdf(report)]] as const) {
      expect(pdf.getNumberOfPages()).toBeGreaterThan(0);
      if (process.env.PILOT_PRECISION_PDF_DIR) writeFileSync(`${process.env.PILOT_PRECISION_PDF_DIR}/${variant}-traceability.csv`, buildPilotCsv(details));
      if (process.env.PILOT_PRECISION_PDF_DIR) writeFileSync(`${process.env.PILOT_PRECISION_PDF_DIR}/${variant}-${name}.pdf`, Buffer.from(pdf.output('arraybuffer')));
    }
  });
});

const converted = (overrides: Partial<CalculationAuditDetail> = {}): CalculationAuditDetail => ({
  ...gas, activityType: 'ELECTRICITY', activityQuantity: 1234.5678, activityUnit: 'kWh',
  calculationQuantity: 1.235, factorInputUnit: 'MWh', factorResultUnit: 'kgCO2e/MWh',
  factorValue: 438, calculatedEmissionsKgCO2e: 540.93, ...overrides,
});

describe('authoritative conversion presentation', () => {
  it('uses the supported multiplier, not a ratio reconstructed from rounded effective quantity', () => {
    const detail = converted();
    const snapshot = JSON.stringify(detail);
    const formula = buildCalculatedFormula(detail);
    expect(formula).toContain('1,234.5678 kWh × 0.001 ≈ 1.235 MWh');
    expect(formula).toContain('effective quantity rounded to 3 decimals');
    expect(formula).not.toContain('0.0010003500820287069');
    expect(formula).toContain('1.235 MWh × 438 kg CO₂e/MWh ≈ 540.93');
    expect(JSON.stringify(detail)).toBe(snapshot);
  });

  it('retains MWh at rounded zero and distinguishes exact zero', () => {
    const formula = buildCalculatedFormula(converted({ activityQuantity: .0001, calculationQuantity: 0, calculatedEmissionsKgCO2e: 0 }));
    expect(formula).toContain('0.0001 kWh × 0.001 ≈ 0 MWh');
    expect(formula).toContain('rounded to zero, not an exact zero');
    expect(formula).toContain('0 MWh × 438 kg CO₂e/MWh ≈ 0');
    const exact = buildCalculatedFormula(converted({ activityQuantity: 0, calculationQuantity: 0, calculatedEmissionsKgCO2e: 0 }));
    expect(exact).toContain('0 kWh × 0.001 = 0 MWh');
    expect(exact).not.toContain('rounded to zero');
    expect(exact).not.toContain('≈');
  });

  it.each(['Wh', 'kWh/day', 'unknown'])('does not invent a multiplier for unsupported %s input', activityUnit => {
    const formula = buildCalculatedFormula(converted({ activityUnit }));
    expect(formula).toContain('conversion coefficient unavailable');
    expect(formula).toContain('1.235 MWh × 438');
    expect(formula).not.toContain('× 0.001');
  });

  it('does not claim a calculated effective quantity when conversion metadata is missing', () => {
    expect(buildCalculatedFormula(converted({ calculationQuantity: undefined, normalizedQuantity: 1234.5678, normalizedUnit: 'kWh' })))
      .toContain('effective quantity unavailable; saved result: 540.93');
    expect(buildCalculatedFormula(converted({ calculationQuantity: undefined, normalizedQuantity: 1.235, normalizedUnit: 'MWh' })))
      .toContain('× 0.001 ≈ 1.235 MWh');
  });

  it('distinguishes reverse conversion and same-unit quantities', () => {
    expect(buildCalculatedFormula(converted({ activityQuantity: 1, activityUnit: 'MWh', calculationQuantity: 1000, factorInputUnit: 'kWh', factorResultUnit: 'kgCO2e/kWh', factorValue: .438, calculatedEmissionsKgCO2e: 438 })))
      .toBe('1 MWh × 1,000 = 1,000 kWh; 1,000 kWh × 0.438 kg CO₂e/kWh = 438 kg CO₂e');
    expect(buildCalculatedFormula(gas)).toContain('2,860 m3 × 1.972311 kg CO₂e/m3 ≈ 5,640.81');
  });

  it('does not label an inconsistent supplied quantity as documented rounding', () => {
    const formula = buildCalculatedFormula(converted({ calculationQuantity: 2 }));
    expect(formula).toContain('× 0.001 = 1.2345678 MWh; supplied effective quantity: 2 MWh');
    expect(formula).not.toContain('rounded to 3 decimals');
  });

  it('shares conversion rounding disclosures across preview, PDF text, CSV and audit outputs', () => {
    for (const detail of [converted(), converted({ activityQuantity: .0001, calculationQuantity: 0, calculatedEmissionsKgCO2e: 0 })]) {
      const formula = buildCalculatedFormula(detail);
      const { unmount } = render(<CalculationTraceabilitySection calculationDetails={[detail]} formatRecordUnit={unit => String(unit)} formatScopeLabel={() => 'Scope 2'} />);
      expect(screen.getByText(formula)).toBeInTheDocument();
      expect(buildPilotCsv([detail])).toContain(formula);
      expect(buildReviewPackageCalculationTraceabilityCsv([detail])).toContain(formula);
      expect(buildEvidenceChainFromCalculationDetail(detail).calculation.formula).toBe(formula);
      expect(formatPdfText(formula)).toContain('~=');
      expect(formatPdfText(formula)).toContain('MWh');
      unmount();
    }
  });
});
