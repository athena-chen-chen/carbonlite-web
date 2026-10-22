import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { buildReportingPeriodLabel, buildSourceEvidenceCounts } from './reportSemantics';
import { goldenReport } from '../pdf/__tests__/goldenFixtures';
import { buildFactorReviewSummary } from './buildFactorReviewSummary';
import { buildCanonicalReportData } from './buildCanonicalReportData';
import { getCalculationTraceabilityGaps } from '../../utils/reportingReadiness';
import { aggregateActivityUsage } from '../../utils/activityAggregation';
import { FormalReportPreview } from '../../components/FormalReportPreview';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf } from '../pdf';
import fs from 'node:fs';
import { buildFactorDetailText } from '../pdf/pdfSections';
import { buildPilotCsvRows } from '../../utils/reportCsvExport';

function combinedInput() {
  const field = goldenReport('field').input;
  const enmax = goldenReport('enmax').input;
  const manual = {
    ...field.calculationDetails[0], activityDataId: 'manual-1', recordDate: '2026-10-14',
    activityQuantity: 980, factorValue: 0.53, facilityName: null, sourceType: 'MANUAL',
    sourceFileName: null, sourceDocumentId: null, sourceReference: null, sourceSheetName: null, sourceRow: null,
    calculatedEmission: 519.4, calculatedEmissionsKgCO2e: 519.4,
    manualSourceProvenance: { auditId: 'audit-1', actorId: 'actor-1', createdAt: '2026-10-14T23:21:28.981Z', activityDataId: 'manual-1', activityType: 'ELECTRICITY', recordDate: '2026-10-14', quantity: 980, unit: 'kWh' },
  };
  const calculationDetails = [...field.calculationDetails, ...enmax.calculationDetails, manual].map(detail => ({
    ...detail, factorId: `factor-${detail.activityType}`, factorVersionId: `version-${detail.activityType}`, factorVersion: 'v1',
    factorVerified: false, factorVerificationStatus: 'INTERNAL_REVIEW_REQUIRED',
  }));
  const activities = calculationDetails.map(detail => ({ id: detail.activityDataId, activityType: detail.activityType, quantity: detail.activityQuantity, unit: detail.activityUnit, recordDate: detail.recordDate, sourceType: detail.sourceType, sourceDocumentId: detail.sourceDocumentId, sourceFileName: detail.sourceFileName }));
  const calculated = calculationDetails.filter(detail => detail.status === 'CALCULATED');
  const conversionFactorsUsed = Array.from(new Map(calculated.map(detail => [detail.factorVersionId, {
    factorId: detail.factorId, factorVersionId: detail.factorVersionId, factorName: detail.activityType,
    factorValue: detail.factorValue!, inputUnit: detail.activityUnit, resultUnit: 'kgCO2e', jurisdiction: detail.jurisdiction,
    sourceAuthority: detail.sourceAuthority!, sourceYear: 2025, factorType: 'System' as const, verified: false,
  }])).values());
  return { ...field, calculationDetails, activities, conversionFactorsUsed,
    matchedActivityEmissions: calculated.map(detail => ({ activityDataId: detail.activityDataId, activityType: detail.activityType, quantity: detail.activityQuantity, unit: detail.activityUnit, estimatedEmissionsKgCO2e: detail.calculatedEmissionsKgCO2e!, sourceType: detail.sourceType })),
    usageTotals: aggregateActivityUsage(activities),
    totalEstimatedEmissionsKgCO2e: calculated.reduce((sum, detail) => sum + detail.calculatedEmissionsKgCO2e!, 0),
    countSummary: { ...field.countSummary, totalRecordsFound: 9, recordsInScope: 9, processedRecords: 8, skippedRecords: 1 },
    reportingPeriod: { startDate: '2025-08-01', endDate: '2026-10-14', label: '2025 reporting period' },
  };
}

function pdfText(pdf: ReturnType<typeof buildTechnicalReviewPdf>) {
  return [...pdf.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map(match => match[1].replace(/\\([()\\])/g, '$1')).join(' ');
}

describe('canonical report semantics', () => {
  it.each([
    ['2025-08-01', '2026-10-14', '2025 reporting period', '2025-08-01 to 2026-10-14'],
    ['2026-01-01', '2026-12-31', '2026', '2026-01-01 to 2026-12-31'],
    [null, null, 'Selected records', 'Selected records'],
    ['invalid', '2026-12-31', 'Not specified', 'Not specified'],
    ['2026-02-30', '2026-12-31', 'Not specified', 'Not specified'],
  ])('preserves truthful period wording (%s)', (startDate, endDate, label, expected) => {
    expect(buildReportingPeriodLabel({ startDate, endDate, label: label! })).toBe(expected);
  });

  it('distinguishes inputs, uploaded identities and individual manual entries', () => {
    expect(buildSourceEvidenceCounts([
      { sourceType: 'DOCUMENT_AI', sourceDocumentId: 'pdf' },
      { sourceType: 'DOCUMENT_AI', sourceDocumentId: 'pdf' },
      { sourceType: 'IMPORT', sourceDocumentId: 'xlsx' },
      { sourceType: 'MANUAL', sourceFileName: 'not-a-real-file' },
    ])).toEqual({ sourceInputCount: 3, sourceFileCount: 2, manualEntryCount: 1 });
    expect(buildSourceEvidenceCounts([{ sourceType: 'API' }, { sourceType: 'MANUAL' }, { sourceType: 'MANUAL' }]))
      .toEqual({ sourceInputCount: 3, sourceFileCount: 0, manualEntryCount: 2 });
  });

  it('deduplicates factor definitions by stable version identity, preserving distinct versions', () => {
    const factor = combinedInput().conversionFactorsUsed[0];
    const summary = buildFactorReviewSummary([factor, { ...factor }, { ...factor, factorVersionId: 'another-version' }]);
    expect(summary.factorsUsedCount).toBe(2);
    expect(summary.factorsRequiringReviewCount).toBe(2);
  });

  it('counts duplicate selection rows once using record-level evidence and keeps separate factor versions', () => {
    const input = combinedInput();
    const gas = input.conversionFactorsUsed.find(factor => factor.factorName === 'NATURAL_GAS')!;
    const duplicateInput = { ...input, conversionFactorsUsed: [...input.conversionFactorsUsed, { ...gas, usedRecordsCount: 1 }] };
    const report = buildCanonicalReportData(duplicateInput);
    expect(report.factorReview.factorsUsedCount).toBe(5);
    expect(report.factorReview.factors.find(factor => factor.factorName === 'NATURAL_GAS')?.usedRecordsCount).toBe(2);
    const alternate = { ...gas, factorVersionId: 'gas-version-2' };
    const distinct = buildFactorReviewSummary([gas, alternate]);
    expect(distinct.factorsUsedCount).toBe(2);
    const noVersionIds = buildFactorReviewSummary([{ ...gas, factorVersionId: null, factorVersion: '1.0' }, { ...gas, factorVersionId: null, factorVersion: '2.0' }]);
    expect(noVersionIds.factorsUsedCount).toBe(2);
    const fallback = buildFactorReviewSummary([{ ...gas, usedRecordsCount: 1 }, { ...gas, usedRecordsCount: 1 }]);
    expect(fallback.factors[0].usedRecordsCount).toBe(2);
  });

  it('requires real manual creation evidence and real imported source identity', () => {
    const input = combinedInput();
    const manual = input.calculationDetails.at(-1)!;
    expect(getCalculationTraceabilityGaps(manual)).toEqual([]);
    expect(getCalculationTraceabilityGaps({ ...manual, manualSourceProvenance: null })).toContain('manual creation actor');
    for (const [field, value, gap] of [
      ['actorId', '', 'manual creation actor'],
      ['createdAt', 'invalid', 'manual creation timestamp'],
      ['quantity', null, 'original manual activity values'],
    ] as const) expect(getCalculationTraceabilityGaps({ ...manual, manualSourceProvenance: { ...manual.manualSourceProvenance!, [field]: value } } as typeof manual)).toContain(gap);
    expect(getCalculationTraceabilityGaps({ ...manual, manualSourceProvenance: { ...manual.manualSourceProvenance!, activityDataId: 'other' } })).toContain('manual creation audit');
    const imported = input.calculationDetails[0];
    expect(getCalculationTraceabilityGaps(imported)).toEqual([]);
    expect(getCalculationTraceabilityGaps({ ...imported, sourceFileName: null, sourceDocumentId: null, sourceReference: 'Spreadsheet import' })).toContain('source document identity');
    expect(getCalculationTraceabilityGaps({ ...manual, calculatedEmission: null, calculatedEmissionsKgCO2e: null })).toContain('calculation result');
  });

  it('preserves combined totals, scopes, facilities, usage, coverage and distinct factor semantics', () => {
    const input = combinedInput();
    const report = buildCanonicalReportData(input);
    expect(report.reportPeriod).toBe('2025-08-01 to 2026-10-14');
    expect(report.sourceEvidenceCounts).toEqual({ sourceInputCount: 3, sourceFileCount: 2, manualEntryCount: 1 });
    expect(report.inventory).toMatchObject({ importedRecordCount: 9, includedRecordCount: 8, trackedMetricCount: 1 });
    expect(report.inventory.totalKgCO2e).toBeCloseTo(3285.90, 2);
    for (const [scope, total] of Object.entries({ 'Scope 1': 1377.06, 'Scope 2': 1371.64, 'Scope 3': 537.2, Unclassified: 0 })) expect(report.scopeBreakdown.totals[scope as keyof typeof report.scopeBreakdown.totals]).toBeCloseTo(total, 2);
    expect(report.calculationQuality.coverageCounts).toMatchObject({ calculatedRecords: 8, eligibleEmissionBearingRecords: 8 });
    expect(report.calculationCoverage).toBe('100%');
    const facilityTotals = Object.fromEntries(report.facilityBreakdown.rows.map(row => [row.siteFacility, row.totalKgCO2e]));
    expect(facilityTotals).toEqual({ 'Calgary HQ': 1082.74, Unassigned: 857.46, 'Vancouver Fleet': 808.5, 'Corporate Travel': 492.2, 'Toronto Sales Trip': 45 });
    expect(input.usageTotals.electricity).toBe(2588);
    expect(input.usageTotals.fuelUsageBreakdown).toEqual(expect.arrayContaining([expect.objectContaining({ activityType: 'NATURAL_GAS', total: 11.5 }), expect.objectContaining({ activityType: 'GASOLINE', total: 350 })]));
    expect(report.factorReview.factorsUsedCount).toBe(5);
    expect(Object.fromEntries(report.factorReview.factors.map(factor => [factor.factorName, factor.usedRecordsCount])))
      .toEqual({ ELECTRICITY: 3, NATURAL_GAS: 2, GASOLINE: 1, HOTEL: 1, AIR_TRAVEL: 1 });
    expect(report.factorReview.factors.reduce((sum, factor) => sum + (factor.usedRecordsCount ?? 0), 0)).toBe(8);
    expect(report.readiness.items.find(item => item.code === 'FACTORS_REVIEWED')?.evidence).toContain('8 record-level factor usages');
    expect(report.readiness.items.find(item => item.code === 'TRACEABILITY_COMPLETE')?.status).toBe('COMPLETE');
  });

  it('renders the same period, source and usage semantics in Report UI and both PDFs', () => {
    const input = combinedInput();
    const report = buildCanonicalReportData(input);
    const view = render(<FormalReportPreview organizationName={report.organizationName} reportPeriod={report.reportPeriod} scopeLabel="Date Range" generatedAt="2026-10-16" usageTotals={input.usageTotals} totalEstimatedEmissionsKgCO2e={report.inventory.totalKgCO2e} countSummary={report.reportCountSummary} matchedActivityEmissions={report.matchedActivityEmissions} conversionFactorsUsed={report.factorReview.factors} sourceEvidenceRows={report.sourceEvidenceRows} calculationDetails={report.calculationDetails} sectionExpansionRequest={{ token: 1, expanded: true }} />);
    expect(view.container.textContent).not.toContain('2025 reporting period');
    expect(screen.getAllByText(/3 source inputs · 2 uploaded files · 1 manual entry/).length).toBeGreaterThan(0);
    expect(view.container.textContent).toContain('8 record-level factor usages');
    for (const [profile, pdf] of [['executive', buildExecutiveSummaryPdf(report)], ['technical', buildTechnicalReviewPdf(report)]] as const) {
      const text = pdfText(pdf);
      expect(text).toContain('2025-08-01 to 2026-10-14');
      expect(text).toContain('3,285.90');
      if (profile === 'executive') expect(text).toContain('Structured Source Data Status');
      expect(text).not.toContain('2025 reporting period');
      if (profile === 'technical') {
        expect(text).toContain('3 source inputs');
        expect(text).toContain('2 uploaded files');
        expect(text).toContain('1 manual entry');
        expect(text).toContain('record-level factor usages');
        expect(text).toContain('The main report body summarizes this information by source input.');
        expect(text).not.toContain('by source file');
        expect(text).toContain('Source Files');
      }
      if (process.env.REPORT_SEMANTICS_CAPTURE_PDFS) {
        fs.mkdirSync('/private/tmp/report-semantic-pdfs', { recursive: true });
        fs.writeFileSync(`/private/tmp/report-semantic-pdfs/combined-${profile}.pdf`, Buffer.from(pdf.output('arraybuffer')));
      }
    }
  });

  it('preserves canonical provenance and combined results while omitting seed and table keys from versions', () => {
    const input = combinedInput();
    const versions: Record<string, string> = { ELECTRICITY: 'demo-2025-kwh-alberta', NATURAL_GAS: 'ECCC_EPR_2025_TABLE_A8' };
    input.calculationDetails = input.calculationDetails.map(detail => ({ ...detail,
      factorVersion: versions[detail.activityType] ?? '2.1',
      factorProvenance: { factorVersion: versions[detail.activityType] ?? '2.1', factorYear: 2025, ...(detail.activityType === 'ELECTRICITY' ? { sourceVersion: 'v1.0' } : {}) },
    }));
    const conversionFactorsUsed = input.conversionFactorsUsed.map(factor => ({ ...factor,
      factorVersion: versions[factor.factorName] ?? '2.1',
      factorProvenance: { factorVersion: versions[factor.factorName] ?? '2.1', factorYear: 2025, ...(factor.factorName === 'ELECTRICITY' ? { sourceVersion: 'v1.0' } : {}) },
    }));
    const report = buildCanonicalReportData({ ...input, conversionFactorsUsed });
    expect(report.inventory.totalKgCO2e).toBeCloseTo(3285.90, 2);
    expect(report.factorReview.factorsUsedCount).toBe(5);
    expect(report.sourceEvidenceCounts).toEqual({ sourceInputCount: 3, sourceFileCount: 2, manualEntryCount: 1 });
    for (const [activityType, key] of Object.entries(versions)) {
      const factor = report.factorReview.factors.find(factor => factor.factorName === activityType)!;
      expect(factor.factorProvenance?.factorVersion).toBe(key);
      const text = buildFactorDetailText(factor);
      expect(text).not.toContain('Factor Version:');
      expect(text).not.toContain(key);
      expect(text).toContain('Factor Vintage: 2025');
      if (activityType === 'ELECTRICITY') expect(text).toContain('Source Document Version: v1.0');
    }
    const rows = buildPilotCsvRows(report);
    expect(rows.filter(row => row['Factor Version'] === '2.1')).toHaveLength(3);
    expect(rows.filter(row => row['Factor Version'] === '')).toHaveLength(6);
    const technical = buildTechnicalReviewPdf(report);
    const executive = buildExecutiveSummaryPdf(report);
    expect(pdfText(technical)).toContain('3,285.90');
    expect(pdfText(technical)).not.toMatch(/demo-2025-kwh-alberta|ECCC_EPR_2025_TABLE_A8/);
    expect(pdfText(technical)).toContain('Factor Version: 2.1');
    expect(pdfText(executive)).toContain('3,285.90');
    if (process.env.REPORT_SEMANTICS_CAPTURE_PDFS) {
      fs.mkdirSync('/private/tmp/report-semantics', { recursive: true });
      fs.writeFileSync('/private/tmp/report-semantics/provenance-technical.pdf', Buffer.from(technical.output('arraybuffer')));
      fs.writeFileSync('/private/tmp/report-semantics/provenance-executive.pdf', Buffer.from(executive.output('arraybuffer')));
    }
  });
});
