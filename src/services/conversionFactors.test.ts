import { FALLBACK_API_BASE_URL } from '../config/api';
import { createConversionFactor } from './conversionFactors';

describe('conversion factor traceability API payloads', () => {
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
});
