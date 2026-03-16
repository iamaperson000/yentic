import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeCode } from '../src/lib/runners';

test('C runner handles empty parameter main signature', async () => {
  const source = `#include <stdio.h>\nint main() {\n  printf("hello\\n");\n  return 0;\n}`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'hello\n');
});

test('C runner handles void parameter main signature', async () => {
  const source = `#include <stdio.h>\nint main(void) {\n  printf("world\\n");\n  return 0;\n}`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'world\n');
});

test('C runner normalizes void parameters in helper functions', async () => {
  const source = `int helper(void) { return 0; }\nint main(void) { return helper(); }`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '');
});

test('C runner accepts stdin for scanf usage', async () => {
  const source = `#include <stdio.h>\nint main(void) { int n; scanf("%d", &n); printf("%d\\n", n * 2); return 0; }`;
  const result = await executeCode('c', source, '7\n');
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '14\n');
});

test('C++ runner accepts stdin for cin usage', async () => {
  const source = `#include <iostream>\nusing namespace std;\nint main() { int n; cin >> n; cout << n * 2 << endl; return 0; }`;
  const result = await executeCode('cpp', source, '7\n');
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '14\n');
});

test('Java runner accepts stdin through Scanner', async () => {
  const source = `import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    System.out.println(n * 2);\n    scanner.close();\n  }\n}`;
  const result = await executeCode('java', source, '7\n');
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '14\n');
});

test('executeCode rejects unsupported languages', async () => {
  await assert.rejects(
    () => executeCode('rust' as never, 'fn main() {}'),
    /Unsupported language: rust/
  );
});

test('Python runner requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => executeCode('python', 'print("hello")'),
    /Python runtime is only available in the browser\./
  );
});

test('C runner reports non-zero exit codes in stdout', async () => {
  const source = `int main(void) { return 3; }`;
  const result = await executeCode('c', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, 'Program exited with code 3\n');
});

test('C++ runner writes cerr output to stderr', async () => {
  const source = `#include <iostream>\nint main() { std::cerr << "oops" << std::endl; return 0; }`;
  const result = await executeCode('cpp', source);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'oops\n');
});

test('Java runner supports printf-style formatting', async () => {
  const source = `public class Main {\n  public static void main(String[] args) {\n    System.out.printf("%d %s", 7, "ok");\n  }\n}`;
  const result = await executeCode('java', source);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '7 ok');
});

test('Java runner supports nextLine after token reads', async () => {
  const source = `import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    scanner.nextLine();\n    String text = scanner.nextLine();\n    System.out.println(n + ":" + text);\n  }\n}`;
  const result = await executeCode('java', source, '7\nhello there\n');
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, '7:hello there\n');
});

test('Java runner reports invalid numeric stdin clearly', async () => {
  const source = `import java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    int n = scanner.nextInt();\n    System.out.println(n);\n  }\n}`;
  const result = await executeCode('java', source, 'abc\n');
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Expected integer input but received "abc".');
});

test('Java runner reports missing main methods', async () => {
  const result = await executeCode('java', 'public class Main {}');
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'Could not find a main method to execute.');
});
