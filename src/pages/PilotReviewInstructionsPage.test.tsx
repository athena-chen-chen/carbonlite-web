import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { PilotReviewInstructionsRoute } from '../auth/PilotReviewInstructionsRoute';
import PilotReviewInstructionsPage from './PilotReviewInstructionsPage';

function renderProtectedInstructions(user: Record<string, unknown>) {
  localStorage.setItem('accessToken', 'valid-token');
  localStorage.setItem('currentUser', JSON.stringify(user));

  render(
    <MemoryRouter>
      <AuthProvider>
        <PilotReviewInstructionsRoute>
          <PilotReviewInstructionsPage />
        </PilotReviewInstructionsRoute>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('PilotReviewInstructionsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows read-only pilot review guidance for pilot reviewers', () => {
    renderProtectedInstructions({
      email: 'reviewer@example.com',
      role: 'VIEWER',
      accountType: 'PILOT_REVIEWER',
      organizationName: 'CarbonLite Sample Workspace',
    });

    expect(screen.getByRole('heading', { name: 'Pilot Review Instructions' })).toBeInTheDocument();
    expect(screen.getByText('This account uses sample data only.')).toBeInTheDocument();
    expect(screen.getByText('This account is read-only.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stage 1: Define Reporting Boundary' })).toHaveAttribute('href', '/organization-profile');
    expect(screen.getByRole('link', { name: 'Stage 2: Collect & Upload Source Data' })).toHaveAttribute('href', '/input-data');
    expect(screen.getByRole('link', { name: 'Stage 3: Review & Resolve Data Issues' })).toHaveAttribute('href', '/data-records');
    expect(screen.getByRole('link', { name: 'Stage 4: Validate Factors & Calculations' })).toHaveAttribute('href', '/metrics-summary');
    expect(screen.getByRole('link', { name: 'Stage 5: Review Results' })).toHaveAttribute('href', '/reports');
    expect(screen.getByRole('link', { name: 'Stage 6: Generate & Review Report' })).toHaveAttribute('href', '/reports');
    expect(screen.getByText('Is the workflow clear?')).toBeInTheDocument();
    expect(screen.getByText('Are factor assumptions clear?')).toBeInTheDocument();
    expect(screen.getByText('This is for workflow review only and is not a certified GHG report.')).toBeInTheDocument();
  });

  it('allows admins to view the instructions', () => {
    renderProtectedInstructions({
      email: 'admin@example.com',
      role: 'ADMIN',
      accountType: 'CUSTOMER',
      organizationName: 'CarbonLite',
    });

    expect(screen.getByRole('heading', { name: 'Pilot Review Instructions' })).toBeInTheDocument();
  });

  it('blocks normal users from viewing the instructions', () => {
    renderProtectedInstructions({
      email: 'member@example.com',
      role: 'MEMBER',
      accountType: 'CUSTOMER',
      organizationName: 'CarbonLite',
    });

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Pilot Review Instructions' })).not.toBeInTheDocument();
  });
});
