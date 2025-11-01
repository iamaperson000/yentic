export type SupportedLanguage =
  | 'html'
  | 'css'
  | 'javascript'
  | 'python'
  | 'c'
  | 'java';

export type ProjectFile = {
  path: string;
  language: SupportedLanguage;
  code: string;
};

export type ProjectFileMap = Record<string, ProjectFile>;

export type WorkspaceSlug = 'web' | 'python' | 'c' | 'java';

export type WorkspaceConfig = {
  slug: WorkspaceSlug;
  title: string;
  description: string;
  accent: 'emerald' | 'sky' | 'violet' | 'amber';
  defaultActivePath: string;
  newFilePlaceholder: string;
  previewTemplate?: 'vanilla';
  previewMode?: 'sandpack' | 'code';
  previewMessage?: string;
  starter: ProjectFileMap;
};

const KEY_PREFIX = 'yentic.project.v1';

export function inferLanguage(path: string): SupportedLanguage {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.html')) return 'html';
  if (normalized.endsWith('.css')) return 'css';
  if (normalized.endsWith('.py')) return 'python';
  if (normalized.endsWith('.c')) return 'c';
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
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div id="app"></div>
    <script src="/index.js"></script>
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
    code: 'function mount(){const app=document.getElementById("app");if(!app)return;app.innerHTML="<h1>Yentic</h1><p>A classic-feeling web IDE without the bloat.</p><button id=\\"btn\\">Click me</button><pre id=\\"out\\"></pre>";const button=document.getElementById("btn");const output=document.getElementById("out");if(!button||!output)return;button.addEventListener("click",()=>{const now=new Date().toLocaleTimeString();const line="Clicked at "+now;output.textContent=output.textContent?output.textContent+"\\n"+line:line;});}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",mount);}else{mount();}'
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
    previewMode: 'code',
    previewMessage: 'Live execution preview is coming soon for Python workspaces.',
    starter: pythonStarter
  },
  c: {
    slug: 'c',
    title: 'C',
    description: 'Prototype low-level ideas with a straightforward toolchain setup.',
    accent: 'violet',
    defaultActivePath: 'main.c',
    newFilePlaceholder: 'program.c',
    previewMode: 'code',
    previewMessage: 'Live execution preview is not available for C workspaces yet.',
    starter: cStarter
  },
  java: {
    slug: 'java',
    title: 'Java',
    description: 'Iterate on JVM projects with familiar class structure defaults.',
    accent: 'amber',
    defaultActivePath: 'Main.java',
    newFilePlaceholder: 'App.java',
    previewMode: 'code',
    previewMessage: 'Live execution preview is coming soon for Java workspaces.',
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

function migrateProject(slug: WorkspaceSlug, files: ProjectFileMap): ProjectFileMap {
  if (slug !== 'web') {
    return files;
  }

  const script = files['index.js'];
  if (!script) {
    return files;
  }

  const hadNewlineConcat = script.code.includes(
    "document.getElementById('out').textContent += '\\nClicked at ' + now;"
  );
  const hadPrefixConcat = script.code.includes(
    "output.textContent += prefix + 'Clicked at ' + now;"
  );

  if (!hadNewlineConcat && !hadPrefixConcat) {
    return files;
  }

  const next = cloneProject(files);
  next['index.js'] = { ...next['index.js'], code: webStarter['index.js'].code };
  return next;
}
