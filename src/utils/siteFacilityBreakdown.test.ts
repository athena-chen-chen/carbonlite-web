import { describe, expect, it } from 'vitest';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildFacilityThresholdReferenceRows,
  buildSiteFacilityBreakdown,
  buildSiteFacilityRollup,
  ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E,
  FACILITY_REPORTING_THRESHOLD_TCO2E,
} from './siteFacilityBreakdown';

function detail(overrides: Partial<CalculationAuditDetail>): CalculationAuditDetail {
  return {
    activityDataId: 'activity-1',
    activityType: 'NATURAL_GAS',
    recordDate: '2026-01-01',
    dateEstimated: false,
    reportingYear: 2026,
    jurisdiction: 'Canada',
    activityQuantity: 1,
    activityUnit: 'm3',
    factorSource: 'System factor',
    factorVerified: true,
    calculatedEmissionsKgCO2e: 0,
    status: 'CALCULATED',
    sourceType: 'SPREADSHEET',
    ...overrides,
  };
}

describe('buildSiteFacilityBreakdown', () => {
  it('groups calculated emissions by site/facility and scope', () => {
    const rows = buildSiteFacilityBreakdown([
      detail({
        activityDataId: 'gas-1',
        activityType: 'NATURAL_GAS',
        facilityName: 'Calgary Shop',
        calculatedEmissionsKgCO2e: 1890,
      }),
      detail({
        activityDataId: 'electricity-1',
        activityType: 'ELECTRICITY',
        facilityName: 'Calgary Shop',
        calculatedEmissionsKgCO2e: 6625,
      }),
      detail({
        activityDataId: 'air-1',
        activityType: 'AIR_TRAVEL',
        facilityName: 'Toronto Office',
        calculatedEmissionsKgCO2e: 575,
      }),
    ]);

    expect(rows).toEqual([
      {
        siteFacility: 'Calgary Shop',
        jurisdictionCountry: null,
        jurisdictionRegion: null,
        jurisdictionSource: 'record',
        scope1KgCO2e: 1890,
        scope2KgCO2e: 6625,
        scope3KgCO2e: 0,
        totalKgCO2e: 8515,
        includedRecords: 2,
        activityBreakdown: [
          { activityType: 'Electricity', totalKgCO2e: 6625, includedRecords: 1 },
          { activityType: 'Natural Gas', totalKgCO2e: 1890, includedRecords: 1 },
        ],
      },
      {
        siteFacility: 'Toronto Office',
        jurisdictionCountry: null,
        jurisdictionRegion: null,
        jurisdictionSource: 'record',
        scope1KgCO2e: 0,
        scope2KgCO2e: 0,
        scope3KgCO2e: 575,
        totalKgCO2e: 575,
        includedRecords: 1,
        activityBreakdown: [
          { activityType: 'Air Travel', totalKgCO2e: 575, includedRecords: 1 },
        ],
      },
    ]);
  });

  it('returns an organization rollup total equal to the site totals', () => {
    const rollup = buildSiteFacilityRollup([
      detail({
        activityDataId: 'gas-1',
        activityType: 'NATURAL_GAS',
        facilityName: 'Calgary Shop',
        calculatedEmissionsKgCO2e: 1890,
      }),
      detail({
        activityDataId: 'hotel-1',
        activityType: 'HOTEL',
        facilityName: 'Toronto Office',
        calculatedEmissionsKgCO2e: 150,
      }),
    ]);

    expect(rollup.organizationTotalKgCO2e).toBe(2040);
    expect(rollup.includedRecords).toBe(2);
    expect(rollup.rows.reduce((sum, row) => sum + row.totalKgCO2e, 0)).toBe(2040);
    expect(rollup.rows[1].activityBreakdown).toEqual([
      {
        activityType: 'Business Travel - Accommodation',
        totalKgCO2e: 150,
        includedRecords: 1,
      },
    ]);
  });

  it('uses Unassigned for missing sites and excludes tracked-only and review rows', () => {
    const rows = buildSiteFacilityBreakdown([
      detail({
        activityDataId: 'diesel-1',
        activityType: 'DIESEL',
        calculatedEmissionsKgCO2e: 268,
      }),
      detail({
        activityDataId: 'water-1',
        activityType: 'WATER',
        facilityName: 'Calgary Shop',
        status: 'TRACKED_ONLY',
        calculatedEmissionsKgCO2e: 0,
      }),
      detail({
        activityDataId: 'missing-factor-1',
        activityType: 'ELECTRICITY',
        facilityName: 'Calgary Shop',
        status: 'MISSING_FACTOR',
        calculatedEmissionsKgCO2e: null,
      }),
    ]);

    expect(rows).toEqual([
      {
        siteFacility: 'Unassigned',
        jurisdictionCountry: null,
        jurisdictionRegion: null,
        jurisdictionSource: 'record',
        scope1KgCO2e: 268,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 268,
        includedRecords: 1,
        activityBreakdown: [
          { activityType: 'Diesel', totalKgCO2e: 268, includedRecords: 1 },
        ],
      },
    ]);
  });

  it('builds facility threshold reference rows from calculated site totals', () => {
    const rows = buildFacilityThresholdReferenceRows([
      {
        siteFacility: 'Small Facility',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        jurisdictionSource: 'record',
        scope1KgCO2e: 1000000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 1000000,
        includedRecords: 1,
        activityBreakdown: [],
      },
      {
        siteFacility: 'Approaching Facility',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        jurisdictionSource: 'record',
        scope1KgCO2e: 85000000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 85000000,
        includedRecords: 1,
        activityBreakdown: [],
      },
      {
        siteFacility: 'Above Facility',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        jurisdictionSource: 'record',
        scope1KgCO2e: 120000000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 120000000,
        includedRecords: 1,
        activityBreakdown: [],
      },
    ]);

    expect(FACILITY_REPORTING_THRESHOLD_TCO2E).toBe(10000);
    expect(ALBERTA_TIER_LARGE_EMITTER_THRESHOLD_TCO2E).toBe(100000);
    expect(rows).toMatchObject([
      {
        siteFacility: 'Small Facility',
        totalTCO2e: 1000,
        jurisdictionLabel: 'Alberta, Canada',
        regulatoryReference: 'Alberta TIER pilot screening reference',
        thresholdTCO2e: 100000,
        percentOfThreshold: 1,
        status: 'Below threshold / informational only',
        screeningNote: 'Below threshold / informational only',
      },
      {
        siteFacility: 'Approaching Facility',
        totalTCO2e: 85000,
        percentOfThreshold: 85,
        screeningNote: 'Approaching threshold — review recommended',
      },
      {
        siteFacility: 'Above Facility',
        totalTCO2e: 120000,
        percentOfThreshold: 120,
        screeningNote: 'Above threshold reference — professional review recommended',
      },
    ]);
  });

  it('does not apply Alberta threshold screening to Ontario facilities', () => {
    const rows = buildFacilityThresholdReferenceRows(
      buildSiteFacilityBreakdown([
        detail({
          activityDataId: 'calgary-electricity',
          activityType: 'ELECTRICITY',
          facilityName: 'Calgary HQ',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          jurisdictionSource: 'record',
          calculatedEmissionsKgCO2e: 519.4,
        }),
        detail({
          activityDataId: 'toronto-hotel',
          activityType: 'HOTEL',
          facilityName: 'Toronto Client Visit',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          jurisdictionSource: 'record',
          calculatedEmissionsKgCO2e: 60,
        }),
      ]),
    );

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          siteFacility: 'Calgary HQ',
          jurisdictionLabel: 'Alberta, Canada',
          regulatoryReference: 'Alberta TIER pilot screening reference',
          thresholdLabel: '100,000 t CO₂e/year',
          status: 'Below threshold / informational only',
        }),
        expect.objectContaining({
          siteFacility: 'Toronto Client Visit',
          jurisdictionLabel: 'Ontario, Canada',
          regulatoryReference: 'Not configured',
          thresholdLabel: '—',
          thresholdTCO2e: null,
          percentOfThreshold: null,
          status: 'Not evaluated',
          screeningNote:
            'Jurisdiction-specific threshold screening is not currently configured for Ontario.',
        }),
      ]),
    );
  });

  it('distinguishes missing jurisdiction from known but unsupported jurisdiction', () => {
    const rows = buildFacilityThresholdReferenceRows([
      {
        siteFacility: 'Missing Jurisdiction Site',
        jurisdictionCountry: null,
        jurisdictionRegion: null,
        jurisdictionSource: 'record',
        scope1KgCO2e: 0,
        scope2KgCO2e: 0,
        scope3KgCO2e: 60,
        totalKgCO2e: 60,
        includedRecords: 1,
        activityBreakdown: [],
      },
      {
        siteFacility: 'Toronto Client Visit',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Ontario',
        jurisdictionSource: 'record',
        scope1KgCO2e: 0,
        scope2KgCO2e: 0,
        scope3KgCO2e: 60,
        totalKgCO2e: 60,
        includedRecords: 1,
        activityBreakdown: [],
      },
    ]);

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          siteFacility: 'Missing Jurisdiction Site',
          jurisdictionLabel: 'Not provided',
          thresholdLabel: '—',
          screeningNote: 'Jurisdiction required for facility-level threshold screening.',
        }),
        expect.objectContaining({
          siteFacility: 'Toronto Client Visit',
          jurisdictionLabel: 'Ontario, Canada',
          thresholdLabel: '—',
          screeningNote:
            'Jurisdiction-specific threshold screening is not currently configured for Ontario.',
        }),
      ]),
    );
  });

  it('marks facilities with conflicting record jurisdictions as mixed instead of choosing one', () => {
    const rows = buildFacilityThresholdReferenceRows(
      buildSiteFacilityBreakdown([
        detail({
          activityDataId: 'warehouse-ab',
          facilityName: 'Shared Project Site',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          calculatedEmissionsKgCO2e: 100,
        }),
        detail({
          activityDataId: 'warehouse-on',
          facilityName: 'Shared Project Site',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Ontario',
          calculatedEmissionsKgCO2e: 60,
        }),
      ]),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        siteFacility: 'Shared Project Site',
        jurisdictionLabel: 'Multiple jurisdictions',
        thresholdLabel: '—',
        status: 'Not evaluated',
        screeningNote:
          'Facility includes records from multiple jurisdictions; review jurisdiction before screening.',
      }),
    ]);
  });
});
