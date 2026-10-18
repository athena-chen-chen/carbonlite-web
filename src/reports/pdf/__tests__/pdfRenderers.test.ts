import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildExecutiveSummaryPdf, buildTechnicalReviewPdf, getReportPdfFileName } from '../index';
import { goldenReport } from './goldenFixtures';

function text(pdf: ReturnType<typeof buildTechnicalReviewPdf>) {
  return [...pdf.output().matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)]
    .map((match) => match[1].replace(/\\([()\\])/g, '$1')).join(' ');
}
function freeze(value: any) { if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze); } return value; }

const scenarios = [
  { name: 'messy', total: '579.40', scopes: ['0 kg', '519.40', '60 kg'], cost: '3 of 3', percent: '100%', review: [9, 3, 6] },
  { name: 'enmax', total: '338.06', scopes: ['148.32', '189.74', '0 kg'], cost: '0 of 3', percent: '0%', review: [0, 3, 0] },
  { name: 'field', total: '2,428.44', scopes: ['1,228.74', '662.50', '537.20'], cost: '0 of 5', percent: '0%', review: [5, 5, 0] },
] as const;

describe('extracted PDF renderers', () => {
  it.each(scenarios)('preserves both golden profiles: $name', (scenario) => {
    const { report } = goldenReport(scenario.name);
    const original = JSON.stringify(report);
    freeze(report);
    const executive = buildExecutiveSummaryPdf(report);
    const technical = buildTechnicalReviewPdf(report);
    expect(executive.getNumberOfPages()).toBe(2);
    expect(technical.getNumberOfPages()).toBe(9);
    expect(executive.output()).toContain(`/Title (CarbonLite Executive Summary - ${report.documentControl.reportId})`);
    expect(technical.output()).toContain(`/Title (CarbonLite Technical Review Package - ${report.documentControl.reportId})`);
    const executiveText = text(executive);
    const technicalText = text(technical);
    for (const value of [scenario.total, ...scenario.scopes]) {
      expect(executiveText).toContain(value);
      expect(technicalText).toContain(value);
    }
    for (const label of [
      'Stage 2: Collect & Upload Source Data',
      'Stage 3: Review & Resolve Data Issues',
      'Stage 6: Generate & Review Report',
    ]) expect(technicalText).toContain(label);
    expect(technicalText).toContain('Optional Data Completeness');
    expect(technicalText).toContain(scenario.percent);
    expect(technicalText).toContain(`${scenario.cost} imported activity records include optional cost data`);
    expect(report.sourceReview).toMatchObject({ totalRows: scenario.review[0], resolvedCount: scenario.review[1], needsReviewCount: scenario.review[2] });
    expect(technicalText).toContain('Calculation Coverage');
    expect(executiveText).toContain('Reporting Readiness');
    expect(technicalText).toContain('Calculation Traceability');
    expect(technicalText).toContain('Appendix A: Imported Record-Level Source Evidence');
    expect(technicalText).toContain(report.documentControl.reportId);
    expect(JSON.stringify(report)).toBe(original);
    if (scenario.name === 'enmax') {
      for (const value of ['49.44', 'Canada (Generic)', 'Environment and Climate Change Canada', '2025-01-01 to 2025-12-31']) expect(technicalText).toContain(value);
      expect(report.calculationDetails[1].factorSelectionReason).toBe('GENERIC_JURISDICTION_FALLBACK');
    }
    if (scenario.name === 'field') {
      for (const value of ['Calgary HQ', 'Vancouver Fleet', 'Toronto Sales Trip', 'Corporate Travel', '1,082.74', '808.50', '492.20', '45 kg']) expect(technicalText).toContain(value);
      expect(report.facilityBreakdown.rows).toHaveLength(4);
    }
    if (process.env.TASK6_CAPTURE_PDFS) {
      fs.mkdirSync('/private/tmp/task6-after', { recursive: true });
      for (const [profile, pdf] of [['executive', executive], ['technical', technical]] as const) {
        const outputProfile = profile === 'executive' ? 'EXECUTIVE_SUMMARY' : 'TECHNICAL_REVIEW';
        fs.writeFileSync(`/private/tmp/task6-after/${scenario.name}-${profile}.pdf`, Buffer.from(pdf.output('arraybuffer')));
        fs.writeFileSync(`/private/tmp/task6-after/${scenario.name}-${profile}.json`, JSON.stringify({ filename: getReportPdfFileName(outputProfile, report.documentControl, report.outputGeneratedDate), pages: pdf.getNumberOfPages() }));
      }
    }
  });

  it('renders limited document lineage without reclassifying source review', () => {
    const { report } = goldenReport('enmax');
    const limited = { ...report.sourceReview, availability: 'DOCUMENT_LINEAGE_AVAILABLE' as const, available: false, limitation: 'Structured source-review counts are not available for this document import.' };
    const input = { ...report, sourceReview: limited, sourceReviewSummary: limited };
    expect(text(buildExecutiveSummaryPdf(input))).toContain('Document source lineage available');
    expect(text(buildTechnicalReviewPdf(input))).toContain('Limited');
  });
});

describe('methodology provenance in Technical Review Package', () => {
  it.each(scenarios)('keeps internal version IDs out of $name provenance without changing totals', scenario => {
    const { report } = goldenReport(scenario.name);
    const factor = report.factorReview.factors[0] ?? { ...goldenReport('enmax').report.factorReview.factors[0] };
    if (!report.factorReview.factors.length) report.factorReview.factors.push(factor);
    factor.factorVersionId = 'cmv8vg8eu0009gd3sxfn0w9z7';
    factor.factorVersion = factor.factorVersionId;
    factor.sourceDocument = 'CarbonLite MVP Default Factors v1.0';
    factor.factorProvenance = { sourceVersion: 'v1.0' };
    const pdf = buildTechnicalReviewPdf(report);
    const contents = text(pdf);
    expect(contents).toContain(scenario.total);
    expect(contents).toContain('Source Document Version: v1.0');
    expect(contents).not.toContain(factor.factorVersionId);
    expect(pdf.getNumberOfPages()).toBe(9);
    if (process.env.P2_CAPTURE_PDFS) {
      fs.mkdirSync('/private/tmp/p2-provenance-pdf', { recursive: true });
      fs.writeFileSync(`/private/tmp/p2-provenance-pdf/${scenario.name}-technical.pdf`, Buffer.from(pdf.output('arraybuffer')));
    }
  });

  it('renders optional provenance from canonical facts without altering inventory totals', () => {
    const { report } = goldenReport('enmax');
    report.factorReview.factors[0].factorProvenance = {
      applicability: 'CORPORATE_INVENTORY', emissionBasis: 'DIRECT_CO2E', sourceVersion: 'fixture-3.2', sourceYear: 2025, factorYear: 2026,
      methodologyProvenance: { methodologyDocument: 'Fixture methodology reference', methodologyVersion: '2.3', methodologyMethod: 'Method 1-1', methodologyLevel: 'Level 1 / 2', quantityBasis: 'ENERGY_HHV', gwpSource: 'Reference only', gwpVersion: 'AR5' },
    };
    const contents = text(buildTechnicalReviewPdf(report));
    expect(contents).toContain('338.06');
    expect(contents).toContain('Source Document Version: fixture-3.2');
    expect(contents).toContain('Applicability: Corporate Inventory');
    expect(contents).toContain('Methodology Reference: Method 1-1');
    expect(contents).not.toMatch(/TIER compliant|SGRR compliant|verified under AQM/i);
  });
});
