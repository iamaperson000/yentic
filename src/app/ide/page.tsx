import Link from 'next/link';

import { workspaceList } from '@/lib/project';

const languageMeta: Record<
  string,
  {
    icon: string;
    tagline: string;
  }
> = {
  web: {
    icon: '🌐',
    tagline: 'Start coding in HTML, CSS, and JavaScript.'
  },
  python: {
    icon: '🐍',
    tagline: 'Run scripts and notebooks with Python.'
  },
  c: {
    icon: '⚙️',
    tagline: 'Compile and test C programs quickly.'
  },
  java: {
    icon: '☕️',
    tagline: 'Spin up classes and JVM apps instantly.'
  }
};

const highlights = [
  {
    title: 'Smart scaffolding',
    description: 'Language-aware starters and instant file creation tuned to each stack.'
  },
  {
    title: 'Expanded workspace',
    description: 'Layouts stretch across large displays without sacrificing smaller breakpoints.'
  },
  {
    title: 'Unified polish',
    description: 'Consistent typography, spacing, and hover states across the IDE family.'
  }
];

export default function WorkspacePicker() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 py-12 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Yentic environments
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold sm:text-4xl">Choose your language</h1>
            <p className="text-sm text-slate-400 sm:text-base">
              Launch a ready-to-run workspace that matches the stack you need.
            </p>
          </div>
          <div className="mx-auto">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-400 text-sm font-semibold text-slate-950">
                Y
              </span>
              Back to home
            </Link>
          </div>
        </div>
      </header>
      <main className="flex flex-1 justify-center px-6 py-12">
        <div className="grid w-full max-w-[960px] gap-4 sm:grid-cols-2">
          {workspaceList.map(workspace => {
            const meta = languageMeta[workspace.slug] ?? {
              icon: '🗂️',
              tagline: 'Open a workspace tailored to this stack.'
            };

            return (
              <Link
                key={workspace.slug}
                href={`/ide/${workspace.slug}`}
                className="group flex flex-col items-start gap-4 rounded-xl border border-slate-900/70 bg-slate-950/70 p-6 transition hover:border-emerald-400/50 hover:bg-slate-900/70"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-2xl">
                  {meta.icon}
                </span>
                <div className="space-y-1 text-left">
                  <h2 className="text-xl font-semibold text-slate-100">{workspace.title}</h2>
                  <p className="text-sm text-slate-400">{meta.tagline}</p>
                </div>
                <div className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-emerald-200">
                  Start workspace
                  <span aria-hidden className="transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
