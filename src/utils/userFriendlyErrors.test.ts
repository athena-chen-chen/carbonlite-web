import {
  getFriendlyErrorMessage,
  getUserFriendlyErrorMessage,
  isSensitiveErrorMessage,
  isUnsafeErrorMessage,
  sanitizeErrorMessage,
} from './userFriendlyErrors';

describe('user-friendly error messages', () => {
  it('maps raw server and database errors to safe messages', () => {
    expect(
      getUserFriendlyErrorMessage(
        new Error('PrismaClientKnownRequestError: Foreign key constraint failed'),
        'activityRecords',
      ),
    ).toBe('We could not update activity records. Please refresh the page and try again.');

    expect(
      getUserFriendlyErrorMessage('Internal server error at /api/reports', 'reportGeneration'),
    ).toBe('We could not generate the report. Please try again after confirming imported records are available.');
  });

  it('does not expose stack traces, tokens, or internal ids', () => {
    [
      'Error: failed\n    at saveRecord (/Users/app/file.ts:20:5)',
      'Bearer abc.def.ghi',
      'activityRecordId cmr75gvxj000fgdjbggis72awy failed',
      'document id 550e8400-e29b-41d4-a716-446655440000 failed',
    ].forEach((message) => {
      expect(isUnsafeErrorMessage(message)).toBe(true);
      expect(isSensitiveErrorMessage(message)).toBe(true);
      expect(sanitizeErrorMessage(message)).toBe('');
      expect(getUserFriendlyErrorMessage(message, 'unknown')).toBe(
        'Something went wrong. Please try again. If the issue continues, contact hello@carbonliteapp.ca.',
      );
    });
  });

  it('uses feedback-specific copy for misleading feedback authorization errors', () => {
    expect(
      getUserFriendlyErrorMessage(
        new Error('User not authorized to read feedback'),
        'feedbackSubmission',
      ),
    ).toBe('Your feedback could not be submitted right now. Please try again or contact hello@carbonliteapp.ca.');
  });

  it('preserves short known user-facing validation messages', () => {
    expect(getUserFriendlyErrorMessage('Quantity is required.', 'activityRecords')).toBe(
      'Quantity is required.',
    );
    expect(getFriendlyErrorMessage('Please enter a valid email address.', 'unknown')).toBe(
      'Please enter a valid email address.',
    );
    expect(sanitizeErrorMessage('Amount must be greater than 0.')).toBe(
      'Amount must be greater than 0.',
    );
  });

  it('supports context and string fallbacks through the shared helper alias', () => {
    expect(getFriendlyErrorMessage('P2025 Prisma failed', 'activityRecords')).toBe(
      'We could not update activity records. Please refresh the page and try again.',
    );
    expect(getFriendlyErrorMessage(null, 'Custom safe fallback.')).toBe('Custom safe fallback.');
  });

  it('uses standard invite, permission, and network messages', () => {
    expect(getUserFriendlyErrorMessage('invite link has already been used', 'inviteLink')).toBe(
      'This invite link has already been used. Please log in or contact hello@carbonliteapp.ca.',
    );
    expect(getUserFriendlyErrorMessage('403 pilot reviewer read-only', 'permissionDenied')).toBe(
      'This account is read-only for pilot review. Editing actions are disabled.',
    );
    expect(getUserFriendlyErrorMessage('Failed to fetch', 'network')).toBe(
      'CarbonLite could not connect to the server. Please check your connection and try again.',
    );
  });
});
