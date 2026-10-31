import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DashboardPage from './Dashboard';
import { loadMetricsOverview } from '../services/metricsOverview';

vi.mock('../services/metricsOverview', () => ({
  loadMetricsOverview: vi.fn(),
}));

describe('Dashboard Scope 2 disclosure', () => {
  it('uses backend totals and labels Scope 2 as location-based without a market-based zero', async () => {
    vi.mocked(loadMetricsOverview).mockResolvedValue({
      totalEstimatedEmissionsKgCO2e: 667.5,
      calculationDetails: [
        {
          activityDataId: 'gas-1', activityType: 'NATURAL_GAS', status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 100, factorDefaultScope: 'Scope 1',
        },
        {
          activityDataId: 'electricity-1', activityType: 'ELECTRICITY', status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 547.5,
          factorName: 'Electricity - Alberta - 2026 Location-based',
          factorDefaultScope: 'Scope 2 — Location-based',
        },
        {
          activityDataId: 'hotel-1', activityType: 'HOTEL', status: 'CALCULATED',
          calculatedEmissionsKgCO2e: 20, factorDefaultScope: 'Scope 3',
        },
      ],
    } as Awaited<ReturnType<typeof loadMetricsOverview>>);
    render(<DashboardPage />);

    expect(await screen.findByText('Scope 2 — Location-based')).toBeInTheDocument();
    expect(screen.getByText(/Market-based Scope 2 not calculated/)).toBeInTheDocument();
    expect(screen.queryByText(/Market-based Scope 2\s*=\s*0/i)).not.toBeInTheDocument();
    expect(screen.getByText('667.50 kg CO₂e')).toBeInTheDocument();
    expect(screen.getByText('100 kg CO₂e')).toBeInTheDocument();
    expect(screen.getByText('547.50 kg CO₂e')).toBeInTheDocument();
    expect(screen.getByText('20 kg CO₂e')).toBeInTheDocument();
  });
});
