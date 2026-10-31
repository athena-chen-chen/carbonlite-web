import { render, screen } from '@testing-library/react';
import DashboardPage from './Dashboard';

describe('Dashboard Scope 2 disclosure', () => {
  it('labels Scope 2 as location-based without showing market-based emissions as zero', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Scope 2 — Location-based')).toBeInTheDocument();
    expect(screen.getByText(/Market-based Scope 2 not calculated/)).toBeInTheDocument();
    expect(screen.queryByText(/Market-based Scope 2\s*=\s*0/i)).not.toBeInTheDocument();
  });
});
