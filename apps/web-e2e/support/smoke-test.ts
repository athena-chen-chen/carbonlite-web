import { expect, type Page } from '@playwright/test';

export function authenticateTestUser(page: Page) {
  return page.addInitScript(() => {
    localStorage.setItem('accessToken', 'playwright-access-token');
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        id: 'user-1',
        email: 'pilot@carbonliteapp.ca',
        role: 'USER',
        organizationId: 'organization-1',
        organizationName: 'CarbonLite E2E Workspace',
      }),
    );
  });
}

export function monitorCriticalFailures(page: Page) {
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 500) {
      serverErrors.push(
        `${response.status()} ${response.request().method()} ${response.url()}`,
      );
    }
  });

  return {
    assertClean(unexpectedRequests: string[]) {
      expect(
        unexpectedRequests,
        'all API requests should be explicitly handled by the smoke backend',
      ).toEqual([]);
      expect(
        serverErrors,
        'critical workflows should not receive HTTP 500 responses',
      ).toEqual([]);
      expect(
        consoleErrors,
        'critical workflows should not emit browser console errors',
      ).toEqual([]);
    },
  };
}
