'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { applyTheme, nextTheme, readTheme, type Theme } from '@/lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dusk');

  // Sync from the DOM after mount: SSR renders the default, the no-FOUC script
  // sets the real theme pre-paint, and this reconciles state without a mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setTheme(readTheme()), []);

  return (
    <button
      type="button"
      aria-label={theme === 'dusk' ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        const t = nextTheme(theme);
        setTheme(t);
        applyTheme(t);
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition"
      style={{ borderColor: 'var(--y-line)', color: 'var(--y-muted)' }}
    >
      {theme === 'dusk' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
