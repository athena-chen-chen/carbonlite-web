import { getAuditLogs } from './auditLogs';
import { apiFetch } from './api';

vi.mock('./api', () => ({ apiFetch: vi.fn().mockResolvedValue({ items: [] }) }));

it('sends exact UTC ISO bounds through the existing dateFrom/dateTo parameters', async () => {
  const dateFrom = '2026-07-15T06:00:00.000Z';
  const dateTo = '2026-07-15T20:30:45.123Z';
  await getAuditLogs({ dateFrom, dateTo, action: 'LOGIN', entityType: 'Authentication', search: 'pilot@example.com' });
  const [path] = vi.mocked(apiFetch).mock.calls[0];
  const url = new URL(path, 'https://test.invalid');
  expect(url.pathname).toBe('/audit-logs');
  expect(Object.fromEntries(url.searchParams)).toEqual({ dateFrom, dateTo, action: 'LOGIN', entityType: 'Authentication', search: 'pilot@example.com' });
});
