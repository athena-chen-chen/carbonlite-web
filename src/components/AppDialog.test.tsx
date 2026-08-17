import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppDialogProvider, useAppDialog } from './AppDialog';

function ErrorButton() {
  const { showError } = useAppDialog();

  return (
    <button
      type="button"
      onClick={() =>
        showError({
          title: 'Unable to save record',
          message: 'Internal server error',
          technicalDetails: 'PrismaClientKnownRequestError: stack trace at /api/activity-data',
        })
      }
    >
      Show error
    </button>
  );
}

describe('AppDialog error handling', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('hides technical details and sanitizes raw errors in pilot mode', async () => {
    vi.stubEnv('VITE_APP_ENV', 'pilot');

    render(
      <AppDialogProvider>
        <ErrorButton />
      </AppDialogProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show error' }));

    expect(
      screen.getByText('Something went wrong. Please try again. If the issue continues, contact support.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    expect(screen.queryByText(/PrismaClientKnownRequestError/i)).not.toBeInTheDocument();
  });
});
