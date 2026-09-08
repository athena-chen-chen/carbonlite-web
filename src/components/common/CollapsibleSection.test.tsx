import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('is collapsed by default and toggles content with accessible labels', async () => {
    render(
      <CollapsibleSection
        title="Inventory Boundary"
        summary="2026 reporting period · Scope 1, Scope 2, selected Scope 3"
      >
        <div>Full boundary details</div>
      </CollapsibleSection>,
    );

    expect(screen.getByText('Inventory Boundary')).toBeInTheDocument();
    expect(screen.getByText(/2026 reporting period/i)).toBeInTheDocument();
    expect(screen.queryByText('Full boundary details')).not.toBeInTheDocument();

    const expandButton = screen.getByRole('button', { name: 'Expand Inventory Boundary' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(expandButton);

    expect(screen.getByText('Full boundary details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse Inventory Boundary' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
