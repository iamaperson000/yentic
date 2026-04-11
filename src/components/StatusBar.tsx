'use client';

interface StatusBarProps {
  language: string;
  cursorLine?: number;
  cursorColumn?: number;
  connected?: boolean;
}

const languageLabels: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  c: 'C',
  cpp: 'C++',
  java: 'Java',
};

export function StatusBar({ language, cursorLine, cursorColumn, connected }: StatusBarProps) {
  const displayLang = languageLabels[language] ?? language;

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 text-[11px] text-[var(--color-text-muted)]">
      <div className="flex items-center gap-4">
        <span>{displayLang}</span>
        <span>UTF-8</span>
      </div>
      <div>
        {cursorLine != null && cursorColumn != null && (
          <span>Ln {cursorLine}, Col {cursorColumn}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {connected != null && (
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        )}
        <span className="hidden text-[var(--color-text-faint)] sm:inline">⌘K</span>
      </div>
    </div>
  );
}
