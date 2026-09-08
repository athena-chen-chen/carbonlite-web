import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppErrorBoundary, AppErrorFallback } from './AppErrorFallback';

function BrokenPage() {
  throw new Error('Internal stack detail');
}

describe('AppErrorFallback', () => {
  it('shows a production-safe message and refresh action without technical details', async () => {
    const refresh = vi.fn();

    render(
      <AppErrorFallback
        error={new Error('Internal stack detail')}
        componentStack="Sensitive component stack"
        onRefresh={refresh}
        showTechnicalDetails={false}
      />,
    );

    expect(screen.getByText(/hello@carbonliteapp.ca/i).closest('p')).toHaveTextContent(
      'Something went wrong while loading this page. Please refresh the page or contact hello@carbonliteapp.ca if the issue continues.',
    );
    expect(screen.getByRole('link', { name: 'hello@carbonliteapp.ca' })).toHaveAttribute(
      'href',
      'mailto:hello@carbonliteapp.ca',
    );
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    expect(screen.queryByText(/Internal stack detail/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Refresh page' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('can show technical details in local development only', () => {
    render(
      <AppErrorFallback
        error={new Error('Internal stack detail')}
        componentStack="Sensitive component stack"
        showTechnicalDetails
      />,
    );

    expect(screen.getByText('Technical details')).toBeInTheDocument();
    expect(screen.getByText(/Internal stack detail/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensitive component stack/i)).toBeInTheDocument();
  });
});

describe('AppErrorBoundary', () => {
  it('catches page crashes and renders the safe fallback', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <AppErrorBoundary showTechnicalDetails={false}>
        <BrokenPage />
      </AppErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeInTheDocument();
    expect(screen.queryByText(/Internal stack detail/i)).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
