import {
  formatCalculationStatusLabel,
  formatFactorMatchStatusLabel,
  formatFactorTypeSourceLabel,
  formatJurisdictionDisplayLabel,
  formatRecordDisplayStatus,
  formatReportTreatmentLabel,
} from './terminology';

describe('canonical terminology', () => {
  it('distinguishes calculated records from records only ready for calculation', () => {
    expect(formatRecordDisplayStatus({
      status: 'READY',
      calculationStatus: 'CALCULATED',
      matchingStatus: 'MATCHED',
      reportTreatment: 'INCLUDED',
    })).toBe('Calculated');

    expect(formatRecordDisplayStatus({ status: 'READY' })).toBe('Ready for Calculation');
  });

  it('uses canonical record and treatment labels', () => {
    expect(formatCalculationStatusLabel('TRACKED_ONLY')).toBe('Tracked Metric');
    expect(formatCalculationStatusLabel('MISSING_PROVINCE')).toBe('Missing Province');
    expect(formatCalculationStatusLabel('INVALID_QUANTITY')).toBe('Invalid Quantity');
    expect(formatCalculationStatusLabel('MISSING_ACTIVITY_TYPE')).toBe('Missing Activity Type');
    expect(formatCalculationStatusLabel('SOME_NEW_ISSUE')).toBe('Some New Issue');
    expect(formatCalculationStatusLabel('SKIPPED_NEEDS_REVIEW')).toBe('Needs Attention');
    expect(formatReportTreatmentLabel('INCLUDED')).toBe('Included in GHG Total');
    expect(formatReportTreatmentLabel('TRACKED_ONLY')).toBe('Tracked Metric');
    expect(formatReportTreatmentLabel('EXCLUDED')).toBe('Excluded');
  });

  it('keeps factor matching technical and source labels explicit', () => {
    expect(formatFactorMatchStatusLabel('MATCHED')).toBe('Factor Matched');
    expect(formatFactorTypeSourceLabel('SYSTEM')).toBe('Provided by CarbonLite');
    expect(formatFactorTypeSourceLabel('CUSTOM')).toBe('Company Factor');
  });

  it('normalizes Canada generic jurisdiction labels', () => {
    expect(formatJurisdictionDisplayLabel('Canada Generic', 'Canada')).toBe('Canada (Generic)');
    expect(formatJurisdictionDisplayLabel('Canada (Generic)', 'Canada')).toBe('Canada (Generic)');
    expect(formatJurisdictionDisplayLabel('', 'Canada')).toBe('Canada (Generic)');
  });
});
