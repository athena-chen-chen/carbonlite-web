import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { track } from '../services/analytics.service';
import { AnalyticsRouteTracker } from './AnalyticsRouteTracker';

vi.mock('../services/analytics.service', () => ({
  track: vi.fn(),
}));

describe('AnalyticsRouteTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks supported application page views', () => {
    render(
      <MemoryRouter initialEntries={['/metrics-summary?year=2026']}>
        <AnalyticsRouteTracker />
      </MemoryRouter>,
    );

    expect(track).toHaveBeenCalledWith('PAGE_VIEW', {
      pageName: 'Metrics Summary',
      route: '/metrics-summary',
    });
  });

  it('does not track internal or unsupported routes', () => {
    render(
      <MemoryRouter initialEntries={['/audit-log']}>
        <AnalyticsRouteTracker />
      </MemoryRouter>,
    );

    expect(track).not.toHaveBeenCalled();
  });
});
