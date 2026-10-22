import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  ArrowRight,
  Activity,
  CheckCircle2,
  Circle,
  Coins,
  Database,
  KeyRound,
  MessageSquare,
  Puzzle,
  UserPlus,
  Users,
  Gauge,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usageHistory, conversationHistory } from '@/lib/mockData';
import { recentActivity } from '@/lib/saasData';
import { compact, currency, useChartColors } from '@/lib/chartTheme';
import { timeAgo } from '@/lib/format';
import usePersistentState from '@/hooks/usePersistentState';
import { ChartTooltip, StatTile } from './ChartKit';
import { Avatar, Badge, Button, Card, CardHeader, Page, PageHeader } from './ui';
import { useWorkspace } from './WorkspaceContext';
import type { Section } from './nav';

const onboarding: { id: string; label: string; section: Section; query?: string }[] = [
  { id: 'chat', label: 'Send your first AI message', section: 'chats' },
  { id: 'data', label: 'Upload a dataset to Data Studio', section: 'studio' },
  { id: 'invite', label: 'Invite a teammate', section: 'members', query: 'invite=1' },
  { id: 'key', label: 'Create an API key', section: 'api-keys', query: 'create=1' },
  { id: 'integration', label: 'Connect an integration', section: 'integrations' },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Overview({
  onNavigate,
  onOpenConversation,
}: {
  onNavigate: (s: Section, query?: string) => void;
  onOpenConversation: (id: number) => void;
}) {
  const c = useChartColors();
  const { user, isDemo } = useAuth();
  const { members, plan, messagesUsed } = useWorkspace();
  const [done, setDone] = usePersistentState<string[]>('charmeey_onboarding', ['chat']);

  const last14 = useMemo(() => usageHistory.slice(-14).map((d) => ({ label: d.label, requests: d.totalRequests })), []);
  const kpi = useMemo(() => {
    const cur = usageHistory.slice(-30);
    const prev = usageHistory.slice(-60, -30);
    const sum = (a: typeof cur, f: (d: (typeof cur)[number]) => number) => a.reduce((s, d) => s + f(d), 0);
    const req = sum(cur, (d) => d.totalRequests);
    const cost = sum(cur, (d) => d.cost);
    const p50 = sum(cur, (d) => d.p50) / cur.length;
    return {
      req,
      cost,
      p50,
      dReq: (req - sum(prev, (d) => d.totalRequests)) / sum(prev, (d) => d.totalRequests),
      dCost: (cost - sum(prev, (d) => d.cost)) / sum(prev, (d) => d.cost),
      dP50: (p50 - sum(prev, (d) => d.p50) / prev.length) / (sum(prev, (d) => d.p50) / prev.length),
    };
  }, []);

  const active = members.filter((m) => m.status === 'active').length;
  const progress = Math.round((done.length / onboarding.length) * 100);
  const firstName = !isDemo && user?.name ? user.name.split(' ')[0] : null;

  const quick = [
    { label: 'New chat', icon: MessageSquare, section: 'chats' as Section },
    { label: 'Analyze a CSV', icon: Database, section: 'studio' as Section },
    { label: 'Invite teammate', icon: UserPlus, section: 'members' as Section, query: 'invite=1' },
    { label: 'Create API key', icon: KeyRound, section: 'api-keys' as Section, query: 'create=1' },
  ];

  return (
    <Page>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description="Here’s what’s happening in your workspace this month."
        badge={<Badge tone="warning">Sample data</Badge>}
        actions={
          <>
            <Button icon={Activity} onClick={() => onNavigate('analytics')}>
              View analytics
            </Button>
            <Button variant="primary" icon={MessageSquare} onClick={() => onNavigate('chats')}>
              New chat
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatTile icon={Activity} label="Requests (30d)" value={compact(kpi.req)} delta={kpi.dReq} />
        <StatTile icon={Gauge} label="Median latency" value={`${Math.round(kpi.p50)} ms`} delta={kpi.dP50} upIsGood={false} />
        <StatTile icon={Coins} label="Spend (30d)" value={currency(kpi.cost)} delta={kpi.dCost} upIsGood={false} />
        <StatTile icon={Users} label="Active seats" value={`${active} / ${plan.seats}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader
            title="AI requests"
            description="Last 14 days, all models"
            action={
              <button type="button" onClick={() => onNavigate('analytics')} className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
                Details <ArrowRight className="h-3 w-3" />
              </button>
            }
          />
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last14} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.axis }} interval={2} />
                <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis }} />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="requests"
                  name="Requests"
                  stroke={c.series[0]}
                  strokeWidth={2}
                  fill={c.series[0]}
                  fillOpacity={0.1}
                  activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Get started" description={`${done.length} of ${onboarding.length} complete`} />
          <div className="h-1.5 rounded-full bg-brand-500/15 mb-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Onboarding progress">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <ul className="space-y-1">
            {onboarding.map((step) => {
              const isDone = done.includes(step.id);
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDone) setDone((d) => [...d, step.id]);
                      onNavigate(step.section, step.query);
                    }}
                    className="group w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-white/25" />
                    )}
                    <span className={`flex-1 text-sm ${isDone ? 'text-white/40 line-through' : 'text-white/80'}`}>{step.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/60" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => onNavigate(q.section, q.query)}
            className="group surface rounded-xl p-4 text-left transition-colors hover:border-brand-500/30"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 group-hover:bg-brand-600/20 transition-colors">
              <q.icon className="h-4 w-4 text-brand-400" />
            </span>
            <span className="mt-3 flex items-center justify-between text-sm font-medium text-white">
              {q.label}
              <ArrowRight className="h-3.5 w-3.5 text-white/20 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Recent conversations"
            action={
              <button type="button" onClick={() => onNavigate('history')} className="text-xs font-medium text-brand-400 hover:text-brand-300">
                View all
              </button>
            }
          />
          <ul className="-mx-2 divide-y divide-white/[0.05]">
            {conversationHistory.slice(0, 5).map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => onOpenConversation(h.id)}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/[0.03]"
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-white/30" />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm text-white/85">{h.title}</span>
                    <span className="block text-[11px] text-white/35">
                      {h.tag} · {h.messages} messages
                    </span>
                  </span>
                  <span className="text-[11px] text-white/35 shrink-0">{timeAgo(h.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Team activity"
            action={
              <button type="button" onClick={() => onNavigate('audit-log')} className="text-xs font-medium text-brand-400 hover:text-brand-300">
                Audit log
              </button>
            }
          />
          <ul className="space-y-4">
            {recentActivity.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <Avatar name={a.who} size={28} />
                <p className="flex-1 text-sm text-white/60">
                  <span className="font-medium text-white/90">{a.who}</span> {a.what}
                </p>
                <span className="text-[11px] text-white/35 shrink-0">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between rounded-lg surface-muted px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs text-white/60">
              <Puzzle className="h-3.5 w-3.5 text-white/40" />
              {messagesUsed.toLocaleString()} / {plan.messages.toLocaleString()} messages used on {plan.name}
            </span>
            <button type="button" onClick={() => onNavigate('billing')} className="text-xs font-medium text-brand-400 hover:text-brand-300">
              Manage plan
            </button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
