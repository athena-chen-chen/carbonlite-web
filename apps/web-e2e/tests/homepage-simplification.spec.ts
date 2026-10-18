import { expect, test } from '@playwright/test';
import { authenticateTestUser } from '../support/smoke-test';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';

for (const width of [1440, 390]) {
  test(`public homepage stays readable and accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/*youtube.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body>Demo video test placeholder</body></html>' }));
    await page.goto('/');
    const header = page.getByRole('banner');
    await expect(header.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Request Pilot Access' })).toBeVisible();
    const hero = page.getByRole('region', { name: /Turn bills, invoices/ });
    await expect(hero.getByRole('button')).toHaveCount(1);
    await expect(hero.getByRole('link', { name: 'Watch Demo' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Five steps to a review-ready report' }).getByRole('listitem')).toHaveCount(5);
    const nav = page.getByRole('navigation', { name: 'Homepage' });
    await nav.getByRole('link', { name: 'For SMEs', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#for-smes$/);
    const audience = page.getByRole('heading', { name: 'Canadian SMEs', exact: true });
    await expect(audience).toBeInViewport();
    const top = await audience.evaluate((element) => element.getBoundingClientRect().top);
    const headerBottom = await header.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(top).toBeGreaterThanOrEqual(headerBottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.goto('/');
    await page.screenshot({ path: `/private/tmp/carbonlite-homepage-${width}.png`, fullPage: true });
    await header.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/');
    await hero.getByRole('button', { name: 'Request Pilot Access' }).click();
    await expect(page).toHaveURL(/\/pilot$/);
  });
}

test('returning users can open CarbonLite through the existing entry route', async ({ page }) => {
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, createCarbonLiteApiState());
  await page.goto('/');
  const header = page.getByRole('banner');
  await expect(header.getByRole('button', { name: 'Open CarbonLite' })).toBeVisible();
  await expect(header.getByRole('button', { name: /Sign In|Request Pilot Access|Dashboard/ })).toHaveCount(0);
  await page.getByRole('region', { name: /Turn bills, invoices/ }).getByRole('button', { name: 'Open CarbonLite' }).click();
  await expect(page).toHaveURL(/\/(upload|input-data)$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Input Data', exact: true })).toBeVisible();
});
