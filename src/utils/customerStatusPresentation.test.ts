import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_REPAIR_GUIDANCE,
  containsInternalStatusPresentation,
  formatCustomerStatusLabel,
  getCustomerStatusMessage,
  getExcludedFromTotalsMessage,
} from './customerStatusPresentation';

describe('customer status presentation', () => {
  it.each([
    ['MISSING_FACTOR', 'No applicable emission factor was found.'],
    ['FACTOR_NOT_APPROVED', 'A matching factor exists but is not approved for this calculation.'],
    ['UNIT_MISMATCH', 'The activity unit is not compatible with the available factor.'],
    ['INVALID_UNIT', 'This unit is not supported for the selected activity.'],
  ])('presents %s without an internal code', (status, expected) => {
    const message = getCustomerStatusMessage(status);
    expect(message).toBe(expected);
    expect(message).not.toContain(status);
  });

  it('only presents missing-province guidance as electricity guidance for electricity', () => {
    expect(getCustomerStatusMessage('MISSING_PROVINCE', { activityType: 'ELECTRICITY' }))
      .toBe('Select a province before this electricity record can be calculated.');
    expect(getCustomerStatusMessage('MISSING_PROVINCE', { activityType: 'DIESEL' }))
      .toBe('This record needs review.');
  });

  it('uses activity-specific repair guidance', () => {
    expect(getCustomerStatusMessage('UNIT_MISMATCH', { activityType: 'HOTEL' }))
      .toBe(CUSTOMER_REPAIR_GUIDANCE.hotel);
    expect(getCustomerStatusMessage('MISSING_FACTOR', { activityType: 'AIR_TRAVEL' }))
      .toBe(CUSTOMER_REPAIR_GUIDANCE.airTravel);
  });

  it('prioritizes a missing or invalid quantity over downstream matching issues', () => {
    expect(getCustomerStatusMessage('MISSING_FACTOR', { activityType: 'HOTEL', quantity: 0 }))
      .toBe('Enter a quantity greater than 0.');
  });

  it('uses customer language for successful and totals statuses', () => {
    expect(formatCustomerStatusLabel('MATCHED')).toBe('Factor matched');
    expect(formatCustomerStatusLabel('CALCULATED')).toBe('Calculated');
    expect(formatCustomerStatusLabel('INCLUDED')).toBe('Included in totals');
    expect(getExcludedFromTotalsMessage())
      .toBe('This record is not included in totals until the issue is resolved.');
  });

  it('detects raw status codes and the raw exclusion boolean', () => {
    expect(containsInternalStatusPresentation('Status: MISSING_PROVINCE. excludedFromTotals=true')).toBe(true);
    expect(containsInternalStatusPresentation(getExcludedFromTotalsMessage())).toBe(false);
  });
});
