import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  DuplicateDocumentError,
  calculateFileSha256,
  deleteDocument,
  getDocuments,
  uploadDocument,
} from './documents';

describe('deleteDocument', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'user@example.com',
        role: 'USER',
        accountType: 'CUSTOMER',
        organizationId: 'org-1',
      }),
    );
  });

  it('deletes the current user document with an authenticated request', async () => {
    localStorage.setItem('accessToken', 'owner-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        deletedDocument: true,
        deletedActivityRecords: 3,
      }), { status: 200 }),
    );

    await expect(deleteDocument('doc-1')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/documents/doc-1`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer owner-token',
        }),
      }),
    );
  });

  it('keeps old 204 delete responses working with zero related activity records', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await expect(deleteDocument('doc-without-activity')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 0,
    });
  });

  it('shows a permission-friendly error when another organization document is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(deleteDocument('other-org-doc')).rejects.toThrow(
      'You do not have permission to perform this action.',
    );
  });

  it('uses the document delete endpoint for backend cascade deletion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        deletedDocument: true,
        deletedActivityRecords: 2,
      }), { status: 200 }),
    );

    await expect(deleteDocument('imported-doc')).resolves.toEqual({
      deletedDocument: true,
      deletedActivityRecords: 2,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${FALLBACK_API_BASE_URL}/documents/imported-doc`,
    );
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('/activity-data')),
    ).toBe(false);
  });
});

describe('uploadDocument duplicate protection', () => {
  function mockUploadApi(documents: any[] = []) {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith('/documents') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            items: documents,
            page: 1,
            pageSize: documents.length,
            total: documents.length,
            totalPages: 1,
          }),
          { status: 200 },
        );
      }

      if (path.endsWith('/documents/upload') && init?.method === 'POST') {
        const formData = init.body as FormData;
        const file = formData.get('file') as File;
        const fileHash = String(formData.get('fileHash') ?? '');
        const document = {
          id: `doc-${documents.length + 1}`,
          organizationId: 'org-1',
          fileName: file.name,
          fileUrl: '',
          type: String(formData.get('type') ?? 'SPREADSHEET'),
          status: 'UPLOADED',
          fileHash,
          createdAt: '2026-06-10T00:00:00.000Z',
          updatedAt: '2026-06-10T00:00:00.000Z',
        };
        documents.unshift(document);
        return new Response(JSON.stringify(document), { status: 201 });
      }

      return new Response('not found', { status: 404 });
    });
  }

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'member@example.com', role: 'MEMBER', organizationId: 'org-1' }),
    );
    vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (_algorithm, data) => {
      const input = new Uint8Array(
        data instanceof ArrayBuffer
          ? data
          : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      );
      const digest = new Uint8Array(32);
      input.forEach((byte, index) => {
        digest[index % digest.length] =
          (digest[index % digest.length] + byte) % 256;
      });
      return digest.buffer;
    });
  });

  it('calculates a stable SHA-256 hash for the uploaded file', async () => {
    const file = new File(['utility data'], 'utility.xlsx');

    await expect(calculateFileSha256(file)).resolves.toMatch(/^[a-f0-9]{64}$/);
    await expect(calculateFileSha256(file)).resolves.toBe(
      await calculateFileSha256(new File(['utility data'], 'copy.xlsx')),
    );
  });

  it('converts a backend duplicate response into a friendly structured error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith('/documents') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ items: [], page: 1, pageSize: 0, total: 0, totalPages: 1 }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          message: 'This file has already been uploaded.',
          existingDocumentId: 'existing-doc',
          existingDocument: {
            id: 'existing-doc',
            fileName: 'utility.xlsx',
            createdAt: '2026-05-30T10:00:00.000Z',
          },
        }),
        { status: 409 },
      );
    });

    await expect(
      uploadDocument({
        file: new File(['utility data'], 'utility.xlsx'),
        type: 'SPREADSHEET',
      }),
    ).rejects.toMatchObject({
      name: 'DuplicateDocumentError',
      message: 'This file has already been uploaded.',
      existingDocument: {
        id: 'existing-doc',
        fileName: 'utility.xlsx',
        createdAt: '2026-05-30T10:00:00.000Z',
      },
    } satisfies Partial<DuplicateDocumentError>);
  });

  it('blocks exact same bytes uploaded again with the same filename', async () => {
    const documents: any[] = [];
    const fetchMock = mockUploadApi(documents);
    const file = new File(['utility data'], 'utility.xlsx');

    await expect(uploadDocument({ file, type: 'SPREADSHEET' })).resolves.toMatchObject({
      fileName: 'utility.xlsx',
      fileHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    });

    await expect(
      uploadDocument({ file: new File(['utility data'], 'utility.xlsx'), type: 'SPREADSHEET' }),
    ).rejects.toMatchObject({
      name: 'DuplicateDocumentError',
      existingDocument: expect.objectContaining({
        id: 'doc-1',
        fileName: 'utility.xlsx',
      }),
    });
    expect(documents).toHaveLength(1);
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/documents/upload')),
    ).toHaveLength(1);
  });

  it('blocks exact same bytes uploaded with a different filename', async () => {
    const documents: any[] = [];
    mockUploadApi(documents);

    await uploadDocument({
      file: new File(['utility data'], 'utility.xlsx'),
      type: 'SPREADSHEET',
    });

    await expect(
      uploadDocument({
        file: new File(['utility data'], 'renamed-utility.xlsx'),
        type: 'SPREADSHEET',
      }),
    ).rejects.toMatchObject({
      name: 'DuplicateDocumentError',
      existingDocument: expect.objectContaining({
        fileName: 'utility.xlsx',
      }),
    });
    expect(documents).toHaveLength(1);
  });

  it('allows the same filename when file content changed', async () => {
    const documents: any[] = [];
    mockUploadApi(documents);

    await uploadDocument({
      file: new File(['utility data version 1'], 'utility.xlsx'),
      type: 'SPREADSHEET',
    });
    await expect(
      uploadDocument({
        file: new File(['utility data version 2'], 'utility.xlsx'),
        type: 'SPREADSHEET',
      }),
    ).resolves.toMatchObject({
      fileName: 'utility.xlsx',
    });
    expect(documents).toHaveLength(2);
    expect(documents[0].fileHash).not.toBe(documents[1].fileHash);
  });

  it('allows another organization to upload identical file content independently', async () => {
    const existingHash = await calculateFileSha256(new File(['utility data'], 'utility.xlsx'));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      if (path.endsWith('/documents') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'org-2-doc',
                organizationId: 'org-2',
                fileName: 'utility.xlsx',
                fileUrl: '',
                type: 'SPREADSHEET',
                status: 'UPLOADED',
                fileHash: existingHash,
                createdAt: '2026-06-10T00:00:00.000Z',
                updatedAt: '2026-06-10T00:00:00.000Z',
              },
            ],
            page: 1,
            pageSize: 1,
            total: 1,
            totalPages: 1,
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          id: 'org-1-doc',
          organizationId: 'org-1',
          fileName: 'utility-copy.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'UPLOADED',
          fileHash: String((init?.body as FormData).get('fileHash')),
          createdAt: '2026-06-10T00:00:00.000Z',
          updatedAt: '2026-06-10T00:00:00.000Z',
        }),
        { status: 201 },
      );
    });

    await expect(
      uploadDocument({
        file: new File(['utility data'], 'utility-copy.xlsx'),
        type: 'SPREADSHEET',
      }),
    ).resolves.toMatchObject({
      id: 'org-1-doc',
      organizationId: 'org-1',
    });

    const uploadBody = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/documents/upload'),
    )?.[1]?.body as FormData;
    expect(uploadBody.get('fileHash')).toBe(existingHash);
  });

  it('posts the content hash with a new upload and never sends a duplicate override', async () => {
    const fetchMock = mockUploadApi([]);

    await uploadDocument(
      {
        file: new File(['utility data'], 'utility-copy.xlsx'),
        type: 'SPREADSHEET',
      },
    );

    const uploadCall = fetchMock.mock.calls.find(([url]) =>
      String(url).endsWith('/documents/upload'),
    );
    const formData = uploadCall?.[1]?.body as FormData;
    expect(formData.get('allowDuplicate')).toBeNull();
    expect(String(formData.get('fileHash'))).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('getDocuments', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('filters uploaded documents by current organization when tenant metadata is present', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({ email: 'viewer@example.com', role: 'VIEWER', organizationId: 'org-1' }),
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'doc-1',
              organizationId: 'org-1',
              fileName: 'org-1.xlsx',
              fileUrl: '',
              type: 'SPREADSHEET',
              status: 'UPLOADED',
              createdAt: '2026-07-20T00:00:00.000Z',
              updatedAt: '2026-07-20T00:00:00.000Z',
            },
            {
              id: 'doc-2',
              organizationId: 'org-2',
              fileName: 'org-2.xlsx',
              fileUrl: '',
              type: 'SPREADSHEET',
              status: 'UPLOADED',
              createdAt: '2026-07-20T00:00:00.000Z',
              updatedAt: '2026-07-20T00:00:00.000Z',
            },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(getDocuments()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'doc-1', organizationId: 'org-1' })],
      total: 1,
    });
  });

  it('returns no uploaded documents without an authenticated company context', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'doc-1',
              organizationId: 'org-1',
              fileName: 'org-1.xlsx',
              fileUrl: '',
              type: 'SPREADSHEET',
              status: 'UPLOADED',
              createdAt: '2026-07-20T00:00:00.000Z',
              updatedAt: '2026-07-20T00:00:00.000Z',
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    await expect(getDocuments()).resolves.toMatchObject({
      items: [],
      total: 0,
      totalPages: 1,
    });
  });
});
