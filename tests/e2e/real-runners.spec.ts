import { expect, test, type Page } from '@playwright/test';

// First C/C++ run downloads the ~30MB toolchain; allow generous time.
const COMPILE_TIMEOUT = 240_000;

async function openWorkspace(page: Page, slug: string, projectName: string) {
  await page.goto(`/ide/${slug}`);
  const projectNameInput = page.getByTestId('project-name-input');
  await expect(projectNameInput).toBeVisible();
  await projectNameInput.fill(projectName);
  await projectNameInput.press('Enter');
  await expect
    .poll(async () => (await page.locator('.monaco-editor').first().boundingBox())?.width ?? 0)
    .toBeGreaterThan(200);
}

type MonacoWindow = {
  monaco?: { editor?: { getModels?: () => Array<{ setValue: (text: string) => void }> } };
};

async function replaceEditorContent(page: Page, code: string) {
  // Set the Monaco model directly — keyboard-driven editing fights
  // auto-closing brackets and focus stealing.
  await page.waitForFunction(
    () => ((window as unknown as MonacoWindow).monaco?.editor?.getModels?.()?.length ?? 0) > 0
  );
  await page.evaluate(text => {
    const models = (window as unknown as MonacoWindow).monaco!.editor!.getModels!();
    models[0].setValue(text);
  }, code);
  // Let the Monaco onChange propagate into React state before Run reads it.
  await page.waitForTimeout(800);
}

test('C runs with real integer semantics (7/2 === 3)', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await openWorkspace(page, 'c', 'Canary C');
  expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);

  await replaceEditorContent(
    page,
    '#include <stdio.h>\nint main(void){printf("canary:%d\\n", 7/2);return 0;}\n'
  );
  await page.getByTestId('preview-run-button').click();

  await expect(page.getByTestId('runtime-output')).toContainText('canary:3', {
    timeout: COMPILE_TIMEOUT,
  });
  await expect(page.getByTestId('runtime-output')).not.toContainText('canary:3.5');
});

test('C++ std::vector/std::string program runs (beyond old JSCPP subset)', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await openWorkspace(page, 'cpp', 'Canary Cpp');

  await replaceEditorContent(
    page,
    '#include <iostream>\n#include <vector>\n#include <string>\nint main(){std::vector<std::string> v{"real","clang"};for(const auto& s : v) std::cout << s << " ";std::cout << v.size() << std::endl;return 0;}\n'
  );
  await page.getByTestId('preview-run-button').click();

  await expect(page.getByTestId('runtime-output')).toContainText('real clang 2', {
    timeout: COMPILE_TIMEOUT,
  });
});

test('compile errors show clang diagnostics with line numbers', async ({ page }) => {
  test.setTimeout(COMPILE_TIMEOUT + 60_000);
  await openWorkspace(page, 'c', 'Canary Diagnostics');

  await replaceEditorContent(page, 'int main(void){int x = ;return 0;}\n');
  await page.getByTestId('preview-run-button').click();

  // clang diagnostic format: "main.c:1:24: error: ..."
  await expect(page.getByTestId('runtime-output')).toContainText(/main\.c:\d+:\d+: error/, {
    timeout: COMPILE_TIMEOUT,
  });
});

test('Python still runs on isolated route (COEP regression)', async ({ page }) => {
  test.setTimeout(180_000);
  await openWorkspace(page, 'python', 'Canary Python');

  await replaceEditorContent(page, 'print("pyodide-ok")\n');
  await page.getByTestId('preview-run-button').click();

  await expect(page.getByTestId('runtime-output')).toContainText('pyodide-ok', {
    timeout: 120_000,
  });
});
