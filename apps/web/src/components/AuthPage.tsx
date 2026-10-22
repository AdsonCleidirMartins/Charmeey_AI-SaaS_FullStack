import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  LogIn,
  UserPlus,
  Loader2,
  Eye,
  EyeOff,
  Check,
  BarChart3,
  MessageSquare,
  LayoutTemplate,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'signup';
type Field = 'name' | 'email' | 'password' | 'confirm';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

function passwordScore(pw: string): number {
  let score = 0;
  if (pw.length >= MIN_PASSWORD) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-rose-500', 'bg-rose-500', 'bg-amber-500', 'bg-brand-500', 'bg-emerald-500'];

const perks = [
  { icon: MessageSquare, text: 'Multimodal AI chat with files & images' },
  { icon: BarChart3, text: 'Data Studio — upload a CSV, get charts & insights' },
  { icon: LayoutTemplate, text: 'Reusable prompt templates for your team' },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isDemo, offline, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in with a real account: skip the form
  useEffect(() => {
    if (!loading && user && !isDemo) navigate('/dashboard', { replace: true });
  }, [loading, user, isDemo, navigate]);

  const errors = useMemo(() => {
    const e: Partial<Record<Field, string>> = {};
    if (mode === 'signup') {
      if (!name.trim()) e.name = 'Please enter your name.';
      else if (name.trim().length > 80) e.name = 'Name must be 80 characters or fewer.';
    }
    if (!email.trim()) e.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password) e.password = 'Please enter your password.';
    else if (mode === 'signup' && password.length < MIN_PASSWORD)
      e.password = `Use at least ${MIN_PASSWORD} characters.`;
    if (mode === 'signup' && confirm !== password) e.confirm = 'Passwords do not match.';
    return e;
  }, [mode, name, email, password, confirm]);

  const score = passwordScore(password);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
    setTouched({});
    setConfirm('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (f: Field) => (touched[f] ? errors[f] : undefined);
  const inputClass = (f: Field) =>
    `w-full rounded-lg glass px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40 transition-colors ${
      fieldError(f) ? 'border-rose-500/50' : ''
    }`;

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid mask-fade-b opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-violet-600/15 rounded-full blur-[100px]" />

      <div className="relative w-full max-w-4xl grid lg:grid-cols-[1fr_440px] gap-10 items-center animate-fade-down">
        {/* Value proposition */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/favicon.svg" alt="CharmeeyAI" className="h-10 w-10" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Charmeey<span className="text-brand-400">AI</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Your AI workspace for <span className="text-brand-gradient">chat, data & decisions.</span>
          </h2>
          <p className="mt-4 text-white/50 max-w-md">
            Ask questions, analyze datasets, and track usage across your team — all in one place.
          </p>
          <ul className="mt-8 space-y-3">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-white/70">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/15">
                  <p.icon className="h-4 w-4 text-brand-400" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>

        <div>
          {/* Brand (mobile) */}
          <div className="flex lg:hidden items-center justify-center gap-2.5 mb-8">
            <img src="/favicon.svg" alt="CharmeeyAI" className="h-10 w-10" />
            <span className="text-2xl font-bold tracking-tight text-white">
              Charmeey<span className="text-brand-400">AI</span>
            </span>
          </div>

          <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-brand-500/10">
            {/* Mode tabs */}
            <div className="flex items-center gap-1 glass rounded-lg p-1 mb-6" role="tablist">
              {(
                [
                  { id: 'signin' as Mode, label: 'Sign In', icon: LogIn },
                  { id: 'signup' as Mode, label: 'Sign Up', icon: UserPlus },
                ]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === tab.id}
                  onClick={() => switchMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    mode === tab.id ? 'bg-brand-600/30 text-brand-300' : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <h1 className="text-xl font-bold text-white mb-1">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-sm text-white/50 mb-6">
              {mode === 'signin'
                ? 'Sign in to pick up where you left off.'
                : 'Free forever on Starter. No credit card required.'}
            </p>

            {offline && (
              <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
                <WifiOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Backend offline — accounts are stored locally in this browser for the demo.
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-white/40 mb-1.5">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="Jane Doe"
                    aria-invalid={!!fieldError('name')}
                    className={inputClass('name')}
                  />
                  {fieldError('name') && <p className="mt-1 text-xs text-rose-400">{fieldError('name')}</p>}
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-white/40 mb-1.5">
                  Work email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="you@company.com"
                  aria-invalid={!!fieldError('email')}
                  className={inputClass('email')}
                />
                {fieldError('email') && <p className="mt-1 text-xs text-rose-400">{fieldError('email')}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="block text-xs font-medium text-white/40">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() =>
                        setInfo('Password reset is not enabled in this demo. Create a new account or use Demo mode.')
                      }
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    aria-invalid={!!fieldError('password')}
                    className={`${inputClass('password')} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldError('password') && <p className="mt-1 text-xs text-rose-400">{fieldError('password')}</p>}

                {mode === 'signup' && password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < score ? strengthColors[score] : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-white/40">
                      Strength: <span className="text-white/70">{strengthLabels[score]}</span> · use 12+ characters
                      with numbers and symbols
                    </p>
                  </div>
                )}
              </div>

              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-confirm" className="block text-xs font-medium text-white/40 mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                      placeholder="••••••••"
                      aria-invalid={!!fieldError('confirm')}
                      className={`${inputClass('confirm')} pr-10`}
                    />
                    {confirm && confirm === password && (
                      <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  {fieldError('confirm') && <p className="mt-1 text-xs text-rose-400">{fieldError('confirm')}</p>}
                </div>
              )}

              {error && (
                <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-300">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-lg bg-brand-500/10 border border-brand-500/20 px-4 py-2.5 text-xs text-brand-300">
                  {info}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : mode === 'signin' ? (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </>
                )}
              </button>

              {mode === 'signup' && (
                <p className="text-[11px] text-white/30 text-center">
                  By creating an account you agree to the Terms of Service and Privacy Policy.
                </p>
              )}
            </form>

            {/* Demo access */}
            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <p className="text-xs text-white/40 text-center">
                Just exploring?
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="text-brand-400 hover:text-brand-300 font-medium ml-1"
                >
                  Continue with sample data
                </button>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-6 mx-auto flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
