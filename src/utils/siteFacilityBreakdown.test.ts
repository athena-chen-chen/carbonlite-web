import { describe, expect, it } from 'vitest';
import type { CalculationAuditDetail } from '../services/metrics';
import {
  buildFacilityThresholdReferenceRows,
  buildSiteFacilityBreakdown,
  buildSiteFacilityRollup,
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
        scope1KgCO2e: 1000000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 1000000,
        includedRecords: 1,
        activityBreakdown: [],
      },
      {
        siteFacility: 'Approaching Facility',
        scope1KgCO2e: 8500000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 8500000,
        includedRecords: 1,
        activityBreakdown: [],
      },
      {
        siteFacility: 'Above Facility',
        scope1KgCO2e: 12000000,
        scope2KgCO2e: 0,
        scope3KgCO2e: 0,
        totalKgCO2e: 12000000,
        includedRecords: 1,
        activityBreakdown: [],
      },
    ]);

    expect(FACILITY_REPORTING_THRESHOLD_TCO2E).toBe(10000);
    expect(rows).toMatchObject([
      {
        siteFacility: 'Small Facility',
        totalTCO2e: 1000,
        percentOfReportingThreshold: 10,
        screeningNote: 'Below threshold reference',
      },
      {
        siteFacility: 'Approaching Facility',
        totalTCO2e: 8500,
        percentOfReportingThreshold: 85,
        screeningNote: 'Approaching threshold — review recommended',
      },
      {
        siteFacility: 'Above Facility',
        totalTCO2e: 12000,
        percentOfReportingThreshold: 120,
        screeningNote: 'Above threshold reference — professional review recommended',
      },
    ]);
  });
});
