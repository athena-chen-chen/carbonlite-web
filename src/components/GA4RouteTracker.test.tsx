import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import { trackPageView } from '../services/ga4.service';
import { GA4RouteTracker } from './GA4RouteTracker';

vi.mock('../services/ga4.service', () => ({
  trackPageView: vi.fn(),
}));

describe('GA4RouteTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tracks initial page views and route changes', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GA4RouteTracker />
        <Link to="/reports">Reports</Link>
        <Routes>
          <Route path="/" element={<div>Home page</div>} />
          <Route path="/reports" element={<div>Reports page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(trackPageView).toHaveBeenCalledWith('/', 'Home');

    await userEvent.click(screen.getByRole('link', { name: 'Reports' }));

    expect(trackPageView).toHaveBeenLastCalledWith('/reports', 'Reports');
  });
});
