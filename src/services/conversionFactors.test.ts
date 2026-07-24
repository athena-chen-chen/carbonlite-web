import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  createConversionFactor,
  deleteConversionFactor,
  getConversionFactorById,
  getConversionFactors,
  updateConversionFactor,
} from './conversionFactors';

describe('conversion factor traceability API payloads', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('saves custom factor traceability fields', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'admin@example.com', role: 'ADMIN', organizationId: 'org-1' }),
    );
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
    expect(electricityRows.map((item) => item.factorValue)).toEqual([0.53, 0.02, 0.12]);
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
    expect(bc.items[0].factorValue).toBe(0.02);

    const unsupported = await getConversionFactors({
      activityType: 'ELECTRICITY',
      jurisdiction: 'SK',
    });
    expect(unsupported.items).toHaveLength(0);
  });

  it('adds the current pilot Ground Transport system factor when the API response omits it', async () => {
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

    const response = await getConversionFactors({ activityType: 'Ground Transport' });

    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      name: 'Ground Transport - Canada - 2025',
      activityType: 'GROUND_TRANSPORT',
      jurisdiction: 'Canada - National',
      inputUnit: 'km',
      factorValue: 0.2,
      sourceAuthority: 'CarbonLite',
      sourceYear: 2025,
      confidenceLevel: 'Pilot Estimate',
      verificationStatus: 'Internal Review Required',
      isSystemDefault: true,
      defaultScope: 'SCOPE_3',
    });
  });

  it('filters the pilot Ground Transport factor by national jurisdiction and source year', async () => {
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

    const national = await getConversionFactors({
      activityType: 'GROUND_TRANSPORT',
      jurisdiction: 'Canada - National',
      sourceYear: 2025,
    });
    expect(national.items.map((item) => item.name)).toEqual([
      'Ground Transport - Canada - 2025',
    ]);

    const provincial = await getConversionFactors({
      activityType: 'GROUND_TRANSPORT',
      jurisdiction: 'AB',
    });
    expect(provincial.items).toHaveLength(0);

    const wrongYear = await getConversionFactors({
      activityType: 'GROUND_TRANSPORT',
      sourceYear: 2026,
    });
    expect(wrongYear.items).toHaveLength(0);
  });

  it('keeps system and same-company custom factors visible but filters other-company factors', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({
        items: [
          {
            id: 'system-diesel',
            organizationId: null,
            name: 'System diesel',
            type: 'EMISSION',
            activityType: 'DIESEL',
            unit: 'L',
            factorValue: 2.68,
            resultUnit: 'kgCO2e',
            isDefault: true,
            isSystemDefault: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'org-1-factor',
            organizationId: 'org-1',
            factorType: 'CUSTOM',
            name: 'Org 1 diesel',
            type: 'EMISSION',
            activityType: 'DIESEL',
            unit: 'L',
            factorValue: 2.7,
            resultUnit: 'kgCO2e',
            isDefault: true,
            isSystemDefault: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'org-2-factor',
            organizationId: 'org-2',
            factorType: 'CUSTOM',
            name: 'Org 2 diesel',
            type: 'EMISSION',
            activityType: 'DIESEL',
            unit: 'L',
            factorValue: 2.9,
            resultUnit: 'kgCO2e',
            isDefault: true,
            isSystemDefault: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 3,
        totalPages: 1,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    const response = await getConversionFactors({ activityType: 'DIESEL' });

    expect(response.items.map((item) => item.id)).toEqual([
      'system-diesel',
      'org-1-factor',
    ]);
  });

  it('blocks normal users from editing company factors', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      createConversionFactor({
        name: 'Member custom factor',
        type: 'EMISSION',
        factorType: 'CUSTOM',
        activityType: 'DIESEL',
        unit: 'L',
        factorValue: 2.7,
        resultUnit: 'kgCO2e',
        sourceAuthority: 'Consultant source',
        sourceYear: 2026,
      }),
    ).rejects.toThrow('You do not have permission to perform this action.');
    await expect(updateConversionFactor('factor-1', { factorValue: 2.7 })).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
    await expect(deleteConversionFactor('factor-1')).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks direct detail access to another company custom factor', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(
      new Response(JSON.stringify({
        id: 'org-2-factor',
        organizationId: 'org-2',
        factorType: 'CUSTOM',
        name: 'Org 2 diesel',
        type: 'EMISSION',
        activityType: 'DIESEL',
        unit: 'L',
        factorValue: 2.9,
        resultUnit: 'kgCO2e',
        isDefault: true,
        isSystemDefault: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(getConversionFactorById('org-2-factor')).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
  });
});
