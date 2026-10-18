import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ArrowRight, LogOut, Moon, Sun, Monitor } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type Theme } from '@/context/ThemeContext';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const themeOrder: Theme[] = ['dark', 'light', 'system'];
const themeMeta: Record<Theme, { icon: typeof Moon; label: string }> = {
  dark: { icon: Moon, label: 'Dark' },
  light: { icon: Sun, label: 'Light' },
  system: { icon: Monitor, label: 'System' },
};

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isDemo, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const signedIn = !!user && !isDemo;
  const ThemeIcon = themeMeta[theme].icon;
  const nextTheme = themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const go = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 sm:px-4 pt-3 sm:pt-4 pointer-events-none">
      <nav
        className={`pointer-events-auto mx-auto flex h-14 items-center justify-between gap-2 rounded-full border pl-3 pr-2 sm:pl-4 transition-all duration-300 ${
          scrolled
            ? 'max-w-4xl glass-strong border-white/[0.12] shadow-2xl shadow-black/30'
            : 'max-w-5xl glass border-white/[0.08]'
        }`}
        aria-label="Main"
      >
        {/* Logo */}
        <a href="#product" className="flex items-center gap-2 shrink-0" onClick={() => setMobileOpen(false)}>
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <span className="text-base font-bold tracking-tight text-white">
            Charmeey<span className="text-brand-400">AI</span>
          </span>
        </a>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-0.5">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTheme(nextTheme)}
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label={`Theme: ${themeMeta[theme].label}. Switch to ${themeMeta[nextTheme].label}`}
            title={`Theme: ${themeMeta[theme].label}`}
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          {signedIn ? (
            <button
              type="button"
              onClick={signOut}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go('/auth')}
              className="hidden md:inline-flex rounded-full px-3 py-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}

          <button
            type="button"
            onClick={() => go(signedIn ? '/dashboard' : '/auth?mode=signup')}
            className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all"
          >
            {signedIn ? 'Dashboard' : 'Get started'}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/5"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="pointer-events-auto md:hidden mx-auto mt-2 max-w-5xl surface rounded-3xl p-3 shadow-2xl shadow-black/40 animate-fade-down">
          <ul className="space-y-0.5">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-4 py-3 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-white/[0.06] pt-3 space-y-2">
            <div className="flex items-center gap-1 rounded-xl glass p-1" role="group" aria-label="Theme">
              {themeOrder.map((id) => {
                const Icon = themeMeta[id].icon;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTheme(id)}
                    aria-pressed={theme === id}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors ${
                      theme === id ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {themeMeta[id].label}
                  </button>
                );
              })}
            </div>
            {signedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="w-full rounded-xl glass px-4 py-2.5 text-sm font-medium text-white/80"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go('/auth')}
                className="w-full rounded-xl glass px-4 py-2.5 text-sm font-medium text-white/80"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
