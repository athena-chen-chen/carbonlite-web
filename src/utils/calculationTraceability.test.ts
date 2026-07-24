import {
  buildCalculatedFormula,
  formatFactorValue,
  formatTraceableFactor,
} from './calculationTraceability';

describe('calculation traceability formatting', () => {
  it('displays factor precision consistently with the calculation formula', () => {
    const airTravelDetail = {
      status: 'CALCULATED',
      activityType: 'AIR_TRAVEL',
      activityQuantity: 5000,
      activityUnit: 'km',
      factorValue: 0.115,
      factorInputUnit: 'km',
      factorResultUnit: 'kgCO2e',
      calculatedEmissionsKgCO2e: 575,
    } as any;

    expect(formatFactorValue(0.115)).toBe('0.115');
    expect(formatTraceableFactor(airTravelDetail)).toBe('0.115 kgCO2e/km');
    expect(buildCalculatedFormula(airTravelDetail)).toBe('5,000 × 0.115 = 575 kgCO2e');
  });

  it('trims unnecessary trailing decimals for whole-number and two-decimal factors', () => {
    expect(formatFactorValue(15)).toBe('15');
    expect(formatFactorValue(2.31)).toBe('2.31');
    expect(formatFactorValue(0.12)).toBe('0.12');
  });
});
