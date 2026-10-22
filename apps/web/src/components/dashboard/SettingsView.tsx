import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Laptop, Monitor, Moon, ShieldCheck, Smartphone, Sun, Trash2, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import usePersistentState from '@/hooks/usePersistentState';
import { inputClass, timeAgo } from '@/lib/format';
import { useWorkspace } from './WorkspaceContext';
import { Avatar, Badge, Button, Card, CardHeader, Field, Modal, Page, PageHeader, Tabs, Toggle } from './ui';

type Tab = 'profile' | 'security' | 'notifications' | 'appearance' | 'workspace';
const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'workspace', label: 'Workspace' },
];

function Row({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between border-t border-white/[0.06] first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        {description && <p className="text-xs text-white/45 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ProfileTab() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user, isDemo } = useAuth();
  const [profile, setProfile] = usePersistentState('charmeey_profile', {
    name: user?.name || '',
    title: 'Product Manager',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'English',
  });
  const [draft, setDraft] = useState(profile);

  // Auth resolves after first render; seed an empty profile name from the account once it's known
  useEffect(() => {
    if (!profile.name && user?.name) {
      const seeded = { ...profile, name: user.name };
      setProfile(seeded);
      setDraft(seeded);
    }
  }, [user?.name, profile, setProfile]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  return (
    <Card>
      <CardHeader title="Profile" description="How you appear to teammates." />
      {isDemo && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2.5 text-xs text-white/70">
          You’re exploring the demo workspace. Create an account to save your own profile.
          <Button size="sm" variant="primary" icon={LogIn} onClick={() => navigate('/auth?mode=signup')}>
            Create account
          </Button>
        </div>
      )}
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={draft.name || 'User'} size={56} />
        <div>
          <p className="text-sm font-medium text-white">{draft.name || 'Your name'}</p>
          <p className="text-xs text-white/45">{user?.email}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="pf-name">
          <input id="pf-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Email" hint="Contact support to change your sign-in email." htmlFor="pf-email">
          <input id="pf-email" value={user?.email || ''} disabled className={`${inputClass} opacity-60`} />
        </Field>
        <Field label="Job title" htmlFor="pf-title">
          <input id="pf-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={80} className={inputClass} />
        </Field>
        <Field label="Time zone" htmlFor="pf-tz">
          <select id="pf-tz" value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })} className={inputClass}>
            {Array.from(new Set([draft.timezone, 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore'])).map((tz) => (
              <option key={tz} className="bg-ink-900">
                {tz}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(profile)}>
          Discard
        </Button>
        <Button
          variant="primary"
          disabled={!dirty || !draft.name.trim()}
          onClick={() => {
            setProfile(draft);
            toast({ kind: 'success', title: 'Profile saved' });
          }}
        >
          Save changes
        </Button>
      </div>
    </Card>
  );
}

function SecurityTab() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [twoFactor, setTwoFactor] = usePersistentState('charmeey_2fa', false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [code, setCode] = useState('');
  const [sessions, setSessions] = useState([
    { id: 1, device: 'Chrome on Windows', where: 'Current session', icon: Laptop, at: new Date().toISOString(), current: true },
    { id: 2, device: 'Safari on iPhone', where: 'Lagos, NG', icon: Smartphone, at: new Date(Date.now() - 3 * 3600_000).toISOString(), current: false },
    { id: 3, device: 'Firefox on macOS', where: 'London, UK', icon: Laptop, at: new Date(Date.now() - 4 * 86400_000).toISOString(), current: false },
  ]);

  const changePassword = () => {
    if (!current) return setPwError('Enter your current password.');
    if (next.length < 8) return setPwError('New password must be at least 8 characters.');
    if (next === current) return setPwError('New password must be different from the current one.');
    if (next !== confirm) return setPwError('Passwords do not match.');
    setPwError('');
    setCurrent('');
    setNext('');
    setConfirm('');
    toast({ kind: 'success', title: 'Password updated', description: 'Other sessions will be asked to sign in again.' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Password" description="Use at least 8 characters with a mix of letters, numbers and symbols." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Current password" htmlFor="pw-cur">
            <input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} />
          </Field>
          <Field label="New password" htmlFor="pw-new">
            <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Confirm new password" htmlFor="pw-conf">
            <input id="pw-conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </Field>
        </div>
        {pwError && <p role="alert" className="mt-3 text-xs text-rose-400">{pwError}</p>}
        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={changePassword}>
            Update password
          </Button>
        </div>
      </Card>

      <Card>
        <Row
          title="Two-factor authentication"
          description={twoFactor ? 'Your account is protected with an authenticator app.' : 'Add a second step at sign-in with an authenticator app.'}
        >
          <div className="flex items-center gap-3">
            {twoFactor && <Badge tone="success"><ShieldCheck className="h-3 w-3" /> Enabled</Badge>}
            <Button
              variant={twoFactor ? 'danger' : 'primary'}
              onClick={() => {
                if (twoFactor) {
                  setTwoFactor(false);
                  toast({ kind: 'info', title: 'Two-factor authentication disabled' });
                } else setSetupOpen(true);
              }}
            >
              {twoFactor ? 'Disable' : 'Enable 2FA'}
            </Button>
          </div>
        </Row>
      </Card>

      <Card>
        <CardHeader
          title="Active sessions"
          description="Devices currently signed in to your account."
          action={
            sessions.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSessions((s) => s.filter((x) => x.current));
                  toast({ kind: 'success', title: 'Signed out of all other sessions' });
                }}
              >
                Sign out others
              </Button>
            )
          }
        />
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg surface-muted px-3 py-2.5">
              <s.icon className="h-4 w-4 text-white/40" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{s.device}</p>
                <p className="text-xs text-white/40">
                  {s.where} · {s.current ? 'Active now' : timeAgo(s.at)}
                </p>
              </div>
              {s.current ? (
                <Badge tone="brand">This device</Badge>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setSessions((prev) => prev.filter((x) => x.id !== s.id))}>
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Modal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        title="Set up two-factor authentication"
        description="Scan the code with Google Authenticator, 1Password or Authy, then enter the 6-digit code."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSetupOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!/^\d{6}$/.test(code)}
              onClick={() => {
                setTwoFactor(true);
                setSetupOpen(false);
                setCode('');
                toast({ kind: 'success', title: 'Two-factor authentication enabled' });
              }}
            >
              Verify & enable
            </Button>
          </>
        }
      >
        <div className="mx-auto grid h-36 w-36 grid-cols-9 gap-0.5 rounded-lg bg-white p-2" aria-label="Sample QR code" role="img">
          {Array.from({ length: 81 }, (_, i) => (
            <span key={i} className={(i * 7 + (i % 5) * 3) % 3 === 0 || [0, 1, 2, 9, 18, 6, 7, 8, 17, 26, 54, 63, 72, 73, 74].includes(i) ? 'bg-black' : ''} />
          ))}
        </div>
        <p className="text-center font-mono text-xs text-white/45">Setup key: CHRM-7Q4X-PL2M-90ZA</p>
        <Field label="Verification code" hint="Demo: any 6 digits work." htmlFor="otp">
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`${inputClass} text-center font-mono tracking-[0.4em]`}
          />
        </Field>
      </Modal>
    </div>
  );
}

const NOTIFY_EVENTS = [
  { id: 'mentions', label: 'Mentions & direct messages', desc: 'When someone messages or @mentions you.' },
  { id: 'usage', label: 'Usage alerts', desc: 'When the workspace reaches 80% and 100% of its limits.' },
  { id: 'members', label: 'Member changes', desc: 'Joins, role changes and removals.' },
  { id: 'billing', label: 'Billing', desc: 'Invoices, payment failures and plan changes.' },
  { id: 'product', label: 'Product updates', desc: 'New features and tips (at most monthly).' },
];

function NotificationsTab() {
  const [prefs, setPrefs] = usePersistentState<Record<string, { email: boolean; app: boolean }>>('charmeey_notify_prefs', {
    mentions: { email: true, app: true },
    usage: { email: true, app: true },
    members: { email: false, app: true },
    billing: { email: true, app: false },
    product: { email: false, app: false },
  });
  const [digest, setDigest] = usePersistentState('charmeey_digest', 'weekly');

  return (
    <div className="space-y-4">
      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader title="Notification preferences" description="Choose where you hear about each kind of event. Changes save automatically." />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-white/40">
              <th scope="col" className="px-5 py-2 text-left font-medium">Event</th>
              <th scope="col" className="px-3 py-2 font-medium w-20">Email</th>
              <th scope="col" className="px-5 py-2 font-medium w-20">In-app</th>
            </tr>
          </thead>
          <tbody>
            {NOTIFY_EVENTS.map((e) => {
              const p = prefs[e.id] ?? { email: false, app: false };
              return (
                <tr key={e.id} className="border-t border-white/[0.05]">
                  <td className="px-5 py-3">
                    <p className="text-white/85">{e.label}</p>
                    <p className="text-xs text-white/40">{e.desc}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Toggle checked={p.email} label={`${e.label} by email`} onChange={(v) => setPrefs({ ...prefs, [e.id]: { ...p, email: v } })} />
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Toggle checked={p.app} label={`${e.label} in app`} onChange={(v) => setPrefs({ ...prefs, [e.id]: { ...p, app: v } })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card>
        <Row title="Activity digest" description="A summary of workspace activity sent by email.">
          <select value={digest} onChange={(e) => setDigest(e.target.value)} aria-label="Digest frequency" className={`${inputClass} w-40`}>
            <option value="daily" className="bg-ink-900">Daily</option>
            <option value="weekly" className="bg-ink-900">Weekly</option>
            <option value="off" className="bg-ink-900">Off</option>
          </select>
        </Row>
      </Card>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [compact, setCompact] = usePersistentState('charmeey_compact', false);
  const options: { id: Theme; label: string; icon: typeof Sun; preview: string }[] = [
    { id: 'light', label: 'Light', icon: Sun, preview: 'bg-[#f4f6fb]' },
    { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-[#08080c]' },
    { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-r from-[#f4f6fb] from-50% to-[#08080c] to-50%' },
  ];
  return (
    <Card>
      <CardHeader title="Theme" description="Choose how CharmeeyAI looks on this device." />
      <div className="grid gap-3 sm:grid-cols-3 max-w-xl">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setTheme(o.id)}
            aria-pressed={theme === o.id}
            className={`rounded-xl border p-2 text-left transition-colors ${theme === o.id ? 'border-brand-500/60 ring-2 ring-brand-500/20' : 'border-white/10 hover:border-white/20'}`}
          >
            <span className={`block h-16 rounded-lg border border-white/10 ${o.preview}`} />
            <span className="mt-2 flex items-center gap-1.5 px-1 text-sm font-medium text-white">
              <o.icon className="h-3.5 w-3.5" />
              {o.label}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <Row title="Compact tables" description="Show more rows by reducing padding in lists and tables.">
          <Toggle checked={compact} onChange={setCompact} label="Compact tables" />
        </Row>
      </div>
    </Card>
  );
}

function WorkspaceTab() {
  const toast = useToast();
  const { workspace, renameWorkspace } = useWorkspace();
  const [name, setName] = useState(workspace.name);
  const [model, setModel] = usePersistentState('charmeey_default_model', 'gemini-3.5-flash');
  const [retention, setRetention] = usePersistentState('charmeey_retention', '90');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  useEffect(() => setName(workspace.name), [workspace.name]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="General" />
        <Row title="Workspace name" description="Shown in the sidebar, invites and invoices.">
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-label="Workspace name" className={`${inputClass} w-56`} />
            <Button
              variant="primary"
              disabled={!name.trim() || name.trim() === workspace.name}
              onClick={() => {
                renameWorkspace(name.trim());
                toast({ kind: 'success', title: 'Workspace renamed' });
              }}
            >
              Save
            </Button>
          </div>
        </Row>
        <Row title="Workspace ID" description="Use this when contacting support or calling the API.">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(`ws_${workspace.id}`);
              toast({ kind: 'success', title: 'Workspace ID copied' });
            }}
            className="inline-flex items-center gap-2 rounded-lg surface-muted px-3 py-1.5 font-mono text-xs text-white/70 hover:text-white"
          >
            ws_{workspace.id}
            <Copy className="h-3.5 w-3.5" />
          </button>
        </Row>
        <Row title="Default AI model" description="Used for new chats unless a template overrides it.">
          <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Default model" className={`${inputClass} w-56`}>
            <option value="gemini-3.5-flash" className="bg-ink-900">Gemini 3.5 Flash (fast)</option>
            <option value="gemini-1.5-pro" className="bg-ink-900">Gemini 1.5 Pro (reasoning)</option>
            <option value="gpt-4o-mini" className="bg-ink-900">GPT-4o mini (fallback)</option>
          </select>
        </Row>
        <Row title="Data retention" description="Conversations and uploaded datasets older than this are deleted.">
          <select value={retention} onChange={(e) => setRetention(e.target.value)} aria-label="Data retention" className={`${inputClass} w-56`}>
            {['30', '90', '365', 'forever'].map((v) => (
              <option key={v} value={v} className="bg-ink-900">
                {v === 'forever' ? 'Keep forever' : `${v} days`}
              </option>
            ))}
          </select>
        </Row>
      </Card>

      <Card className="border-rose-500/25">
        <CardHeader title="Danger zone" />
        <Row title="Delete workspace" description="Permanently delete all conversations, datasets, keys and members.">
          <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>
            Delete workspace
          </Button>
        </Row>
      </Card>

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setConfirmName('');
        }}
        title="Delete this workspace?"
        description="This can’t be undone. Type the workspace name to confirm."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmName !== workspace.name}
              onClick={() => {
                setDeleteOpen(false);
                setConfirmName('');
                toast({ kind: 'info', title: 'Deletion is disabled in the demo', description: 'Nothing was deleted.' });
              }}
            >
              Delete permanently
            </Button>
          </>
        }
      >
        <input value={confirmName} onChange={(e) => setConfirmName(e.target.value)} placeholder={workspace.name} aria-label="Type workspace name to confirm" className={inputClass} />
      </Modal>
    </div>
  );
}

export default function SettingsView() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'profile') as Tab;

  return (
    <Page width="max-w-4xl">
      <PageHeader title="Settings" description="Manage your account, security and workspace preferences." />
      <Tabs tabs={TABS} value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'appearance' && <AppearanceTab />}
      {tab === 'workspace' && <WorkspaceTab />}
    </Page>
  );
}
