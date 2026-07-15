import { FALLBACK_API_BASE_URL } from '../config/api';
import { createConversionFactor, getConversionFactors } from './conversionFactors';

describe('conversion factor traceability API payloads', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves custom factor traceability fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'factor-1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await createConversionFactor({
      name: 'Custom diesel factor',
      type: 'EMISSION',
      activityType: 'DIESEL',
      unit: 'L',
      factorValue: 2.68,
      resultUnit: 'kgCO2e',
      sourceName: 'Environment Canada',
      sourceReference: '2025 factor table',
      sourceAuthority: 'Environment and Climate Change Canada',
      sourceDocument: 'Canada National Inventory Report',
      sourceYear: 2025,
      sourceUrl: 'https://example.com/factors',
      methodology: 'Applied per reporting guidance.',
      verified: true,
      notes: 'Reviewed for pilot.',
      isDefault: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/conversion-factors`,
      expect.objectContaining({
        method: 'POST',
      }),
    );

    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String((options as RequestInit).body))).toMatchObject({
      sourceAuthority: 'Environment and Climate Change Canada',
      sourceDocument: 'Canada National Inventory Report',
      sourceYear: 2025,
      sourceUrl: 'https://example.com/factors',
      methodology: 'Applied per reporting guidance.',
      verified: true,
      notes: 'Reviewed for pilot.',
    });
  });

  it('adds current pilot electricity factors when the API response does not include them', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const response = await getConversionFactors();
    const electricityRows = response.items.filter((item) => item.activityType === 'ELECTRICITY');

    expect(electricityRows).toHaveLength(3);
    expect(electricityRows.map((item) => item.name)).toEqual([
      'Electricity - Alberta - 2026',
      'Electricity - British Columbia - 2026',
      'Electricity - Ontario - 2026',
    ]);
    expect(electricityRows.map((item) => item.factorValue)).toEqual([0.52, 0.012, 0.03]);
    expect(electricityRows.every((item) => item.unit === 'kWh')).toBe(true);
    expect(electricityRows.every((item) => item.isSystemDefault)).toBe(true);
    expect(response.items.some((item) => item.name === 'Electricity - Province Required')).toBe(false);
  });

  it('filters pilot electricity factors by activity type, year, and jurisdiction aliases', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 1,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const electricity = await getConversionFactors({ activityType: 'ELECTRICITY' });
    expect(electricity.items.map((item) => item.region)).toEqual([
      'Alberta',
      'British Columbia',
      'Ontario',
    ]);

    const alberta = await getConversionFactors({
      activityType: 'ELECTRICITY',
      jurisdiction: 'AB',
      sourceYear: 2026,
    });
    expect(alberta.items).toHaveLength(1);
    expect(alberta.items[0].name).toBe('Electricity - Alberta - 2026');

    const bc = await getConversionFactors({
      activityType: 'ELECTRICITY',
      jurisdiction: 'British Columbia',
    });
    expect(bc.items).toHaveLength(1);
    expect(bc.items[0].factorValue).toBe(0.012);

    const unsupported = await getConversionFactors({
      activityType: 'ELECTRICITY',
      jurisdiction: 'SK',
    });
    expect(unsupported.items).toHaveLength(0);
  });
});
