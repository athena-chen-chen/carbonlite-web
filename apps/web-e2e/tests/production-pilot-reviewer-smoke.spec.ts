import { expect, test, type Page, type Request } from '@playwright/test';

const productionBaseUrl =
  process.env.CARBONLITE_PRODUCTION_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  'https://www.carbonliteapp.ca';

const reviewerEmail = process.env.CARBONLITE_PROD_PILOT_REVIEWER_EMAIL;
const reviewerPassword = process.env.CARBONLITE_PROD_PILOT_REVIEWER_PASSWORD;

const allowedPostPaths = [
  '/api/auth/login',
];

const blockedTelemetryPaths = [
  '/api/activity-events',
  '/api/activity-tracking',
  '/api/user-activity',
];

function requestPath(request: Request) {
  return new URL(request.url()).pathname;
}

async function installReadOnlyProductionGuard(page: Page) {
  const unexpectedMutations: string[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const path = requestPath(request);

    if (blockedTelemetryPaths.some((prefix) => path.startsWith(prefix))) {
      await route.abort('blockedbyclient');
      return;
    }

    if (['GET', 'HEAD', 'OPTIONS'].includes(method) || allowedPostPaths.includes(path)) {
      await route.continue();
      return;
    }

    unexpectedMutations.push(`${method} ${path}`);
    await route.abort('blockedbyclient');
  });

  return {
    assertNoUnexpectedMutations() {
      expect(unexpectedMutations, 'Production smoke must remain read-only').toEqual([]);
    },
  };
}

test.describe('Production Pilot Reviewer smoke', () => {
  test.skip(
    !reviewerEmail || !reviewerPassword,
    'Set CARBONLITE_PROD_PILOT_REVIEWER_EMAIL and CARBONLITE_PROD_PILOT_REVIEWER_PASSWORD to run production smoke.',
  );

  test('verifies read-only pilot reviewer workflow without mutating data', async ({ page }) => {
    const guard = await installReadOnlyProductionGuard(page);

    await test.step('login page loads and public signup is hidden', async () => {
      await page.goto(`${productionBaseUrl}/login`);

      await expect(page.getByRole('heading', { name: 'Log in to CarbonLite' })).toBeVisible();
      await expect(page.getByText(/pilot access is currently invite-only/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /create an account/i })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /sign up/i })).toHaveCount(0);
      await expect(page.getByText(/Create Account/i)).toHaveCount(0);
    });

    await test.step('pilot reviewer logs in and sees pilot banner', async () => {
      await page.getByLabel(/email/i).fill(reviewerEmail ?? '');
      await page.getByLabel(/password/i).fill(reviewerPassword ?? '');
      await page.getByRole('button', { name: /log in/i }).click();

      await expect(page).toHaveURL(/\/metrics-summary$/);
      await expect(
        page.getByText(/Pilot review account · Sample data only · Not for formal reporting/i),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: /^Admin/i })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /^Admin$/i })).toHaveCount(0);
    });

    await test.step('Data Records page shows golden sample records', async () => {
      await page.getByRole('link', { name: 'Data Records', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'Data Records' })).toBeVisible();
      await expect(page.locator('[data-testid^="activity-row-"]')).toHaveCount(10);
      await expect(page.getByRole('row').filter({ hasText: 'Electricity' }).first()).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: 'Natural Gas' }).first()).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: 'Water' }).first()).toContainText(/Tracked Metric|Tracked Only/i);
    });

    await test.step('Calculation Review shows golden total', async () => {
      await page.getByRole('link', { name: 'Calculation Review', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'Calculation Review' })).toBeVisible();
      await expect(page.getByText(/37,285 kg CO2e|37,285 kgCO2e/).first()).toBeVisible();
    });

    await test.step('Reports page loads without generating or exporting', async () => {
      await page.getByRole('link', { name: 'Reports', exact: true }).click();

      await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
      await expect(page.getByText(/37,285 kgCO2e|37,285 kg CO2e/).first()).toBeVisible();
    });

    await test.step('Factors page loads read-only for pilot reviewer', async () => {
      await page.getByRole('link', { name: 'Factors', exact: true }).click();

      await expect(page.getByRole('heading', { name: /Conversion Factors|Conversion Factor Library/i })).toBeVisible();
      await expect(page.getByText(/Read-only access|Factor editing is disabled/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /\+ Add Custom Factor/i })).toHaveCount(0);
    });

    await expect(page.getByRole('button', { name: /^Admin/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Admin$/i })).toHaveCount(0);
    guard.assertNoUnexpectedMutations();
  });
});
