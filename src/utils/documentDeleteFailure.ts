const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const DOCUMENT_DELETE_RECONCILIATION_REQUIRED = 'DOCUMENT_DELETE_RECONCILIATION_REQUIRED';

export function reconciliationReference(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  return record.code === DOCUMENT_DELETE_RECONCILIATION_REQUIRED &&
    typeof record.requestId === 'string' && UUID.test(record.requestId) ? record.requestId : null;
}

export function documentDeleteFailureMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const failure = error as { status?: unknown; code?: unknown; data?: unknown };
    const reference = reconciliationReference(failure.data);
    if (failure.status === 503 && failure.code === DOCUMENT_DELETE_RECONCILIATION_REQUIRED && reference) {
      return `This source document needs storage reconciliation. Deletion was not completed. Contact support with reference ${reference}.`;
    }
  }
  return 'Unable to delete source document. Please try again.';
}
