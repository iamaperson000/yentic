import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

import {
  clearProject,
  clearWorkspace,
  ensureUniquePath,
  getStarterProject,
  inferLanguage,
  loadProject,
  loadWorkspaceFiles,
  readWorkspaceMeta,
  resolveWorkspaceSlugFromLanguage,
  saveProject,
  saveWorkspaceFiles,
  scaffoldFor,
  writeWorkspaceMeta,
  type LocalWorkspaceMeta,
  type ProjectFileMap,
} from '../src/lib/project';

class MockLocalStorage {
  private readonly store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const PROJECT_KEY_PREFIX = 'yentic.project.v1';
const WORKSPACE_KEY_PREFIX = 'yentic.workspace.v1';
const WORKSPACE_META_PREFIX = 'yentic.workspace.meta.v1';
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storage = new MockLocalStorage();

function projectKey(slug: string) {
  return `${PROJECT_KEY_PREFIX}:${slug}`;
}

function workspaceKey(workspaceId: string) {
  return `${WORKSPACE_KEY_PREFIX}:${workspaceId}`;
}

function workspaceMetaKey(workspaceId: string) {
  return `${WORKSPACE_META_PREFIX}:${workspaceId}`;
}

function installLocalStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

beforeEach(() => {
  installLocalStorage();
  storage.clear();
});

after(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
    return;
  }

  delete (globalThis as { localStorage?: unknown }).localStorage;
});

test('resolveWorkspaceSlugFromLanguage normalizes aliases and casing', () => {
  assert.equal(resolveWorkspaceSlugFromLanguage('HTML'), 'web');
  assert.equal(resolveWorkspaceSlugFromLanguage('c++'), 'cpp');
  assert.equal(resolveWorkspaceSlugFromLanguage('JAVA'), 'java');
  assert.equal(resolveWorkspaceSlugFromLanguage('unknown', 'python'), 'python');
});

test('inferLanguage recognizes supported file extensions', () => {
  assert.equal(inferLanguage('INDEX.HTML'), 'html');
  assert.equal(inferLanguage('styles.css'), 'css');
  assert.equal(inferLanguage('app.jsx'), 'javascript');
  assert.equal(inferLanguage('main.py'), 'python');
  assert.equal(inferLanguage('program.c'), 'c');
  assert.equal(inferLanguage('engine.hxx'), 'cpp');
  assert.equal(inferLanguage('Main.java'), 'java');
  assert.equal(inferLanguage('README'), 'javascript');
});

test('scaffoldFor uses language-appropriate comment styles', () => {
  assert.equal(scaffoldFor('index.html', 'html'), '<!-- index.html -->\n');
  assert.equal(scaffoldFor('styles.css', 'css'), '/* styles.css */\n');
  assert.equal(scaffoldFor('main.py', 'python'), '# main.py\n');
  assert.equal(scaffoldFor('main.c', 'c'), '/* main.c */\n');
  assert.equal(scaffoldFor('main.cpp', 'cpp'), '// main.cpp\n');
  assert.equal(scaffoldFor('Main.java', 'java'), '// Main.java\n');
});

test('ensureUniquePath appends an incrementing suffix before the extension', () => {
  const files: ProjectFileMap = {
    'main.js': { path: 'main.js', language: 'javascript', code: '' },
    'main-1.js': { path: 'main-1.js', language: 'javascript', code: '' },
    'notes': { path: 'notes', language: 'javascript', code: '' },
  };

  assert.equal(ensureUniquePath('fresh.js', files), 'fresh.js');
  assert.equal(ensureUniquePath('main.js', files), 'main-2.js');
  assert.equal(ensureUniquePath('notes', files), 'notes-1');
});

test('getStarterProject returns a deep clone of the starter files', () => {
  const first = getStarterProject('web');
  first['index.html'].code = 'mutated';
  first['styles.css'].code = 'body {}';

  const second = getStarterProject('web');
  assert.notEqual(second['index.html'].code, 'mutated');
  assert.notEqual(second['styles.css'].code, 'body {}');
});

test('saveProject and loadProject round-trip persisted files', () => {
  const project = getStarterProject('java');
  project['Main.java'].code = 'public class Main { public static void main(String[] args) {} }';

  saveProject('java', project);

  assert.deepEqual(loadProject('java'), project);

  clearProject('java');
  assert.equal(loadProject('java'), null);
});

test('loadProject migrates legacy web projects to include styles and module scripts', () => {
  const legacyWebProject: ProjectFileMap = {
    'index.html': {
      path: 'index.html',
      language: 'html',
      code: '<!doctype html>\n<html>\n  <head>\n    <title>Legacy</title>\n  </head>\n  <body>\n    <div id="app"></div>\n    <script src="./index.js"></script>\n  </body>\n</html>',
    },
    'index.js': {
      path: 'index.js',
      language: 'javascript',
      code: "console.log('hello');\n",
    },
  };

  saveProject('web', legacyWebProject);

  const migrated = loadProject('web');

  assert.ok(migrated);
  assert.match(migrated['index.js'].code, /^import '\.\/styles\.css';/);
  assert.ok(migrated['styles.css']);
  assert.match(migrated['index.html'].code, /href="\.\/styles\.css"/);
  assert.match(migrated['index.html'].code, /<script type="module" src="\.\/index\.js"><\/script>/);
});

test('loadProject restores the default web starter when a broken legacy script is detected', () => {
  const starter = getStarterProject('web');
  const brokenProject: ProjectFileMap = {
    'index.html': starter['index.html'],
    'index.js': {
      path: 'index.js',
      language: 'javascript',
      code: "document.getElementById('out').textContent += '\\n",
    },
  };

  saveProject('web', brokenProject);

  const loaded = loadProject('web');
  assert.ok(loaded);
  assert.equal(loaded['index.js'].code, starter['index.js'].code);
  assert.equal(loaded['styles.css'].code, starter['styles.css'].code);
});

test('workspace metadata round-trips and normalizes the stored slug and name', () => {
  const meta: LocalWorkspaceMeta = { slug: 'web', name: '  Demo Workspace  ' };
  writeWorkspaceMeta('abc123', meta);

  const rawMeta = storage.getItem(workspaceMetaKey('abc123'));
  assert.equal(rawMeta, JSON.stringify(meta));

  storage.setItem(
    workspaceMetaKey('abc123'),
    JSON.stringify({ slug: 'C++', name: '  Shared C++  ' }),
  );

  assert.deepEqual(readWorkspaceMeta('abc123'), { slug: 'cpp', name: 'Shared C++' });
});

test('readWorkspaceMeta returns null for invalid or incomplete metadata', () => {
  storage.setItem(workspaceMetaKey('broken-json'), '{');
  storage.setItem(workspaceMetaKey('missing-slug'), JSON.stringify({ name: 'No slug' }));

  assert.equal(readWorkspaceMeta('broken-json'), null);
  assert.equal(readWorkspaceMeta('missing-slug'), null);
});

test('loadWorkspaceFiles prefers workspace storage and can fall back to legacy project storage', () => {
  const workspaceFiles = getStarterProject('python');
  workspaceFiles['main.py'].code = 'print("workspace")\n';
  saveWorkspaceFiles('workspace-1', workspaceFiles);

  const legacyFiles = getStarterProject('c');
  legacyFiles['main.c'].code = 'int main(void) { return 0; }\n';
  saveProject('c', legacyFiles);

  assert.deepEqual(loadWorkspaceFiles('workspace-1', 'c'), workspaceFiles);

  const migratedFromLegacy = loadWorkspaceFiles('workspace-2', 'c');
  assert.deepEqual(migratedFromLegacy, legacyFiles);
  assert.equal(storage.getItem(workspaceKey('workspace-2')), JSON.stringify(legacyFiles));
});

test('clearWorkspace removes both files and metadata', () => {
  saveWorkspaceFiles('workspace-3', getStarterProject('web'));
  writeWorkspaceMeta('workspace-3', { slug: 'web', name: 'Workspace 3' });

  clearWorkspace('workspace-3');

  assert.equal(loadWorkspaceFiles('workspace-3'), null);
  assert.equal(readWorkspaceMeta('workspace-3'), null);
  assert.equal(storage.getItem(workspaceKey('workspace-3')), null);
  assert.equal(storage.getItem(workspaceMetaKey('workspace-3')), null);
});

test('loadWorkspaceFiles returns null when persisted workspace JSON is invalid', () => {
  storage.setItem(workspaceKey('workspace-4'), '{');

  assert.equal(loadWorkspaceFiles('workspace-4', 'web'), null);
});

test('loadProject returns null when stored project JSON is invalid', () => {
  storage.setItem(projectKey('python'), '{');

  assert.equal(loadProject('python'), null);
});
