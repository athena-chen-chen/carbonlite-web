import { expect, test } from '@playwright/test';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';

test.use({ timezoneId: 'Asia/Tokyo' });

for (const sample of [
  { name: 'winter', now: '2026-01-15T20:30:45.123Z', midnight: '2026-01-15T07:00:00.000Z', localEnd: '2026-01-15T13:30:45.123' },
  { name: 'summer', now: '2026-07-15T20:30:45.123Z', midnight: '2026-07-15T06:00:00.000Z', localEnd: '2026-07-15T14:30:45.123' },
]) {
  test(`Event Log ${sample.name} ranges use Mountain Time in a Tokyo browser`, async ({ page }, testInfo) => {
    await page.clock.setFixedTime(new Date(sample.now));
    // Synthetic local auth, following the repository's browser-test pattern.
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'playwright-access-token');
      localStorage.setItem('currentUser', JSON.stringify({ id: 'user-1', email: 'admin@example.com', role: 'ADMIN', organizationId: 'organization-1' }));
    });
    await installCarbonLiteApiMock(page, createCarbonLiteApiState());
    const requests: Record<string, string>[] = [];
    let fail = false;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/audit-logs?*', async (route) => {
      const params = Object.fromEntries(new URL(route.request().url()).searchParams);
      requests.push(params);
      if (fail) {
        await route.fulfill({ status: 400, json: { message: 'Synthetic search failure' } });
        return;
      }
      const events = [
        ['before', new Date(new Date(sample.midnight).getTime() - 1).toISOString()],
        ['start', sample.midnight], ['end', sample.now],
        ['after', new Date(new Date(sample.now).getTime() + 1).toISOString()],
      ].filter(([, timestamp]) => timestamp >= params.dateFrom && timestamp <= params.dateTo)
        .map(([id, createdAt]) => ({ id, createdAt, action: 'LOGIN', entityType: 'Authentication', description: `Event ${id}` }));
      await route.fulfill({ json: { items: params.search === 'no-match' ? [] : events, page: 1, pageSize: 20, total: events.length, totalPages: 1 } });
    });
    await page.goto('/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit Log', exact: true })).toBeVisible();
    await expect(page.getByText('Event start', { exact: true })).toBeVisible();
    await expect(page.getByText('Event end', { exact: true })).toBeVisible();
    await expect(page.getByText('Event before', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Event after', { exact: true })).toHaveCount(0);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ dateFrom: sample.midnight, dateTo: sample.now });
    await expect(page.getByLabel('Date range')).toHaveValue('TODAY');
    await page.screenshot({ path: testInfo.outputPath('today.png'), fullPage: true });

    await page.getByLabel('Date range').selectOption('CUSTOM');
    await expect(page.getByLabel('Start date/time')).toHaveValue(sample.midnight.slice(0, 10) + 'T00:00');
    await expect(page.getByLabel('End date/time')).toHaveValue(sample.localEnd);
    expect(requests).toHaveLength(1);
    await page.getByLabel('End date/time').fill(sample.midnight.slice(0, 10) + 'T00:00');
    await expect(page.getByRole('alert')).toHaveText('End date/time must be later than start date/time.');
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeDisabled();
    expect(requests).toHaveLength(1);
    await page.screenshot({ path: testInfo.outputPath('custom-validation.png'), fullPage: true });
    await page.getByLabel('End date/time').fill(sample.localEnd);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeEnabled();
    expect(requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ dateFrom: sample.midnight, dateTo: sample.now });

    await page.getByLabel('Date range').selectOption('LAST_HOUR');
    await expect(page.getByLabel('Start date/time')).toHaveCount(0);
    await page.getByLabel('Search', { exact: true }).fill('no-match');
    expect(requests).toHaveLength(2);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('No Events Found', { exact: true })).toBeVisible();
    expect(requests).toHaveLength(3);
    expect(requests[2]).toMatchObject({ dateFrom: new Date(new Date(sample.now).getTime() - 3_600_000).toISOString(), dateTo: sample.now });

    fail = true;
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('Unable to load audit logs. Please try again.')).toBeVisible();
    await expect(page.getByText('No Events Found', { exact: true })).toHaveCount(0);
    fail = false;
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect(page.getByText('Event start', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Date range')).toHaveValue('TODAY');
    await expect(page.getByLabel('Search', { exact: true })).toHaveValue('');
    expect(requests).toHaveLength(5);
    expect(requests[4]).toMatchObject({ dateFrom: sample.midnight, dateTo: sample.now });
    expect(errors).toEqual([]);
  });
}
