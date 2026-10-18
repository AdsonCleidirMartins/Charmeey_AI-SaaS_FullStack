import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

const columns: { title: string; links: { label: string; href: string; route?: boolean }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Live demo', href: '/dashboard', route: true },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API keys', href: '/dashboard/api-keys', route: true },
      { label: 'Integrations', href: '/dashboard/integrations', route: true },
      { label: 'System status', href: '/dashboard/support', route: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Customers', href: '#customers' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Contact', href: '/dashboard/support', route: true },
    ],
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const subscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setEmail('');
    toast({ kind: 'success', title: 'You’re subscribed', description: 'Monthly product updates, no spam.' });
  };

  return (
    <footer className="relative border-t border-white/[0.06] pt-14 pb-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <a href="#product" className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="h-8 w-8" />
              <span className="text-lg font-semibold tracking-tight text-white">
                Charmeey<span className="text-brand-400">AI</span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
              The AI workspace for chat, data analysis and team administration — powered by Google Gemini.
            </p>
            <form onSubmit={subscribe} noValidate className="mt-6 max-w-sm">
              <label htmlFor="footer-email" className="text-xs font-medium text-white/60">
                Get monthly product updates
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="min-w-0 flex-1 rounded-lg surface-muted px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
                <button type="submit" className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
                  Subscribe
                </button>
              </div>
              {error && <p role="alert" className="mt-1.5 text-xs text-rose-400">{error}</p>}
            </form>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-white">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      {l.route ? (
                        <Link to={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                          {l.label}
                        </Link>
                      ) : (
                        <a href={l.href} className="text-sm text-white/50 hover:text-white transition-colors">
                          {l.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06] pt-6">
          <p className="text-xs text-white/40">© 2026 CharmeeyAI. A portfolio demo project.</p>
          <div className="flex items-center gap-1">
            {[
              { icon: Github, label: 'GitHub', href: 'https://github.com/charmeey/Charmeey_AI-SaaS_FullStack' },
              { icon: Twitter, label: 'Twitter', href: '#' },
              { icon: Linkedin, label: 'LinkedIn', href: '#' },
            ].map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target={href.startsWith('http') ? '_blank' : undefined}
                rel={href.startsWith('http') ? 'noreferrer' : undefined}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
