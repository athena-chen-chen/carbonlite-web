import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  DuplicateDocumentImportError,
  confirmDocumentImport,
} from './documentExtraction';

describe('confirmDocumentImport', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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
});
