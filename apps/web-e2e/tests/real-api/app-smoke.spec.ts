import { expect, test } from '@playwright/test';

const e2eEmail = process.env.CARBONLITE_E2E_EMAIL ?? 'e2e@carbonlite.test';
const e2ePassword = process.env.CARBONLITE_E2E_PASSWORD ?? 'CarbonLiteE2E!123';

test('@db @smoke authenticates seeded user and loads primary app routes', async ({ page, request }) => {
  const apiBaseURL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3333/api';
  const health = await request.get(`${apiBaseURL}/health`);
  await expect(health).toBeOK();
  await expect(await health.json()).toMatchObject({
    status: 'ok',
    database: 'ok',
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Log in to CarbonLite' })).toBeVisible();

  await page.getByLabel(/email/i).fill(e2eEmail);
  await page.getByLabel(/password/i).fill(e2ePassword);
  await page.getByRole('button', { name: 'Log In' }).click();

  await expect(page).toHaveURL(/\/upload$/);
  await expect(page.getByRole('heading', { name: /upload & extract carbon data/i })).toBeVisible();

  await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();
  await expect(page).toHaveURL(/\/metrics-summary$/);

  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page).toHaveURL(/\/reports$/);

  await page.getByRole('link', { name: 'Data Records', exact: true }).click();
  await expect(page).toHaveURL(/\/activity-records$/);
  await expect(page.getByRole('heading', { name: 'Activity Records' })).toBeVisible();
});
