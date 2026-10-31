import { render, screen } from '@testing-library/react';
import type { AuthUser } from '../services/auth';
import { getCurrentUser } from '../services/auth';
import { FactorsExperiencePage } from './FactorsExperiencePage';

vi.mock('../services/auth', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('./ConversionFactorsPage', () => ({
  ConversionFactorsPage: () => <div>Complete Factor Library</div>,
}));

vi.mock('./CustomerMethodologyFactorsPage', () => ({
  CustomerMethodologyFactorsPage: () => <div>Customer methodology view</div>,
}));

describe('FactorsExperiencePage', () => {
  it.each([
    ['ordinary customer member', { email: 'member@example.com', role: 'MEMBER', platformRole: 'USER' }],
    ['organization admin', { email: 'admin@example.com', role: 'ADMIN', membershipRole: 'ADMIN', platformRole: 'USER' }],
    ['unknown platform authority', { email: 'unknown@example.com', role: 'ADMIN' }],
  ] satisfies Array<[string, AuthUser]>)('uses the customer-safe view for %s', (_label, user) => {
    vi.mocked(getCurrentUser).mockReturnValue(user);

    render(<FactorsExperiencePage />);

    expect(screen.getByText('Customer methodology view')).toBeInTheDocument();
    expect(screen.queryByText('Complete Factor Library')).not.toBeInTheDocument();
  });

  it('retains the complete Factor Library for a platform admin', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      email: 'platform@example.com',
      role: 'ADMIN',
      membershipRole: 'ADMIN',
      platformRole: 'ADMIN',
    });

    render(<FactorsExperiencePage />);

    expect(screen.getByText('Complete Factor Library')).toBeInTheDocument();
    expect(screen.queryByText('Customer methodology view')).not.toBeInTheDocument();
  });
});
