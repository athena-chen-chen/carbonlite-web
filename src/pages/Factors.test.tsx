import { render, screen, within } from '@testing-library/react';
import Factors, { demoFactors } from './Factors';

describe('Factors demo page', () => {
  it('clearly labels demo factors as unverified workflow examples', () => {
    render(<Factors />);

    expect(
      screen.getByText(/Demo factors are provided for workflow validation only/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Unverified')).toHaveLength(demoFactors.length);
    expect(screen.getAllByText('Demo / Placeholder')).toHaveLength(
      demoFactors.length,
    );
  });

  it('shows the electricity jurisdiction and placeholder traceability', () => {
    render(<Factors />);

    const electricityRow = screen
      .getByText('Electricity — Alberta grid')
      .closest('tr');

    expect(electricityRow).not.toBeNull();
    expect(within(electricityRow!).getByText('Alberta, Canada')).toBeInTheDocument();
    expect(
      within(electricityRow!).getByText('Pilot demo factor library'),
    ).toBeInTheDocument();
    expect(
      within(electricityRow!).getByText(/Electricity factors vary by province/i),
    ).toBeInTheDocument();
  });

  it('does not claim an unverifiable official electricity source', () => {
    render(<Factors />);

    expect(
      screen.queryByText(/Alberta Grid Intensity Sept 2025/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Canada NIR 2024/i)).not.toBeInTheDocument();
  });
});
