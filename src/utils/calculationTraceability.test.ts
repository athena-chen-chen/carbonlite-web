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
    expect(buildCalculatedFormula(airTravelDetail)).toBe('5,000 km × 0.115 kgCO2e/km = 575 kgCO2e');
  });

  it('trims unnecessary trailing decimals for whole-number and two-decimal factors', () => {
    expect(formatFactorValue(15)).toBe('15');
    expect(formatFactorValue(2.31)).toBe('2.31');
    expect(formatFactorValue(0.12)).toBe('0.12');
  });

  it('keeps quantity units plural while factor denominators are singular', () => {
    const gasolineDetail = {
      status: 'CALCULATED',
      activityType: 'GASOLINE',
      activityQuantity: 500,
      activityUnit: 'liters',
      factorValue: 2.31,
      factorInputUnit: 'liters',
      factorResultUnit: 'kgCO2e',
      calculatedEmissionsKgCO2e: 1155,
    } as any;
    const hotelDetail = {
      status: 'CALCULATED',
      activityType: 'HOTEL',
      activityQuantity: 10,
      activityUnit: 'nights',
      factorValue: 15,
      factorInputUnit: 'nights',
      factorResultUnit: 'kgCO2e',
      calculatedEmissionsKgCO2e: 150,
    } as any;

    expect(buildCalculatedFormula(gasolineDetail)).toBe(
      '500 liters × 2.31 kgCO2e/liter = 1,155 kgCO2e',
    );
    expect(formatTraceableFactor(gasolineDetail)).toBe('2.31 kgCO2e/liter');
    expect(buildCalculatedFormula(hotelDetail)).toBe(
      '10 nights × 15 kgCO2e/night = 150 kgCO2e',
    );
    expect(formatTraceableFactor(hotelDetail)).toBe('15 kgCO2e/night');
  });

  it('normalizes preformatted plural factor result units', () => {
    const dieselDetail = {
      status: 'CALCULATED',
      activityType: 'DIESEL',
      activityQuantity: 100,
      activityUnit: 'liters',
      factorValue: 2.68,
      factorInputUnit: 'liters',
      factorResultUnit: 'kgCO2e/liters',
      calculatedEmissionsKgCO2e: 268,
    } as any;

    expect(formatTraceableFactor(dieselDetail)).toBe('2.68 kgCO2e/liter');
    expect(buildCalculatedFormula(dieselDetail)).toBe(
      '100 liters × 2.68 kgCO2e/liter = 268 kgCO2e',
    );
  });

  it('shows unit conversion when the activity unit differs from the factor input unit', () => {
    const mwhElectricityDetail = {
      status: 'CALCULATED',
      activityType: 'ELECTRICITY',
      activityQuantity: 50,
      activityUnit: 'MWh',
      factorValue: 0.53,
      factorInputUnit: 'kWh',
      factorResultUnit: 'kgCO2e',
      calculatedEmissionsKgCO2e: 26500,
    } as any;

    expect(buildCalculatedFormula(mwhElectricityDetail)).toBe(
      '50 MWh × 1,000 = 50,000 kWh; 50,000 kWh × 0.53 kgCO2e/kWh = 26,500 kgCO2e',
    );
  });
});
