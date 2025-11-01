export type SupportedLanguage = 'html' | 'css' | 'javascript';
export type ProjectFile = { path: string; language: SupportedLanguage; code: string; };
export type ProjectFileMap = Record<string, ProjectFile>;
const KEY = 'yentic.project.v1';

export function inferLanguage(path: string): SupportedLanguage {
  const normalized = path.toLowerCase();
  if (normalized.endsWith('.html')) return 'html';
  if (normalized.endsWith('.css')) return 'css';
  return 'javascript';
}

export function scaffoldFor(path: string, language: SupportedLanguage): string {
  if (language === 'html') {
    return `<!-- ${path} -->\n`;
  }
  if (language === 'css') {
    return `/* ${path} */\n`;
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

export const starterProject: ProjectFileMap = {
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
    code: `function mount(){const app=document.getElementById('app'); if(!app) return; app.innerHTML='<h1>Yentic</h1><p>Classic web IDE — no AI bloat.</p><button id="btn">Click me</button><pre id="out"></pre>'; document.getElementById('btn').addEventListener('click',()=>{const now=new Date().toLocaleTimeString(); document.getElementById('out').textContent += '\\nClicked at ' + now;});}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', mount); } else { mount(); }`
  }
};

export function loadProject(): ProjectFileMap | null {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as ProjectFileMap : null; } catch { return null; }
}
export function saveProject(files: ProjectFileMap) {
  try { localStorage.setItem(KEY, JSON.stringify(files)); } catch {}
}
