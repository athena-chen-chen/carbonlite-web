import {
  buildDataRecordsCsv,
  buildDataRecordsCsvFileName,
} from './dataRecordsCsvExport';

describe('data records CSV export', () => {
  it('builds user-facing CSV columns without internal identifiers', () => {
    const csv = buildDataRecordsCsv([
      {
        activityType: 'HOTEL',
        recordDate: '2026-02-10',
        quantity: 10,
        unit: 'nights',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        facilityName: 'Calgary Office',
        sourceType: 'UPLOAD',
        sourceFileName: 'pilot-data.csv',
        sourceReference: 'Travel tab',
        matchedFactorName: 'Hotel - Canada - 2025',
        matchedFactorValue: 15,
        matchedFactorUnit: 'kgCO2e/night',
        reportTreatment: 'INCLUDED',
        calculationStatus: 'CALCULATED',
        matchingStatus: 'MATCHED',
        scope: 'SCOPE_3',
        calculatedEmissionsKgCO2e: 150,
        notes: 'Business travel accommodation',
      },
    ]);

    expect(csv).toContain('Record Date,Activity Type,Quantity,Unit,Country,Province,Site / Facility');
    expect(csv).toContain('Business Travel - Accommodation');
    expect(csv).toContain('Calgary Office');
    expect(csv).toContain('Scope 3');
    expect(csv).toContain('150');
    expect(csv).not.toContain('activity-');
    expect(csv).not.toContain('organizationId');
    expect(csv).not.toContain('workspaceId');
    expect(csv).not.toContain('matchedFactorId');
    expect(csv).not.toContain('Hotel - Canada');
  });

  it('marks water as tracked only and uses Unassigned for missing site or facility', () => {
    const csv = buildDataRecordsCsv([
      {
        activityType: 'WATER',
        recordDate: '2026-02-10',
        quantity: 100,
        unit: 'm3',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        sourceType: 'MANUAL',
        reportTreatment: 'TRACKED_ONLY',
        calculationStatus: 'TRACKED_ONLY',
        matchingStatus: 'TRACKED_ONLY',
        scope: 'TRACKED_METRIC',
        calculatedEmissionsKgCO2e: 0,
      },
    ]);

    expect(csv).toContain('Water');
    expect(csv).toContain('Unassigned');
    expect(csv).toContain('Tracked Metric');
    expect(csv).toContain('Tracked Only');
    expect(csv).toContain('Manual Entry');
  });

  it('escapes CSV values and builds dated filenames', () => {
    const csv = buildDataRecordsCsv([
      {
        activityType: 'ELECTRICITY',
        recordDate: '2026-01-01',
        quantity: 100,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'British Columbia',
        facilityName: 'Office, Suite "A"',
        sourceType: 'MANUAL',
      },
    ]);

    expect(csv).toContain('"Office, Suite ""A"""');
    expect(buildDataRecordsCsvFileName('filtered', new Date('2026-09-15T12:00:00Z'))).toBe(
      'carbonlite-data-records-filtered-2026-09-15.csv',
    );
  });
});
