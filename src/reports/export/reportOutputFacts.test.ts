import { describe, expect, it } from 'vitest';
import type { CanonicalReportData } from '../domain/reportTypes';
import { buildReportOutputFacts } from './reportOutputFacts';

describe('report output facts', () => {
  it('selects shared report facts from the canonical report snapshot without re-deriving them', () => {
    const report = {
      inventory: {
        importedRecordCount: 5,
        includedRecordCount: 5,
        trackedMetricCount: 0,
        importedNeedsReviewCount: 0,
        totalKgCO2e: 2428.44,
      },
      reportingPeriod: {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        label: '2025-01-01 to 2025-12-31',
      },
      calculationQuality: {
        calculationCoverage: '100%',
        coverageCounts: {
          calculatedRecords: 5,
          eligibleEmissionBearingRecords: 5,
        },
        dataReadinessSummary: {
          optionalDataCompleteness: {
            score: 0,
            costDataCount: 0,
            totalRecords: 5,
          },
        },
      },
      sourceReview: {
        totalRows: 5,
        resolvedCount: 5,
        needsReviewCount: 0,
      },
      scopeBreakdown: {
        totals: {
          'Scope 1': 1228.74,
          'Scope 2': 662.5,
          'Scope 3': 537.2,
          Unclassified: 0,
        },
      },
      facilityBreakdown: {
        rows: [
          { siteFacility: 'Calgary HQ', totalKgCO2e: 1082.74 },
          { siteFacility: 'Vancouver Fleet', totalKgCO2e: 808.5 },
          { siteFacility: 'Toronto Sales Trip', totalKgCO2e: 45 },
          { siteFacility: 'Corporate Travel', totalKgCO2e: 492.2 },
        ],
      },
      factorReview: {
        factorsUsedCount: 1,
        factorsRequiringReviewCount: 1,
        factors: [{
          factorValue: 49.44,
          jurisdiction: 'Canada (Generic)',
          sourceAuthority: 'Environment and Climate Change Canada',
          factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
        }],
      },
    } as CanonicalReportData;

    const facts = buildReportOutputFacts(report);

    expect(facts.totalKgCO2e).toBe(2428.44);
    expect(facts.reportPeriod).toBe('2025-01-01 to 2025-12-31');
    expect(facts.scopeTotals).toEqual(report.scopeBreakdown.totals);
    expect(facts.calculationCoverage).toBe('100%');
    expect(facts.calculatedRecordCount).toBe(5);
    expect(facts.eligibleRecordCount).toBe(5);
    expect(facts.optionalDataCompletenessPercent).toBe(0);
    expect(facts.optionalCostPresentCount).toBe(0);
    expect(facts.optionalCostTotalCount).toBe(5);
    expect(facts.sourceReview).toBe(report.sourceReview);
    expect(facts.facilityBreakdown.rows).toHaveLength(4);
    expect(facts.factorReview.factors[0]).toMatchObject({
      factorValue: 49.44,
      jurisdiction: 'Canada (Generic)',
      sourceAuthority: 'Environment and Climate Change Canada',
      factorSelectionReason: 'GENERIC_JURISDICTION_FALLBACK',
    });
  });
});
