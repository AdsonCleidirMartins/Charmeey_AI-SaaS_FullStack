import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';
import { Activity, Coins, Download, Gauge, Hash } from 'lucide-react';
import { MODELS, usageHistory, featureUsage, topTemplates, teamMembers, type UsageDay } from '@/lib/mockData';
import { compact, currency, useChartColors } from '@/lib/chartTheme';
import { ChartCard, ChartTooltip, DataTable, Legend, SampleDataBadge, StatTile } from './ChartKit';

const RANGES = [
  { id: 7, label: '7D' },
  { id: 30, label: '30D' },
  { id: 90, label: '90D' },
] as const;

function sum(days: UsageDay[], pick: (d: UsageDay) => number) {
  return days.reduce((s, d) => s + pick(d), 0);
}

function change(cur: number, prev: number) {
  return prev === 0 ? 0 : (cur - prev) / prev;
}

function downloadCsv(days: UsageDay[]) {
  const header = ['date', ...MODELS, 'total_requests', 'tokens', 'cost_usd', 'p50_ms', 'p95_ms', 'errors'];
  const lines = days.map((d) =>
    [d.date, ...MODELS.map((m) => d.requests[m]), d.totalRequests, d.tokens, d.cost.toFixed(2), d.p50, d.p95, d.errors].join(',')
  );
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `charmeeyai-usage-${days.length}d.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const c = useChartColors();
  const [range, setRange] = useState<number>(30);

  const { current, previous } = useMemo(() => {
    const n = usageHistory.length;
    return {
      current: usageHistory.slice(n - range),
      previous: usageHistory.slice(n - range * 2, n - range),
    };
  }, [range]);

  const kpis = useMemo(() => {
    const req = sum(current, (d) => d.totalRequests);
    const tok = sum(current, (d) => d.tokens);
    const cost = sum(current, (d) => d.cost);
    const p50 = sum(current, (d) => d.p50) / current.length;
    const prevReq = sum(previous, (d) => d.totalRequests);
    const prevTok = sum(previous, (d) => d.tokens);
    const prevCost = sum(previous, (d) => d.cost);
    const prevP50 = sum(previous, (d) => d.p50) / previous.length;
    // Sparkline: 12 evenly spaced buckets of the current range
    const bucket = (pick: (d: UsageDay) => number) => {
      const size = Math.max(1, Math.floor(current.length / 12));
      const out: number[] = [];
      for (let i = 0; i + size <= current.length; i += size) out.push(sum(current.slice(i, i + size), pick) / size);
      return out.slice(-12);
    };
    return {
      req, tok, cost, p50,
      dReq: change(req, prevReq),
      dTok: change(tok, prevTok),
      dCost: change(cost, prevCost),
      dP50: change(p50, prevP50),
      tReq: bucket((d) => d.totalRequests),
      tTok: bucket((d) => d.tokens),
      tCost: bucket((d) => d.cost),
      tP50: bucket((d) => d.p50),
    };
  }, [current, previous]);

  const series = useMemo(
    () => current.map((d) => ({ label: d.label, ...d.requests, p50: d.p50, p95: d.p95, cost: d.cost })),
    [current]
  );

  const modelShare = useMemo(
    () => MODELS.map((m) => ({ name: m, value: sum(current, (d) => d.requests[m]) })),
    [current]
  );
  const shareTotal = modelShare.reduce((s, m) => s + m.value, 0);

  const axisProps = {
    tick: { fill: c.muted, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: c.axis },
  } as const;
  const tickInterval = range === 7 ? 0 : range === 30 ? 4 : 14;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header + filters (one row) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Usage analytics</h1>
              <SampleDataBadge />
            </div>
            <p className="text-sm text-white/50">Requests, tokens, latency and spend across your workspace.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center p-1 rounded-lg surface-muted" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  aria-pressed={range === r.id}
                  className={`px-3 h-7 rounded-md text-xs font-medium transition-colors ${
                    range === r.id ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => downloadCsv(current)}
              className="inline-flex items-center gap-1.5 h-9 rounded-lg surface-muted px-3 text-xs font-medium text-white/70 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          <StatTile icon={Activity} label="Requests" value={compact(kpis.req)} delta={kpis.dReq} trend={kpis.tReq} />
          <StatTile icon={Hash} label="Tokens processed" value={compact(kpis.tok)} delta={kpis.dTok} trend={kpis.tTok} />
          <StatTile
            icon={Gauge}
            label="Median latency"
            value={`${Math.round(kpis.p50)} ms`}
            delta={kpis.dP50}
            upIsGood={false}
            trend={kpis.tP50}
          />
          <StatTile icon={Coins} label="Spend" value={currency(kpis.cost)} delta={kpis.dCost} upIsGood={false} trend={kpis.tCost} />
        </div>

        {/* Requests by model + model share */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ChartCard
            className="xl:col-span-2"
            title="Requests by model"
            subtitle={`Daily requests, last ${range} days`}
            table={
              <DataTable
                columns={[
                  { key: 'label', label: 'Date' },
                  ...MODELS.map((m) => ({ key: m, label: m, align: 'right' as const, format: (v: unknown) => Number(v).toLocaleString() })),
                ]}
                rows={[...series].reverse()}
              />
            }
          >
            <Legend items={MODELS.map((m, i) => ({ label: m, color: c.series[i], line: true }))} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={c.grid} />
                  <XAxis dataKey="label" {...axisProps} interval={tickInterval} minTickGap={8} />
                  <YAxis {...axisProps} axisLine={false} tickFormatter={compact} width={44} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: c.axis, strokeWidth: 1 }} />
                  {MODELS.map((m, i) => (
                    <Line isAnimationActive={false}
                      key={m}
                      type="monotone"
                      dataKey={m}
                      name={m}
                      stroke={c.series[i]}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Model mix"
            subtitle="Share of requests"
            table={
              <DataTable
                columns={[
                  { key: 'name', label: 'Model' },
                  { key: 'value', label: 'Requests', align: 'right', format: (v) => Number(v).toLocaleString() },
                  { key: 'pct', label: 'Share', align: 'right' },
                ]}
                rows={modelShare.map((m) => ({ ...m, pct: `${((m.value / shareTotal) * 100).toFixed(1)}%` }))}
              />
            }
          >
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelShare}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={1}
                    stroke={c.surface}
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {modelShare.map((m, i) => (
                      <Cell key={m.name} fill={c.series[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold text-white">{compact(shareTotal)}</span>
                <span className="text-[11px] text-white/40">requests</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {modelShare.map((m, i) => (
                <li key={m.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.series[i] }} aria-hidden />
                  <span className="text-white/60">{m.name}</span>
                  <span className="ml-auto font-medium text-white tabular-nums">
                    {((m.value / shareTotal) * 100).toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>

        {/* Latency + spend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title="Response latency"
            subtitle="p50 and p95, milliseconds"
            table={
              <DataTable
                columns={[
                  { key: 'label', label: 'Date' },
                  { key: 'p50', label: 'p50 (ms)', align: 'right' },
                  { key: 'p95', label: 'p95 (ms)', align: 'right' },
                ]}
                rows={[...series].reverse()}
              />
            }
          >
            <Legend
              items={[
                { label: 'p50', color: c.series[0], line: true },
                { label: 'p95', color: c.series[1], line: true },
              ]}
            />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid vertical={false} stroke={c.grid} />
                  <XAxis dataKey="label" {...axisProps} interval={tickInterval} minTickGap={8} />
                  <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={(v) => `${v}`} />
                  <Tooltip content={<ChartTooltip format={(v) => `${v} ms`} />} cursor={{ stroke: c.axis, strokeWidth: 1 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="p50" name="p50" stroke={c.series[0]} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} />
                  <Line isAnimationActive={false} type="monotone" dataKey="p95" name="p95" stroke={c.series[1]} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Daily spend"
            subtitle="USD, all models"
            table={
              <DataTable
                columns={[
                  { key: 'label', label: 'Date' },
                  { key: 'cost', label: 'Spend', align: 'right', format: (v) => currency(Number(v)) },
                ]}
                rows={[...series].reverse()}
              />
            }
          >
            <div className="h-[248px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke={c.grid} />
                  <XAxis dataKey="label" {...axisProps} interval={tickInterval} minTickGap={8} />
                  <YAxis {...axisProps} axisLine={false} width={44} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<ChartTooltip format={(v) => currency(v)} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar isAnimationActive={false} dataKey="cost" name="Spend" fill={c.series[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Feature usage + top templates + team */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <ChartCard
            title="Requests by feature"
            subtitle="All time"
            table={
              <DataTable
                columns={[
                  { key: 'feature', label: 'Feature' },
                  { key: 'requests', label: 'Requests', align: 'right', format: (v) => Number(v).toLocaleString() },
                ]}
                rows={featureUsage}
              />
            }
          >
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureUsage} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="feature" {...axisProps} axisLine={false} width={92} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                  <Bar isAnimationActive={false} dataKey="requests" name="Requests" fill={c.series[0]} radius={[0, 4, 4, 0]} barSize={18}>
                    <LabelList dataKey="requests" position="right" formatter={compact} fill={c.textSecondary} fontSize={11} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Top templates" subtitle="Most-run prompt templates">
            <DataTable
              columns={[
                { key: 'name', label: 'Template' },
                { key: 'runs', label: 'Runs', align: 'right', format: (v) => Number(v).toLocaleString() },
                { key: 'rating', label: 'Rating', align: 'right', format: (v) => `${v} ★` },
              ]}
              rows={topTemplates}
            />
          </ChartCard>

          <ChartCard title="Team usage" subtitle="Requests per member, this month">
            <ul className="space-y-3">
              {teamMembers.map((m) => {
                const pct = (m.requests / teamMembers[0].requests) * 100;
                return (
                  <li key={m.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/80">
                        {m.name} <span className="text-white/40">· {m.role}</span>
                      </span>
                      <span className="text-white/60 tabular-nums">{m.requests.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.series[0] }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
