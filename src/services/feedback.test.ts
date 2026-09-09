import { FALLBACK_API_BASE_URL } from '../config/api';
import {
  FEEDBACK_EMAIL_VALIDATION_MESSAGE,
  getAdminFeedbackList,
  submitFeedback,
  updateAdminFeedbackStatus,
} from './feedback';

describe('feedback service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('submits normal user feedback to the user feedback endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'feedback-1',
          type: 'BUG',
          intent: 'Import records',
          message: 'Import failed',
          status: 'NEW',
          createdAt: '2026-06-29T12:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    await submitFeedback({
      type: 'BUG',
      intent: 'Import records',
      message: 'Import failed',
      email: '  Pilot@Example.com  ',
      page: '/upload',
      url: 'https://carbonliteapp.ca/upload',
      workspaceName: 'CarbonLite Sample Workspace',
      accountType: 'PILOT_REVIEWER',
      appVersion: 'v0.2-test',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/feedback`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'BUG',
          intent: 'Import records',
          message: 'Import failed',
          email: 'pilot@example.com',
          page: '/upload',
          url: 'https://carbonliteapp.ca/upload',
        }),
      }),
    );
  });

  it('omits blank optional feedback email from the backend payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'feedback-1',
          type: 'QUESTION',
          intent: 'Ask question',
          message: 'Can email be blank?',
          status: 'NEW',
          createdAt: '2026-06-29T12:00:00.000Z',
        }),
        { status: 200 },
      ),
    );

    await submitFeedback({
      type: 'QUESTION',
      intent: 'Ask question',
      message: 'Can email be blank?',
      email: '   ',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/feedback`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'QUESTION',
          intent: 'Ask question',
          message: 'Can email be blank?',
        }),
      }),
    );
  });

  it('rejects invalid feedback emails before submitting', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      submitFeedback({
        type: 'BUG',
        intent: 'Report feedback issue',
        message: 'The feedback form failed.',
        email: '[pilot@example.com](mailto:pilot@example.com)',
      }),
    ).rejects.toThrow(FEEDBACK_EMAIL_VALIDATION_MESSAGE);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads admin feedback from the admin-wide endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 }), {
        status: 200,
      }),
    );

    await getAdminFeedbackList('NEW');

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/feedback?status=NEW`,
      expect.any(Object),
    );
  });

  it('updates feedback status through the admin endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'feedback-1', status: 'PLANNED' }), {
        status: 200,
      }),
    );

    await updateAdminFeedbackStatus('feedback-1', 'PLANNED');

    expect(fetchMock).toHaveBeenCalledWith(
      `${FALLBACK_API_BASE_URL}/admin/feedback/feedback-1/status`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ status: 'PLANNED' }),
      }),
    );
  });
});
