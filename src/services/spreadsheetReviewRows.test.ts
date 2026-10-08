import { FALLBACK_API_BASE_URL } from '../config/api';
import { saveSpreadsheetReviewRows } from './spreadsheetReviewRows';

describe('saveSpreadsheetReviewRows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
  });

  it('preserves factor-selection metadata and strips unsupported factor source URL before saving', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ savedCount: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await saveSpreadsheetReviewRows({
      sourceType: 'EXCEL',
      importBatchId: 'batch-1',
      rows: [
        {
          rowId: 'row-1',
          status: 'READY',
          activityType: 'ELECTRICITY',
          rawActivityType: 'Electricity',
          recordDate: '2026-05-31',
          quantity: 980,
          rawQuantity: '980',
          unit: 'kWh',
          jurisdictionCountry: 'Canada',
          jurisdictionRegion: 'Alberta',
          sourceSheetName: 'Messy_Operations',
          sourceRow: 2,
          costCad: 214.55,
          costCurrency: 'CAD',
          issues: [],
          matchingStatus: 'MATCHED',
          calculationStatus: 'CALCULATED',
          reportTreatment: 'INCLUDED',
          matchedFactorId: 'factor-electricity-ab-2025',
          matchedFactorName: 'Electricity - Alberta',
          matchedFactorSourceYear: 2025,
          matchedFactorValue: 0.53,
          matchedFactorUnit: 'kgCO2e/kWh',
          matchedFactorSourceUrl: 'https://example.test/source',
          factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
          factorSelectionExplanation: 'No exact 2026 factor was available.',
          calculatedEmissionsKgCO2e: 519.4,
          totallyUnknownField: 'x',
        } as any,
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/spreadsheet-import/review-rows`,
      expect.objectContaining({ method: 'POST' }),
    );

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody.rows[0]).toMatchObject({
      rowId: 'row-1',
      activityType: 'ELECTRICITY',
      matchedFactorId: 'factor-electricity-ab-2025',
      sourceSheetName: 'Messy_Operations',
      sourceRow: 2,
      costCad: 214.55,
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
      factorSelectionExplanation: 'No exact 2026 factor was available.',
      totallyUnknownField: 'x',
    });
    expect(requestBody.rows[0]).not.toHaveProperty('matchedFactorSourceUrl');
  });
});
