import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeCode } from '../src/lib/runners';

test('C runner requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => executeCode('c', '#include <stdio.h>\nint main(void){printf("x");return 0;}'),
    /only available in the browser/
  );
});

test('C++ runner requires a browser runtime in Node tests', async () => {
  await assert.rejects(
    () => executeCode('cpp', '#include <iostream>\nint main(){std::cout << 1;return 0;}'),
    /only available in the browser/
  );
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
