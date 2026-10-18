import { useState } from 'react';
import { BookOpen, ChevronDown, Code2, LifeBuoy, MessagesSquare, Megaphone, Send, CircleCheck, CircleAlert } from 'lucide-react';
import usePersistentState from '@/hooks/usePersistentState';
import { faqs, systemStatus } from '@/lib/saasData';
import { inputClass, timeAgo } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, Card, CardHeader, Field, Page, PageHeader } from './ui';
import type { Section } from './nav';

interface Ticket {
  id: number;
  subject: string;
  category: string;
  status: 'Open' | 'Resolved';
  at: string;
}

const resources = [
  { icon: BookOpen, title: 'Documentation', desc: 'Guides for chat, Data Studio and admin features.' },
  { icon: Code2, title: 'API reference', desc: 'Endpoints, authentication and webhooks.' },
  { icon: MessagesSquare, title: 'Community', desc: 'Ask questions in the team chat room.', section: 'room' as Section },
  { icon: Megaphone, title: 'Changelog', desc: 'New: Data Studio, audit log export, ⌘K search.' },
];

export default function Support({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(0);
  const [tickets, setTickets] = usePersistentState<Ticket[]>('charmeey_tickets', [
    { id: 1042, subject: 'CSV export times out above 50K rows', category: 'Bug', status: 'Resolved', at: new Date(Date.now() - 86400_000 * 6).toISOString() },
  ]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Question');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (subject.trim().length < 5) return setError('Add a short subject (at least 5 characters).');
    if (message.trim().length < 20) return setError('Describe the issue in at least 20 characters so we can help.');
    const id = 1043 + tickets.length;
    setTickets((prev) => [{ id, subject: subject.trim(), category, status: 'Open', at: new Date().toISOString() }, ...prev]);
    toast({ kind: 'success', title: `Ticket #${id} created`, description: 'Typical first response: under 4 hours.' });
    setSubject('');
    setMessage('');
    setError('');
  };

  const allOk = systemStatus.every((s) => s.status === 'operational');

  return (
    <Page width="max-w-6xl">
      <PageHeader title="Help & Support" description="Find answers fast or get in touch with our team." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {resources.map((r) => (
          <button
            key={r.title}
            type="button"
            onClick={() =>
              r.section ? onNavigate(r.section) : toast({ kind: 'info', title: r.title, description: 'Opens the public docs site in production.' })
            }
            className="group surface rounded-xl p-4 text-left flex flex-col items-start transition-colors hover:border-brand-500/30"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10">
              <r.icon className="h-4 w-4 text-brand-400" />
            </span>
            <p className="mt-3 text-sm font-medium text-white">{r.title}</p>
            <p className="mt-0.5 text-xs text-white/45">{r.desc}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Frequently asked questions" />
          <ul className="divide-y divide-white/[0.06]">
            {faqs.map((f, i) => (
              <li key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 py-3 text-left text-sm font-medium text-white/85 hover:text-white"
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && <p className="pb-3 text-sm leading-relaxed text-white/55">{f.a}</p>}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="System status"
              action={<Badge tone={allOk ? 'success' : 'warning'} dot>{allOk ? 'All systems normal' : 'Partial degradation'}</Badge>}
            />
            <ul className="space-y-2.5">
              {systemStatus.map((s) => (
                <li key={s.name} className="flex items-center gap-2.5 text-sm">
                  {s.status === 'operational' ? (
                    <CircleCheck className="h-4 w-4 text-emerald-400" aria-label="Operational" />
                  ) : (
                    <CircleAlert className="h-4 w-4 text-amber-400" aria-label="Degraded" />
                  )}
                  <span className="flex-1 text-white/75">{s.name}</span>
                  <span className="text-xs tabular-nums text-white/40">{s.uptime}% uptime</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Your tickets" />
            {tickets.length === 0 ? (
              <p className="text-sm text-white/40">No tickets yet.</p>
            ) : (
              <ul className="space-y-2">
                {tickets.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-center gap-3 rounded-lg surface-muted px-3 py-2">
                    <span className="font-mono text-xs text-white/40">#{t.id}</span>
                    <span className="flex-1 truncate text-sm text-white/80">{t.subject}</span>
                    <Badge tone={t.status === 'Open' ? 'warning' : 'success'}>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            {tickets[0] && <p className="mt-2 text-[11px] text-white/35">Last updated {timeAgo(tickets[0].at)}</p>}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Contact support" description="We usually reply within 4 business hours." action={<LifeBuoy className="h-4 w-4 text-white/30" />} />
        <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
          <Field label="Subject" htmlFor="sup-subject">
            <input id="sup-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="What do you need help with?" className={inputClass} />
          </Field>
          <Field label="Category" htmlFor="sup-cat">
            <select id="sup-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
              {['Question', 'Bug', 'Billing', 'Feature request', 'Security'].map((c) => (
                <option key={c} className="bg-ink-900">
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Message" htmlFor="sup-msg">
            <textarea id="sup-msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Steps to reproduce, what you expected, and what happened…" className={`${inputClass} resize-y`} />
          </Field>
        </div>
        {error && <p role="alert" className="mt-2 text-xs text-rose-400">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button variant="primary" icon={Send} onClick={submit}>
            Submit ticket
          </Button>
        </div>
      </Card>
    </Page>
  );
}
