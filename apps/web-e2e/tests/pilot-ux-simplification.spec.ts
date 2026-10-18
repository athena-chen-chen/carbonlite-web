import { expect, test } from '@playwright/test';
import { createCarbonLiteApiState, installCarbonLiteApiMock } from '../support/mock-api';
import { authenticateTestUser } from '../support/smoke-test';
import { USER_WORKFLOW } from '../../../src/constants/userWorkflow';

test.beforeEach(async ({ page }) => {
  await authenticateTestUser(page);
  await installCarbonLiteApiMock(page, createCarbonLiteApiState());
});

test('five primary pages share concise headers and preserve heading hierarchy', async ({ page }) => {
  for (const [index, step] of USER_WORKFLOW.entries()) {
    await page.goto(step.route);
    await expect(page.getByRole('heading', { level: 1, name: step.title, exact: true })).toBeVisible();
    await expect(page.getByText(step.subtitle, { exact: true })).toBeVisible();
    await expect(page.locator('[aria-current="step"]')).toHaveText(`Step ${index + 1} of 5 · ${step.action}`);
    await expect(page.getByLabel('CarbonLite workflow: 6 canonical stages')).toHaveCount(0);
  }
  const limitations = page.locator('details').filter({ has: page.getByText('View limitations', { exact: true }) });
  await expect(page.getByText('Results are estimates and require professional review before formal use.', { exact: true })).toBeVisible();
  await expect(page.getByText('CarbonLite does not provide regulatory assurance or third-party verification.', { exact: true })).toBeVisible();
  await expect(limitations).not.toHaveAttribute('open');
  await limitations.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(limitations).toHaveAttribute('open', '');
  for (const text of ['not a certified GHG emissions report', 'regulatory compliance advice', 'third-party verification', 'audit assurance', 'carbon credit eligibility determination']) {
    await expect(limitations).toContainText(text);
  }
});

test('guide and factors remain supporting tools without sequential stage labels', async ({ page }) => {
  await page.goto('/data-collection-guide');
  await expect(page.getByRole('heading', { level: 1, name: 'Data Collection Guide' })).toBeVisible();
  await expect(page.getByText('See what documents and activity data are useful before uploading.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download SME Data Template' })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(page.getByLabel('CarbonLite canonical workflow')).toHaveCount(0);
  await page.goto('/conversion-factors');
  await expect(page.getByRole('heading', { level: 1, name: 'Emission Factors', exact: true })).toBeVisible();
  await expect(page.getByText('Advanced reviewer tool', { exact: true })).toBeVisible();
  await expect(page.getByText('Review factor sources, applicability, and provenance.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Stage 4 of 6/)).toHaveCount(0);
  await expect(page.locator('[aria-current="step"]')).toHaveCount(0);
});

test('primary navigation stays ordered and supporting tools remain keyboard accessible on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/input-data');
  const nav = page.getByRole('navigation');
  const links = await nav.getByRole('link').allTextContents();
  expect(links.filter((label) => USER_WORKFLOW.some((step) => step.title === label))).toEqual(USER_WORKFLOW.map((step) => step.title));
  const tools = page.getByRole('button', { name: /^Settings/ });
  await tools.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem', { name: 'Data Collection Guide' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Emission Factors' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tools).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
