import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  DuplicateDocumentImportError,
  confirmDocumentImport,
} from './documentExtraction';

describe('confirmDocumentImport', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
  });

  it('sends source document metadata with imported activity records', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ count: 1, createdIds: ['activity-1'] }), {
        status: 200,
      }),
    );

    await confirmDocumentImport('doc-1', [
      {
        activityType: 'WATER',
        recordDate: '2026-05-01',
        quantity: 10,
        unit: 'm3',
        sourceType: 'AI_EXTRACTION',
        sourceReference: 'utility-bill.pdf',
        sourceDocumentId: 'doc-1',
        sourceFileName: 'utility-bill.pdf',
      },
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/document-extraction/confirm`,
      expect.objectContaining({ method: 'POST' }),
    );

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody).toEqual({
      documentId: 'doc-1',
      activities: [
        expect.objectContaining({
          sourceDocumentId: 'doc-1',
          sourceFileName: 'utility-bill.pdf',
        }),
      ],
    });
  });

  it('preserves factor-selection metadata and strips unsupported factor source URL before confirming imported records', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ count: 1, createdIds: ['activity-1'] }), {
        status: 200,
      }),
    );

    await confirmDocumentImport('doc-1', [
      {
        activityType: 'ELECTRICITY',
        recordDate: '2026-05-01',
        quantity: 980,
        unit: 'kWh',
        jurisdictionCountry: 'Canada',
        jurisdictionRegion: 'Alberta',
        matchedFactorId: 'factor-electricity-ab-2025',
        matchedFactorName: 'Electricity - Alberta',
        matchedFactorSourceYear: 2025,
        matchedFactorSourceUrl: 'https://example.test/source',
        factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
        factorSelectionExplanation: 'No exact 2026 factor was available.',
        calculatedEmissionsKgCO2e: 519.4,
        totallyUnknownField: 'x',
      } as any,
    ]);

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody.activities[0]).toMatchObject({
      activityType: 'ELECTRICITY',
      matchedFactorId: 'factor-electricity-ab-2025',
      factorSelectionReason: 'PRIOR_YEAR_FALLBACK',
      factorSelectionExplanation: 'No exact 2026 factor was available.',
      totallyUnknownField: 'x',
    });
    expect(requestBody.activities[0]).not.toHaveProperty('matchedFactorSourceUrl');
  });

  it('preserves canonical spreadsheet cost and source sheet metadata before confirm import', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ count: 1, createdIds: ['activity-march-elec-001'] }), {
        status: 200,
      }),
    );

    await confirmDocumentImport('doc-spreadsheet-1', [
      {
        activityType: 'ELECTRICITY',
        recordDate: '2026-03-01',
        quantity: 980,
        unit: 'kWh',
        sourceType: 'DOCUMENT_AI',
        sourceReference: 'MARCH-ELEC-001',
        sourceDocumentId: 'doc-spreadsheet-1',
        sourceFileName: 'carbonlite_needs_review_test.xlsx',
        sourceSheetName: 'Messy_Operations',
        sourceRow: 2,
        costCad: 214.55,
        costCurrency: 'CAD',
      },
    ]);

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody.activities[0]).toMatchObject({
      sourceReference: 'MARCH-ELEC-001',
      sourceFileName: 'carbonlite_needs_review_test.xlsx',
      sourceSheetName: 'Messy_Operations',
      sourceRow: 2,
      costCad: 214.55,
      costCurrency: 'CAD',
    });
  });

  it('blocks viewer users from importing extracted records', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      confirmDocumentImport('doc-1', [
        {
          activityType: 'DIESEL',
          recordDate: '2026-05-01',
          quantity: 10,
          unit: 'L',
        },
      ]),
    ).rejects.toThrow('You do not have permission to perform this action.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows importing records without a confirmed date', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ count: 1, createdIds: ['activity-1'] }), {
        status: 200,
      }),
    );

    await expect(
      confirmDocumentImport('doc-1', [
        {
          activityType: 'WATER',
          recordDate: null,
          quantity: 10,
          unit: 'm3',
          sourceType: 'AI_EXTRACTION',
          dateEstimated: true,
        },
      ]),
    ).resolves.toEqual({
      count: 1,
      createdIds: ['activity-1'],
    });
  });

  it('sends source document and import batch metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 1,
          createdIds: ['activity-1'],
          importBatchId: 'document-doc-1',
        }),
        { status: 200 },
      ),
    );

    await confirmDocumentImport(
      'doc-1',
      [
        {
          activityType: 'ELECTRICITY',
          recordDate: '2026-05-01',
          quantity: 100,
          unit: 'kWh',
          sourceDocumentId: 'doc-1',
          importBatchId: 'document-doc-1',
        },
      ],
      'document-doc-1',
    );

    const requestBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(requestBody).toMatchObject({
      documentId: 'doc-1',
      importBatchId: 'document-doc-1',
      activities: [
        expect.objectContaining({
          sourceDocumentId: 'doc-1',
          importBatchId: 'document-doc-1',
        }),
      ],
    });
  });

  it('blocks a duplicate document import when the backend returns 409', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'This document has already been imported.',
        }),
        { status: 409 },
      ),
    );

    await expect(
      confirmDocumentImport(
        'doc-1',
        [
          {
            activityType: 'DIESEL',
            recordDate: '2026-05-01',
            quantity: 10,
            unit: 'L',
          },
        ],
        'document-doc-1',
      ),
    ).rejects.toBeInstanceOf(DuplicateDocumentImportError);
  });

  it('accepts a record-level no-op when no new ready records remain', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          count: 0,
          createdIds: [],
          alreadyImported: true,
          skippedCount: 4,
          message: 'No new Ready records to import.',
        }),
        { status: 200 },
      ),
    );

    await expect(
      confirmDocumentImport(
        'doc-1',
        [
          {
            activityType: 'DIESEL',
            recordDate: '2026-05-01',
            quantity: 10,
            unit: 'L',
          },
        ],
        'document-doc-1',
      ),
    ).resolves.toEqual({
      count: 0,
      createdIds: [],
      alreadyImported: true,
      skippedCount: 4,
      message: 'No new Ready records to import.',
    });
  });
});
