import { expect, test } from '@playwright/test';

test('workspace picker omits saved and shared project sections', async ({ page }) => {
  await page.goto('/ide');

  await expect(page.getByRole('heading', { name: 'Pick a workspace.' })).toBeVisible();
  await expect(page.getByText('Saved projects')).toHaveCount(0);
  await expect(page.getByText('Shared with Me')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'HTML / CSS / JS' })).toBeVisible();
});
