import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FormalReportPreview } from '../../components/FormalReportPreview';
import { buildScopeCoverage, formatScopeResult, scopeShare } from './scopeCoverage';
import { buildCanonicalReportData } from './buildCanonicalReportData';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf } from '../pdf';
import { ScopeBreakdownSection } from '../components/ReportPresentationSections';
import { buildReviewPackageSiteFacilityBreakdownCsv } from '../../utils/reportReviewPackageCsvExport';
import { buildPilotCsvRows } from '../../utils/reportCsvExport';
import type { CalculationAuditDetail } from '../../services/metrics';

afterEach(cleanup);
const gas = (value: number | null, status = 'CALCULATED') => ({
  activityType: 'NATURAL_GAS', status, calculatedEmissionsKgCO2e: value,
} as CalculationAuditDetail);
const scope3 = (value: number | null, status = 'CALCULATED') => ({
  activityType: 'AIR_TRAVEL', status, calculatedEmissionsKgCO2e: value,
} as CalculationAuditDetail);
function text(pdf: ReturnType<typeof buildTechnicalReviewPdf>) {
  return [...pdf.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)]
    .map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ');
}

describe('scope coverage evidence', () => {
  it('does not infer coverage from empty totals or an INCLUDED declaration alone', () => {
    for (const coverage of [buildScopeCoverage([]), buildScopeCoverage([], { 'Scope 3': 'INCLUDED' })]) {
      expect(formatScopeResult(0, coverage['Scope 3'])).toBe('Not assessed');
      expect(scopeShare(0, 10, coverage['Scope 3'])).toBeNull();
    }
  });
  it('preserves explicit exclusion without parsing prose', () => {
    const coverage = buildScopeCoverage([gas(12)], { 'Scope 3': 'EXCLUDED' });
    expect(formatScopeResult(0, coverage['Scope 3'])).toBe('Excluded — not calculated');
    expect(scopeShare(0, 12, coverage['Scope 3'])).toBeNull();
  });
  it.each([0, 60])('renders an evidenced calculated result of %s', value => {
    const evidence = buildScopeCoverage([scope3(value)])['Scope 3'];
    expect(evidence.state).toBe('INCLUDED');
    expect(formatScopeResult(value, evidence)).toContain(`${value} kg`);
    expect(scopeShare(value, 100, evidence)).toBe(value);
  });
  it('rejects missing, nonfinite and non-calculated result evidence', () => {
    const coverage = buildScopeCoverage([scope3(null), scope3(NaN), scope3('' as unknown as number), scope3(0, 'NEEDS_REVIEW')]);
    expect(coverage['Scope 3'].state).toBe('NOT_ASSESSED');
  });
  it('flags exclusion conflicting with even a calculated zero', () => {
    const evidence = buildScopeCoverage([scope3(0)], { 'Scope 3': 'EXCLUDED' })['Scope 3'];
    expect(evidence.conflict).toBe(true);
    expect(formatScopeResult(0, evidence)).toContain('coverage conflicts');
    expect(scopeShare(0, 12, evidence)).toBeNull();
  });
});

it.each(['EXCLUDED', 'NOT_ASSESSED'] as const)('keeps %s consistent across preview, PDFs and facility CSV', state => {
  const { input } = goldenReport('enmax');
  const report = buildCanonicalReportData({ ...input, scopeDeclarations: { 'Scope 3': state } });
  const expected = state === 'EXCLUDED' ? 'Excluded — not calculated' : 'Not assessed';
  render(<ScopeBreakdownSection data={report.scopeBreakdown} unclassifiedCalculatedRecordCount={0} expanded onToggle={() => {}} />);
  expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  cleanup();
  render(<FormalReportPreview {...input} organizationName={report.organizationName}
    reportPeriod={report.reportPeriod} scopeLabel={report.reportScopeLabel}
    generatedAt={report.outputGeneratedDate} conversionFactorsUsed={report.factorReview.factors}
    sourceEvidenceRows={report.sourceEvidenceRows} scopeCoverage={report.scopeBreakdown.coverage}
    sectionExpansionRequest={{ token: 1, expanded: true }} />);
  expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  const csv = buildReviewPackageSiteFacilityBreakdownCsv(report.facilityBreakdown.rows, report.calculationDetails);
  expect(csv).toContain(expected);
  for (const pdf of [buildExecutiveSummaryPdf(report), buildTechnicalReviewPdf(report)]) {
    // jsPDF WinAnsi encodes the em dash as 0x97.
    expect(text(pdf)).toContain(expected.replace('—', '\u0097'));
    expect(text(pdf)).toContain('Not reviewed');
    expect(text(pdf)).toContain('Pilot Draft');
  }
  expect(report.scopeSummary['Scope 1']).toBeCloseTo(148.32);
  expect(report.scopeSummary['Scope 2']).toBeCloseTo(189.74);
  expect(report.inventory.totalKgCO2e).toBeCloseTo(338.06);
  expect(buildPilotCsvRows(report)).toHaveLength(input.calculationDetails.length);
});

it('preserves the demo totals and ignores free-text scope exclusions as authority', () => {
  const { input } = goldenReport('enmax');
  const details = [{ ...gas(5640.80946), activityDataId: 'gas' }, {
    activityType: 'ELECTRICITY', status: 'CALCULATED', activityDataId: 'electricity',
    calculatedEmissionsKgCO2e: 1598.7,
  }] as CalculationAuditDetail[];
  const report = buildCanonicalReportData({ ...input, calculationDetails: details,
    totalEstimatedEmissionsKgCO2e: 7239.50946,
    inventoryBoundary: { ...input.inventoryBoundary, scope3CoverageNote: 'Scope 3 is excluded.' } });
  expect(report.scopeSummary).toEqual({ 'Scope 1': 5640.80946, 'Scope 2': 1598.7, 'Scope 3': 0, Unclassified: 0 });
  expect(report.inventory.totalKgCO2e).toBe(7239.50946);
  expect(report.scopeBreakdown.coverage?.['Scope 3'].state).toBe('NOT_ASSESSED');
});

it('keeps contradictory exclusion visible in PDF, preview and facility CSV without changing totals', () => {
  const { input } = goldenReport('field');
  const report = buildCanonicalReportData({ ...input, scopeDeclarations: { 'Scope 3': 'EXCLUDED' } });
  const warning = 'Not assessed — coverage conflicts with calculated records';
  render(<ScopeBreakdownSection data={report.scopeBreakdown} unclassifiedCalculatedRecordCount={0} expanded onToggle={() => {}} />);
  expect(screen.getAllByText(warning).length).toBeGreaterThan(0);
  for (const pdf of [buildExecutiveSummaryPdf(report), buildTechnicalReviewPdf(report)]) {
    expect(text(pdf)).toContain('coverage conflicts');
  }
  expect(buildReviewPackageSiteFacilityBreakdownCsv(report.facilityBreakdown.rows, report.calculationDetails)).toContain('coverage conflicts');
  expect(report.inventory.totalKgCO2e).toBe(2428.44);
  expect(report.scopeSummary['Scope 3']).toBeCloseTo(537.2);
});
