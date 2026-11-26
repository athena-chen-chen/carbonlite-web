import { ApiError } from './api';
import { deleteDocument } from './documents';
import * as telemetry from '../sentry';
import { documentDeleteFailureMessage } from '../utils/documentDeleteFailure';

const requestId = '72676144-1328-4cd1-95f4-d677e7d55139';
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('currentUser', JSON.stringify({ role: 'OWNER', accountType: 'CUSTOMER', organizationId: 'synthetic' }));
});
afterEach(() => vi.restoreAllMocks());

it('preserves ApiError status, code, response data and reference through the deletion service', async () => {
  const capture = vi.spyOn(telemetry, 'captureFrontendException');
  const body = { code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', requestId, message: 'secret-server-canary' };
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status: 503 }));
  let error: unknown;
  try { await deleteDocument('private-document-canary'); } catch (e) { error = e; }
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status: 503, code: body.code, data: body });
  expect(documentDeleteFailureMessage(error)).toContain(requestId);
  expect(documentDeleteFailureMessage(error)).not.toContain('canary');
  expect(capture).not.toHaveBeenCalled();
});

it.each(['secret-token', requestId + '\nsecret-token', '../secret', 'x'.repeat(3000)])(
  'does not render an invalid server reference', async invalid => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', requestId: invalid, message: 'secret-canary',
    }), { status: 503 }));
    let error: unknown;
    try { await deleteDocument('synthetic'); } catch (e) { error = e; }
    expect(documentDeleteFailureMessage(error)).toBe('Unable to delete source document. Please try again.');
  });

it('does not misclassify authorization denial or copy arbitrary exception messages', () => {
  const error = new ApiError(403, 'secret-canary', { code: 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED', requestId }, 'FORBIDDEN');
  expect(documentDeleteFailureMessage(error)).toBe('Unable to delete source document. Please try again.');
});

it('does not send delete transport failures with concrete paths or raw exceptions to telemetry', async () => {
  const capture = vi.spyOn(telemetry, 'captureFrontendException');
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('token-canary'));
  await expect(deleteDocument('private-document-canary')).rejects.toThrow();
  expect(capture).not.toHaveBeenCalled();
});
