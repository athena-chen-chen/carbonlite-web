import {
  getUserFriendlyErrorMessage,
  isUnsafeErrorMessage,
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
      expect(getUserFriendlyErrorMessage(message, 'unknown')).toBe(
        'Something went wrong. Please try again. If the issue continues, contact support.',
      );
    });
  });

  it('uses feedback-specific copy for misleading feedback authorization errors', () => {
    expect(
      getUserFriendlyErrorMessage(
        new Error('User not authorized to read feedback'),
        'feedbackSubmission',
      ),
    ).toBe('Your feedback could not be submitted. Please try again or contact support.');
  });

  it('preserves short known user-facing validation messages', () => {
    expect(getUserFriendlyErrorMessage('Quantity is required.', 'activityRecords')).toBe(
      'Quantity is required.',
    );
  });
});
