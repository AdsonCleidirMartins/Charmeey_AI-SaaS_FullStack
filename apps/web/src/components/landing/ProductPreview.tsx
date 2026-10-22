import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  LayoutDashboard,
  MessageSquare,
  Database,
  BarChart3,
  Users,
  KeyRound,
  CreditCard,
  Search,
  Bell,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { usageHistory } from '@/lib/mockData';
import { compact, useChartColors } from '@/lib/chartTheme';

const nav = [
  { icon: LayoutDashboard, label: 'Overview', active: true },
  { icon: MessageSquare, label: 'AI Chat' },
  { icon: Database, label: 'Data Studio' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Users, label: 'Members' },
  { icon: KeyRound, label: 'API Keys' },
  { icon: CreditCard, label: 'Billing' },
];

const kpis = [
  { label: 'Requests', value: '95.2K', delta: '+12.8%' },
  { label: 'Tokens', value: '90.9M', delta: '+11.4%' },
  { label: 'Latency', value: '368 ms', delta: '−4.5%' },
  { label: 'Active seats', value: '24', delta: '+3' },
];

/** A static, code-built miniature of the dashboard used as the hero visual. */
export default function ProductPreview() {
  const c = useChartColors();
  const data = useMemo(() => usageHistory.slice(-30).map((d) => ({ label: d.label, v: d.totalRequests })), []);

  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-x-6 -top-10 -bottom-6 bg-gradient-to-b from-brand-600/25 via-brand-600/5 to-transparent blur-3xl rounded-[48px]" />
      <div className="relative surface rounded-2xl sm:rounded-3xl p-1.5 shadow-2xl shadow-black/50 ring-1 ring-white/5">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto hidden sm:flex items-center gap-1.5 rounded-md surface-muted px-3 py-1 text-[11px] text-white/40 font-mono">
            app.charmeey.ai/dashboard
          </span>
        </div>

        <div className="flex overflow-hidden rounded-xl sm:rounded-2xl border border-white/[0.06] bg-ink-950 text-left">
          {/* Sidebar */}
          <div className="hidden md:flex w-48 shrink-0 flex-col gap-0.5 app-sidebar border-r border-white/[0.06] p-3">
            <div className="flex items-center gap-2 px-1.5 pb-3">
              <img src="/favicon.svg" alt="" className="h-6 w-6" />
              <span className="text-sm font-semibold text-white">Acme Inc</span>
            </div>
            {nav.map((n) => (
              <span
                key={n.label}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  n.active ? 'bg-white/[0.07] text-white' : 'text-white/50'
                }`}
              >
                <n.icon className={`h-3.5 w-3.5 ${n.active ? 'text-brand-400' : ''}`} />
                {n.label}
              </span>
            ))}
          </div>

          {/* Main */}
          <div className="min-w-0 flex-1 p-3 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm sm:text-base font-semibold text-white">Good morning, Ava</p>
                <p className="hidden sm:block text-[11px] text-white/40">Here’s your workspace this month</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="hidden sm:flex items-center gap-1.5 rounded-md surface-muted px-2 py-1 text-[11px] text-white/35">
                  <Search className="h-3 w-3" /> Search ⌘K
                </span>
                <span className="flex h-6 w-6 items-center justify-center rounded-md text-white/40">
                  <Bell className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              {kpis.map((k, i) => (
                <div key={k.label} className={`surface rounded-lg sm:rounded-xl p-2.5 sm:p-3 ${i > 1 ? 'hidden lg:block' : ''}`}>
                  <p className="text-[10px] sm:text-[11px] text-white/45">{k.label}</p>
                  <p className="mt-0.5 text-base sm:text-xl font-semibold text-white">{k.value}</p>
                  <p className="text-[10px] font-medium" style={{ color: c.good }}>
                    {k.delta}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-2 sm:mt-3 grid gap-2 sm:gap-3 lg:grid-cols-[1fr_220px]">
              <div className="surface rounded-lg sm:rounded-xl p-2.5 sm:p-3">
                <p className="text-[11px] font-medium text-white/70">AI requests · 30 days</p>
                <div className="h-28 sm:h-40 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid vertical={false} stroke={c.grid} />
                      <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 9 }} tickLine={false} axisLine={false} interval={7} />
                      <YAxis tick={{ fill: c.muted, fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={compact} width={40} />
                      <Area isAnimationActive={false} type="monotone" dataKey="v" stroke={c.series[0]} strokeWidth={2} fill={c.series[0]} fillOpacity={0.12} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="hidden lg:flex surface rounded-xl p-3 flex-col">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                  <Sparkles className="h-3 w-3 text-brand-400" /> AI insight
                </p>
                <div className="mt-2 rounded-lg rounded-tr-sm bg-brand-600 px-2.5 py-1.5 text-[11px] text-white self-end">Why did usage dip on weekends?</div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/60">
                  Weekend traffic runs <span className="text-white">28% lower</span>, driven by Support templates. Weekday growth is steady at{' '}
                  <span className="text-white">+3.1%/wk</span>.
                </p>
                <span className="mt-auto inline-flex items-center gap-1 text-[10px] text-brand-400">
                  <TrendingUp className="h-3 w-3" /> Open in Data Studio
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
