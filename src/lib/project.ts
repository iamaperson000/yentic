export type SupportedLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'python'
  | 'c'
  | 'cpp'
  | 'java';

export type ProjectFile = {
  path: string;
  language: SupportedLanguage;
  code: string;
};

export type ProjectFileMap = Record<string, ProjectFile>;

export type WorkspaceSlug = 'web' | 'python' | 'c' | 'cpp' | 'java';

export type WorkspaceConfig = {
  slug: WorkspaceSlug;
  title: string;
  description: string;
  accent: 'emerald' | 'sky' | 'violet' | 'amber';
  defaultActivePath: string;
  newFilePlaceholder: string;
  previewTemplate?: 'vanilla';
  previewMode?: 'sandpack' | 'code' | 'runtime';
  previewMessage?: string;
  starter: ProjectFileMap;
};

const KEY_PREFIX = 'yentic.project.v1';

export function inferLanguage(path: string): SupportedLanguage {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.html') || normalized.endsWith('.htm')) return 'html';
  if (normalized.endsWith('.css')) return 'css';
  if (
    normalized.endsWith('.js') ||
    normalized.endsWith('.mjs') ||
    normalized.endsWith('.cjs') ||
    normalized.endsWith('.jsx')
  ) {
    return 'javascript';
  }
  if (normalized.endsWith('.py')) return 'python';
  if (normalized.endsWith('.c')) return 'c';
  if (normalized.endsWith('.cpp') || normalized.endsWith('.cc') || normalized.endsWith('.cxx')) return 'cpp';
  if (normalized.endsWith('.hpp') || normalized.endsWith('.hh') || normalized.endsWith('.hxx')) return 'cpp';
  if (normalized.endsWith('.java')) return 'java';
  return 'javascript';
}

export function scaffoldFor(path: string, language: SupportedLanguage): string {
  if (language === 'html') {
    return `<!-- ${path} -->\n`;
  }
  if (language === 'css') {
    return `/* ${path} */\n`;
  }
  if (language === 'python') {
    return `# ${path}\n`;
  }
  if (language === 'c') {
    return `/* ${path} */\n`;
  }
  if (language === 'cpp') {
    return `// ${path}\n`;
  }
  if (language === 'java') {
    return `// ${path}\n`;
  }
  return `// ${path}\n`;
}

export function ensureUniquePath(path: string, map: ProjectFileMap): string {
  if (!map[path]) return path;
  const dotIndex = path.lastIndexOf('.');
  const base = dotIndex === -1 ? path : path.slice(0, dotIndex);
  const ext = dotIndex === -1 ? '' : path.slice(dotIndex);
  let counter = 1;
  let candidate = `${base}-${counter}${ext}`;
  while (map[candidate]) {
    counter += 1;
    candidate = `${base}-${counter}${ext}`;
  }
  return candidate;
}

const webStarter: ProjectFileMap = {
  'index.html': {
    path: 'index.html',
    language: 'html',
    code: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Yentic Starter</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./index.js"></script>
  </body>
</html>`
  },
  'styles.css': {
    path: 'styles.css',
    language: 'css',
    code: `body{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;background:#0b0d10;color:#fff}
#app{margin:3rem auto;max-width:720px;padding:2rem;background:#11161d;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
button{background:#1a8b5e;color:#fff;border:0;padding:.6rem 1rem;border-radius:10px}`
  },
  'index.js': {
    path: 'index.js',
    language: 'javascript',
    code: "import './styles.css';\n\nfunction mount() {\n  const app = document.getElementById('app');\n  if (!app) return;\n  app.innerHTML =\n    '<h1>Yentic</h1><p>A classic-feeling web IDE without the bloat.</p><button id=\"btn\">Click me</button><pre id=\"out\"></pre>';\n  const button = document.getElementById('btn');\n  const output = document.getElementById('out');\n  if (button && output) {\n    button.addEventListener('click', () => {\n      const now = new Date().toLocaleTimeString();\n      output.textContent += '\\nClicked at ' + now;\n    });\n  }\n}\n\nif (document.readyState === 'loading') {\n  document.addEventListener('DOMContentLoaded', mount);\n} else {\n  mount();\n}\n"
  }
};

const pythonStarter: ProjectFileMap = {
  'main.py': {
    path: 'main.py',
    language: 'python',
    code: '# main.py\n"""Start building with Python in Yentic."""\n\nif __name__ == "__main__":\n    print("Hello from Yentic 👋")\n'
  }
};

const cStarter: ProjectFileMap = {
  'main.c': {
    path: 'main.c',
    language: 'c',
    code: '/* main.c */\n#include <stdio.h>\n\nint main(void) {\n    printf("Hello from Yentic!\\n");\n    return 0;\n}\n'
  }
};

const cppStarter: ProjectFileMap = {
  'main.cpp': {
    path: 'main.cpp',
    language: 'cpp',
    code: `// main.cpp\n#include <iostream>\n\nint main() {\n    std::cout << "Hello from Yentic!" << std::endl;\n    return 0;\n}\n`
  }
};

const javaStarter: ProjectFileMap = {
  'Main.java': {
    path: 'Main.java',
    language: 'java',
    code: '// Main.java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Yentic!");\n    }\n}\n'
  }
};

export const workspaceConfigs: Record<WorkspaceSlug, WorkspaceConfig> = {
  web: {
    slug: 'web',
    title: 'HTML / CSS / JS',
    description: 'Build full web experiences with live Sandpack preview and instant reloads.',
    accent: 'emerald',
    defaultActivePath: 'index.html',
    newFilePlaceholder: 'untitled.js',
    previewTemplate: 'vanilla',
    previewMode: 'sandpack',
    starter: webStarter
  },
  python: {
    slug: 'python',
    title: 'Python',
    description: 'Hack on scripts and backend ideas with a clean, focused editor.',
    accent: 'sky',
    defaultActivePath: 'main.py',
    newFilePlaceholder: 'script.py',
    previewMode: 'runtime',
    starter: pythonStarter
  },
  c: {
    slug: 'c',
    title: 'C',
    description: 'Prototype low-level ideas with a straightforward toolchain setup.',
    accent: 'violet',
    defaultActivePath: 'main.c',
    newFilePlaceholder: 'program.c',
    previewMode: 'runtime',
    starter: cStarter
  },
  cpp: {
    slug: 'cpp',
    title: 'C++',
    description: 'Experiment with modern C++ snippets and see output instantly.',
    accent: 'violet',
    defaultActivePath: 'main.cpp',
    newFilePlaceholder: 'program.cpp',
    previewMode: 'runtime',
    starter: cppStarter
  },
  java: {
    slug: 'java',
    title: 'Java',
    description: 'Iterate on JVM projects with familiar class structure defaults.',
    accent: 'amber',
    defaultActivePath: 'Main.java',
    newFilePlaceholder: 'App.java',
    previewMode: 'runtime',
    starter: javaStarter
  }
};

export const workspaceList = Object.values(workspaceConfigs);

function cloneProject(map: ProjectFileMap): ProjectFileMap {
  return Object.fromEntries(Object.entries(map).map(([key, file]) => [key, { ...file }]));
}

export function getStarterProject(slug: WorkspaceSlug): ProjectFileMap {
  const config = workspaceConfigs[slug] ?? workspaceConfigs.web;
  return cloneProject(config.starter);
}

export function loadProject(slug: WorkspaceSlug): ProjectFileMap | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}:${slug}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as ProjectFileMap;
    const migrated = migrateProject(slug, parsed);
    if (migrated !== parsed) {
      saveProject(slug, migrated);
    }
    return migrated;
  } catch {
    return null;
  }
}

export function saveProject(slug: WorkspaceSlug, files: ProjectFileMap) {
  try {
    localStorage.setItem(`${KEY_PREFIX}:${slug}`, JSON.stringify(files));
  } catch {}
}

function ensureCssImport(code: string): { code: string; changed: boolean } {
  if (code.includes("import './styles.css';")) {
    return { code, changed: false };
  }

  return { code: "import './styles.css';\n" + code, changed: true };
}

function ensureStylesheetLink(html: string): { code: string; changed: boolean } {
  if (html.includes('href="./styles.css"') || html.includes("href='./styles.css'")) {
    return { code: html, changed: false };
  }

  if (!html.includes('</head>')) {
    return { code: html, changed: false };
  }

  const linkTag = '    <link rel="stylesheet" href="./styles.css" />\n';
  return { code: html.replace('</head>', `${linkTag}  </head>`), changed: true };
}

function ensureModuleScript(html: string): { code: string; changed: boolean } {
  if (html.includes('<script type="module" src="./index.js"></script>')) {
    return { code: html, changed: false };
  }

  if (html.includes('<script src="./index.js"></script>')) {
    return {
      code: html.replace('<script src="./index.js"></script>', '<script type="module" src="./index.js"></script>'),
      changed: true
    };
  }

  if (!html.includes('</body>')) {
    return { code: html, changed: false };
  }

  const scriptTag = '    <script type="module" src="./index.js"></script>\n';
  return { code: html.replace('</body>', `${scriptTag}  </body>`), changed: true };
}

function migrateProject(slug: WorkspaceSlug, files: ProjectFileMap): ProjectFileMap {
  if (slug !== 'web') {
    return files;
  }

  const next = cloneProject(files);
  let changed = false;

  const script = files['index.js'];
  if (script) {
    const isBroken = script.code.includes("document.getElementById('out').textContent += '\\n");
    if (isBroken) {
      next['index.js'] = { ...next['index.js'], code: webStarter['index.js'].code };
      changed = true;
    } else {
      const ensured = ensureCssImport(script.code);
      if (ensured.changed) {
        next['index.js'] = { ...next['index.js'], code: ensured.code };
        changed = true;
      }
    }
  }

  if (!next['styles.css']) {
    next['styles.css'] = { ...webStarter['styles.css'] };
    changed = true;
  }

  const html = files['index.html'];
  if (html) {
    let updated = html.code;
    const withLink = ensureStylesheetLink(updated);
    if (withLink.changed) {
      updated = withLink.code;
      changed = true;
    }
    const withModuleScript = ensureModuleScript(updated);
    if (withModuleScript.changed) {
      updated = withModuleScript.code;
      changed = true;
    }
    if (changed) {
      next['index.html'] = { ...next['index.html'], code: updated };
    }
  }

  return changed ? next : files;
}

