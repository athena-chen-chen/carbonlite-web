const INPUT_REVIEW_STORAGE_PATTERNS = [
  /input[-_:\s]?review/i,
  /upload[-_:\s]?review/i,
  /parsed[-_:\s]?activit/i,
  /import[-_:\s]?review/i,
  /draft[-_:\s]?upload/i,
  /staged[-_:\s]?row/i,
  /carbonlite.*document/i,
  /carbonlite.*upload/i,
  /carbonlite.*import/i,
];

const PRESERVED_STORAGE_PATTERNS = [
  /token/i,
  /currentUser/i,
  /auth/i,
  /settings/i,
  /theme/i,
  /analytics/i,
];

function clearMatchingStorage(storage: Storage) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) continue;

    const shouldPreserve = PRESERVED_STORAGE_PATTERNS.some((pattern) =>
      pattern.test(key),
    );
    const shouldClear = INPUT_REVIEW_STORAGE_PATTERNS.some((pattern) =>
      pattern.test(key),
    );

    if (shouldClear && !shouldPreserve) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));

  return keysToRemove.length;
}

export function clearInputReviewBrowserState() {
  if (typeof window === 'undefined') {
    return { localStorageKeysRemoved: 0, sessionStorageKeysRemoved: 0 };
  }

  return {
    localStorageKeysRemoved: clearMatchingStorage(window.localStorage),
    sessionStorageKeysRemoved: clearMatchingStorage(window.sessionStorage),
  };
}

export function notifyDemoDataReset() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event('carbonlite:demo-data-reset'));
  window.dispatchEvent(new Event('carbonlite:metrics-stale'));
  window.dispatchEvent(new Event('carbonlite:reports-stale'));
}
