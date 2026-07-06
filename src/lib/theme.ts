export type Theme = 'dusk' | 'daylight';

export function nextTheme(current: Theme): Theme {
  return current === 'dusk' ? 'daylight' : 'dusk';
}

export function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dusk';
  const t = document.documentElement.dataset.theme;
  return t === 'daylight' ? 'daylight' : 'dusk';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('yentic-theme', theme);
  } catch {
    /* ignore */
  }
}
