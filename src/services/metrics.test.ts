import { FALLBACK_API_BASE_URL } from '../config/api';
import { getCalculationSummary } from './metrics';

describe('metrics calculation summary API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the stable metrics summary endpoint for date-range report summaries', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ totalEmissions: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getCalculationSummary({
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/metrics/summary?periodStart=2026-01-01&periodEnd=2026-12-31`,
      expect.any(Object),
    );
  });

  it('uses the calculation-summary endpoint when selected records require scoped summaries', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ totalEmissions: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await getCalculationSummary({
      selectedActivityRecordIds: ['rec-1', 'rec-2'],
      selectedDocumentIds: ['doc-1'],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/metrics/calculation-summary?selectedActivityRecordIds=rec-1%2Crec-2&selectedDocumentIds=doc-1`,
      expect.any(Object),
    );
  });
});
