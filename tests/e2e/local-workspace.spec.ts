import { expect, test } from '@playwright/test';

test('local C workspace supports naming, file creation, execution, and local backup', async ({
  page,
}) => {
  await page.goto('/ide/c');

  const projectNameInput = page.getByTestId('project-name-input');
  await expect(projectNameInput).toBeVisible();

  await projectNameInput.fill('C Smoke Project');
  await projectNameInput.press('Enter');

  await expect(page.getByTestId('project-title')).toHaveText('C Smoke Project');
  await expect
    .poll(async () => (await page.locator('.monaco-editor').first().boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);

  await page.getByTestId('create-file-button').click();

  const fileRenameInput = page.getByTestId('file-rename-input');
  await expect(fileRenameInput).toBeVisible();
  await expect(fileRenameInput).toHaveValue('program.c');

  await fileRenameInput.fill('helpers.c');
  await fileRenameInput.press('Enter');

  await expect(page.getByTestId('file-entry-helpers.c')).toBeVisible();
  await expect(page.getByTestId('editor-tab-main.c')).toBeVisible();
  await expect(page.getByTestId('editor-tab-helpers.c')).toBeVisible();
  await expect(page.getByTestId('editor-tab-helpers.c')).toHaveAttribute('data-state', 'active');

  await page.getByTestId('file-entry-main.c').click();
  await expect(page.getByTestId('editor-tab-main.c')).toHaveAttribute('data-state', 'active');

  await page.getByTestId('editor-tab-helpers.c').click();
  await expect(page.getByTestId('editor-tab-helpers.c')).toHaveAttribute('data-state', 'active');
  await page.getByTestId('editor-tab-main.c').click();
  await expect(page.getByTestId('editor-tab-main.c')).toHaveAttribute('data-state', 'active');

  await page.getByTestId('preview-run-button').click();
  await expect(page.getByTestId('runtime-output')).toContainText('Hello from Yentic!');

  await expect
    .poll(() =>
      page.evaluate(() => {
        const workspaceId = window.location.pathname.replace(/^\//, '');
        return {
          files: window.localStorage.getItem(`yentic.workspace.v1:${workspaceId}`),
          meta: window.localStorage.getItem(`yentic.workspace.meta.v1:${workspaceId}`),
        };
      }),
    )
    .toMatchObject({
      files: expect.stringContaining('helpers.c'),
      meta: expect.stringContaining('C Smoke Project'),
    });

  const backButtonBox = await page.getByTestId('back-to-workspaces').boundingBox();
  if (!backButtonBox) {
    throw new Error('Back to workspaces button was not rendered');
  }
  await page.mouse.click(
    backButtonBox.x + backButtonBox.width / 2,
    backButtonBox.y + backButtonBox.height / 2,
  );
  await expect(page).toHaveURL(/\/ide$/);

  await page.close();
});
