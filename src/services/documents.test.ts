import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  DuplicateDocumentError,
  calculateFileSha256,
  deleteDocument,
  uploadDocument,
} from './documents';

describe('deleteDocument', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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

  it('shows an ownership-friendly error when another organization document is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('forbidden', { status: 403 }),
    );

    await expect(deleteDocument('other-org-doc')).rejects.toThrow(
      'You can only delete your own uploaded documents.',
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
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
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
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'This file appears to have already been uploaded.',
          existingDocument: {
            id: 'existing-doc',
            fileName: 'utility.xlsx',
            createdAt: '2026-05-30T10:00:00.000Z',
          },
        }),
        { status: 409 },
      ),
    );

    await expect(
      uploadDocument({
        file: new File(['utility data'], 'utility.xlsx'),
        type: 'SPREADSHEET',
      }),
    ).rejects.toMatchObject({
      name: 'DuplicateDocumentError',
      message: 'This file appears to have already been uploaded.',
      existingDocument: {
        id: 'existing-doc',
        fileName: 'utility.xlsx',
        createdAt: '2026-05-30T10:00:00.000Z',
      },
    } satisfies Partial<DuplicateDocumentError>);
  });

  it('sends an explicit override only when keeping a separate copy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'new-doc',
          fileName: 'utility-copy.xlsx',
          fileUrl: '',
          type: 'SPREADSHEET',
          status: 'UPLOADED',
          createdAt: '2026-06-10T00:00:00.000Z',
          updatedAt: '2026-06-10T00:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    await uploadDocument({
      file: new File(['utility data'], 'utility-copy.xlsx'),
      type: 'SPREADSHEET',
      allowDuplicate: true,
    });

    const formData = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(formData.get('allowDuplicate')).toBe('true');
    expect(String(formData.get('fileHash'))).toMatch(/^[a-f0-9]{64}$/);
  });
});
