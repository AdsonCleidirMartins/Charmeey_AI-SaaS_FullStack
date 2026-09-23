import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const THEME_KEY = 'charmeey_theme';
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch {
    /* ignore storage errors */
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    const initial = readInitialTheme();
    return initial === 'system' ? systemTheme() : initial;
  });

  useEffect(() => {
    const root = document.documentElement;
    const next = theme === 'system' ? systemTheme() : theme;
    setResolved(next);
    root.setAttribute('data-theme', next);
    root.style.colorScheme = next;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore storage errors */
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setResolved(systemTheme());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}