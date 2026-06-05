import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getAuditLogs, type AuditLogItem } from '../services/auditLogs';
import { AuditLogPage } from './AuditLogPage';

vi.mock('../services/auditLogs', () => ({
  getAuditLogs: vi.fn(),
}));

describe('AuditLogPage', () => {
  const auditLog: AuditLogItem = {
    id: 'audit-1',
    organizationId: 'org-1',
    userId: 'user-1',
    action: 'UPDATE_ACTIVITY_RECORD',
    entityType: 'ActivityData',
    entityId: 'activity-1',
    description: 'Updated activity record',
    oldValue: { quantity: '100' },
    newValue: { quantity: '120' },
    page: '/data-records',
    createdAt: '2026-06-04T12:00:00.000Z',
    user: {
      id: 'user-1',
      email: 'pilot@example.com',
    },
    organization: {
      id: 'org-1',
      name: 'Pilot Org',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuditLogs).mockResolvedValue({
      items: [auditLog],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('renders audit logs and opens detail view', async () => {
    render(<AuditLogPage />);

    expect(await screen.findByText('Update Activity Record')).toBeInTheDocument();
    expect(await screen.findByText('pilot@example.com')).toBeInTheDocument();
    expect(screen.getByText('ActivityData · activity-1')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Updated activity record'));

    expect(await screen.findByText('Audit Log Detail')).toBeInTheDocument();
    expect(screen.getByText('Pilot Org')).toBeInTheDocument();
    expect(screen.getByText(/"quantity": "100"/)).toBeInTheDocument();
    expect(screen.getByText(/"quantity": "120"/)).toBeInTheDocument();
  });

  it('passes filters to audit log service', async () => {
    render(<AuditLogPage />);

    await screen.findByText('Update Activity Record');
    await userEvent.selectOptions(screen.getByLabelText(/Action/i), 'DELETE_DOCUMENT');
    await userEvent.selectOptions(screen.getByLabelText(/Entity type/i), 'Document');
    await userEvent.type(screen.getByLabelText(/Search/i), 'invoice');

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          action: 'DELETE_DOCUMENT',
          entityType: 'Document',
          search: 'invoice',
        }),
      );
    });
  });
});
