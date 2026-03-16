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

  await page.getByTestId('create-file-button').click();

  const fileRenameInput = page.getByTestId('file-rename-input');
  await expect(fileRenameInput).toBeVisible();
  await expect(fileRenameInput).toHaveValue('program.c');

  await fileRenameInput.fill('helpers.c');
  await fileRenameInput.press('Enter');

  await expect(page.getByTestId('file-entry-helpers.c')).toBeVisible();
  await page.getByTestId('file-entry-main.c').click();

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

  await page.close();
});
