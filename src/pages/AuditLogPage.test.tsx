import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
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
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-15T20:30:45.123Z'));
    vi.mocked(getAuditLogs).mockResolvedValue({
      items: [auditLog],
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  afterEach(() => { vi.useRealTimers(); });

  it('renders audit logs and opens detail view', async () => {
    render(<AuditLogPage />);

    expect(await screen.findByText('Update Activity Record')).toBeInTheDocument();
    expect(await screen.findByText('pilot@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('ActivityData').length).toBeGreaterThan(0);
    expect(screen.queryByText('activity-1')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Updated activity record'));

    expect(await screen.findByText('Audit Log Detail')).toBeInTheDocument();
    expect(screen.getByText('Pilot Org')).toBeInTheDocument();
    expect(screen.queryByText(/ActivityData · activity-1/)).not.toBeInTheDocument();
    expect(screen.getByText(/"quantity": "100"/)).toBeInTheDocument();
    expect(screen.getByText(/"quantity": "120"/)).toBeInTheDocument();
  });

  it('passes filters to audit log service', async () => {
    render(<AuditLogPage />);

    await screen.findByText('Update Activity Record');
    await userEvent.selectOptions(screen.getByLabelText(/Action/i), 'DELETE_DOCUMENT');
    await userEvent.selectOptions(screen.getByLabelText(/Entity type/i), 'Document');
    await userEvent.type(screen.getByLabelText(/Search/i), 'invoice');

    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
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
  async function ready() {
    await waitFor(() => expect(screen.getByRole('button', { name: 'Search', exact: true })).toBeEnabled());
  }

  it.each([
    ['2026-01-15T20:30:45.123Z', '2026-01-15T07:00:00.000Z'],
    ['2026-07-15T20:30:45.123Z', '2026-07-15T06:00:00.000Z'],
  ])('executes exactly one initial Today search under StrictMode at %s', async (now, start) => {
    vi.setSystemTime(new Date(now));
    render(<StrictMode><AuditLogPage /></StrictMode>);
    await ready();
    expect(screen.getByLabelText('Date range')).toHaveValue('TODAY');
    expect(screen.getAllByRole('option').filter((option) => ['Last hour', 'Today', 'Last 24 hours', 'Last 7 days', 'Last 30 days', 'Custom'].includes(option.textContent ?? ''))).toHaveLength(6);
    expect(screen.queryByLabelText('Start date/time')).not.toBeInTheDocument();
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    expect(getAuditLogs).toHaveBeenCalledWith({ dateFrom: start, dateTo: now, action: '', entityType: '', search: '' });
  });

  it.each([
    ['LAST_HOUR', '2026-01-15T19:30:45.123Z'],
    ['TODAY', '2026-01-15T07:00:00.000Z'],
    ['LAST_24_HOURS', '2026-01-14T20:30:45.123Z'],
    ['LAST_7_DAYS', '2026-01-08T20:30:45.123Z'],
    ['LAST_30_DAYS', '2025-12-16T20:30:45.123Z'],
  ])('applies %s only when Search is clicked', async (period, start) => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), period);
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Start date/time')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await ready();
    expect(getAuditLogs).toHaveBeenCalledTimes(2);
    expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: start, dateTo: '2026-01-15T20:30:45.123Z' }));
  });

  it('captures one fresh now on Search rather than using the time of preset selection', async () => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'LAST_HOUR');
    vi.setSystemTime(new Date('2026-01-15T21:00:00.000Z'));
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await ready();
    expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: '2026-01-15T20:00:00.000Z', dateTo: '2026-01-15T21:00:00.000Z' }));
  });

  it.each([
    ['TODAY', '2026-01-15T00:00'],
    ['LAST_HOUR', '2026-01-15T12:30:45.123'],
    ['LAST_7_DAYS', '2026-01-08T13:30:45.123'],
  ])('initializes Custom from %s without searching or losing precision', async (period, start) => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), period);
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    expect(screen.getByLabelText('Start date/time')).toHaveValue(start);
    expect(screen.getByLabelText('End date/time')).toHaveValue('2026-01-15T13:30:45.123');
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await ready();
    expect(getAuditLogs).toHaveBeenCalledTimes(2);
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'LAST_24_HOURS');
    expect(screen.queryByLabelText('Start date/time')).not.toBeInTheDocument();
  });

  it('reinitializes Custom from the current preset rather than an old custom edit', async () => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    fireEvent.change(screen.getByLabelText('Start date/time'), { target: { value: '2025-12-01T00:00' } });
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'LAST_HOUR');
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    expect(screen.getByLabelText('Start date/time')).toHaveValue('2026-01-15T12:30:45.123');
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
  });

  it.each(['2026-01-15T00:00', '2026-01-14T23:59'])('rejects custom end <= start (%s), including form submissions', async (end) => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    fireEvent.change(screen.getByLabelText('End date/time'), { target: { value: end } });
    expect(screen.getByRole('alert')).toHaveTextContent('End date/time must be later than start date/time.');
    expect(screen.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Event log filters' }));
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('End date/time'), { target: { value: '2026-01-15T01:00' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    await ready();
    expect(getAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ dateFrom: '2026-01-15T07:00:00.000Z', dateTo: '2026-01-15T08:00:00.000Z' }));
  });

  it('requires both custom values and rejects nonexistent DST times', async () => {
    render(<AuditLogPage />);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    fireEvent.change(screen.getByLabelText('Start date/time'), { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Enter both start and end date/time.');
    expect(screen.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Start date/time'), { target: { value: '2026-03-08T02:30' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Times skipped during daylight saving are not valid.');
    expect(getAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('resets all filters, hides Custom, clears validation, and executes exactly one fresh Today search', async () => {
    render(<StrictMode><AuditLogPage /></StrictMode>);
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Action'), 'LOGIN');
    await userEvent.selectOptions(screen.getByLabelText('Entity type'), 'Authentication');
    await userEvent.type(screen.getByLabelText('Search'), 'pilot');
    await userEvent.selectOptions(screen.getByLabelText('Date range'), 'CUSTOM');
    fireEvent.change(screen.getByLabelText('End date/time'), { target: { value: '' } });
    vi.setSystemTime(new Date('2026-07-15T20:30:00.000Z'));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await ready();
    expect(screen.getByLabelText('Date range')).toHaveValue('TODAY');
    expect(screen.getByLabelText('Action')).toHaveValue('');
    expect(screen.getByLabelText('Entity type')).toHaveValue('');
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.queryByLabelText('Start date/time')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getAuditLogs).toHaveBeenCalledTimes(2);
    expect(getAuditLogs).toHaveBeenLastCalledWith({ dateFrom: '2026-07-15T06:00:00.000Z', dateTo: '2026-07-15T20:30:00.000Z', action: '', entityType: '', search: '' });
  });

  it('shows No Events Found only after a successful empty response, not loading or errors', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getAuditLogs).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<AuditLogPage />);
    expect(screen.getByText('Loading audit logs...')).toBeInTheDocument();
    expect(screen.queryByText('No Events Found')).not.toBeInTheDocument();
    resolve({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    expect(await screen.findByText('No Events Found')).toBeVisible();
    vi.mocked(getAuditLogs).mockRejectedValueOnce(new Error('API unavailable'));
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText('Unable to load audit logs. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('No Events Found')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Search', exact: true }));
    expect(await screen.findByText('Updated activity record')).toBeInTheDocument();
    expect(screen.queryByText('Unable to load audit logs. Please try again.')).not.toBeInTheDocument();
    expect(screen.queryByText('No Events Found')).not.toBeInTheDocument();
  });

  it('shows the inclusive API interval response and excludes outside events', async () => {
    // Model the audited API contract: createdAt gte dateFrom and lte dateTo.
    const events = [
      ['before', '2026-01-15T06:59:59.999Z'], ['start', '2026-01-15T07:00:00.000Z'],
      ['inside', '2026-01-15T12:00:00.000Z'], ['end', '2026-01-15T20:30:45.123Z'],
      ['after', '2026-01-15T20:30:45.124Z'],
    ];
    vi.mocked(getAuditLogs).mockImplementation(async (query = {}) => ({
      items: events.filter(([, timestamp]) => timestamp >= query.dateFrom! && timestamp <= query.dateTo!)
        .map(([id, createdAt]) => ({ ...auditLog, id, createdAt, description: `event-${id}` })),
      page: 1, pageSize: 20, total: 3, totalPages: 1,
    }));
    render(<AuditLogPage />);
    expect(await screen.findByText('event-inside')).toBeInTheDocument();
    expect(screen.getByText('event-start')).toBeInTheDocument();
    expect(screen.getByText('event-end')).toBeInTheDocument();
    expect(screen.queryByText('event-before')).not.toBeInTheDocument();
    expect(screen.queryByText('event-after')).not.toBeInTheDocument();
  });

  it('ignores an older response when Reset finishes first', async () => {
    let resolve!: (value: any) => void;
    vi.mocked(getAuditLogs).mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    render(<AuditLogPage />);
    vi.mocked(getAuditLogs).mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(await screen.findByText('No Events Found')).toBeInTheDocument();
    resolve({ items: [auditLog], page: 1, pageSize: 20, total: 1, totalPages: 1 });
    await ready();
    expect(screen.queryByText('Updated activity record')).not.toBeInTheDocument();
    expect(screen.getByText('No Events Found')).toBeInTheDocument();
  });

});
