import { FALLBACK_API_BASE_URL } from '../config/api';
import { getOrganizationAiStatus } from './aiAuthorization';

describe('organization AI authorization status', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', 'customer-token');
    vi.restoreAllMocks();
  });

  it('reads only the authenticated organization safe status endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        enabled: false,
        status: 'NOT_CONFIGURED',
        provider: 'OPENAI',
        processingScope: 'DOCUMENT_EXTRACTION',
        effectiveAt: null,
        expiresAt: null,
        withdrawnAt: null,
      }), { status: 200 }),
    );

    await expect(getOrganizationAiStatus()).resolves.toMatchObject({
      enabled: false,
      status: 'NOT_CONFIGURED',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/ai-authorization/status`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer customer-token' }),
      }),
    );
  });
});
