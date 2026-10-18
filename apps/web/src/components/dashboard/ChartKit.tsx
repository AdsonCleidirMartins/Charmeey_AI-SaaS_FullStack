import { useState, type ReactNode } from 'react';
import { BarChart3, Table2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { useChartColors } from '@/lib/chartTheme';

/** Card wrapper with an optional chart ⇄ table toggle (the accessible view of every chart). */
export function ChartCard({
  title,
  subtitle,
  children,
  table,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  table?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  return (
    <section className={`surface rounded-xl p-5 flex flex-col min-w-0 ${className}`}>
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {table && (
            <div className="inline-flex items-center p-0.5 rounded-lg surface-muted" role="group" aria-label="View">
              {(
                [
                  { id: 'chart' as const, icon: BarChart3, label: 'Chart view' },
                  { id: 'table' as const, icon: Table2, label: 'Table view' },
                ]
              ).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-label={label}
                  aria-pressed={view === id}
                  title={label}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                    view === id ? 'bg-brand-600/20 text-brand-300' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="flex-1 min-h-0">{view === 'table' && table ? table : children}</div>
    </section>
  );
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5 text-xs text-white/60">
          <span
            className={it.line ? 'h-0.5 w-3 rounded-full' : 'h-2.5 w-2.5 rounded-sm'}
            style={{ backgroundColor: it.color }}
            aria-hidden
          />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Recharts tooltip content: values in text ink, identity carried by the swatch. */
export function ChartTooltip({
  active,
  payload,
  label,
  format = (v: number) => v.toLocaleString(),
  labelKey,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  format?: (v: number, key?: string) => string;
  labelKey?: string;
}) {
  const c = useChartColors();
  if (!active || !payload?.length) return null;
  const heading = labelKey ? String(payload[0]?.payload?.[labelKey] ?? label) : label;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-xl text-xs"
      style={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.text }}
    >
      {heading !== undefined && heading !== '' && (
        <div className="mb-1 font-medium" style={{ color: c.textSecondary }}>
          {heading}
        </div>
      )}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} aria-hidden />
          <span style={{ color: c.textSecondary }}>{p.name}</span>
          <span className="ml-auto pl-4 font-semibold tabular-nums">
            {typeof p.value === 'number' ? format(p.value, String(p.dataKey)) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Stat tile: label · value · delta vs prior period · 12-point sparkline. */
export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  trend,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: number; // fractional change, e.g. 0.12 = +12%
  upIsGood?: boolean;
  trend?: number[];
  icon?: typeof BarChart3;
}) {
  const c = useChartColors();
  const positive = (delta ?? 0) >= 0;
  const good = positive === upIsGood;
  return (
    <div className="surface rounded-xl p-4 min-w-0">
      <div className="flex items-center gap-2 text-xs text-white/50">
        {Icon && <Icon className="h-3.5 w-3.5 text-brand-400" />}
        {label}
      </div>
      {/* Value gets the full width; delta and sparkline share the row beneath so narrow tiles never truncate the number */}
      <div className="mt-2 text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">{value}</div>
      <div className="mt-1 flex items-center justify-between gap-2 min-h-[20px]">
        {delta !== undefined && (
          <div
            className="inline-flex items-center gap-0.5 text-xs font-medium whitespace-nowrap"
            style={{ color: good ? c.good : c.bad }}
          >
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {positive ? '+' : ''}
            {(delta * 100).toFixed(1)}%
            <span className="ml-1 hidden sm:inline font-normal text-white/40">vs prior</span>
          </div>
        )}
        {trend && trend.length > 1 && (
          <div className="h-7 w-14 sm:w-20 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((v, i) => ({ i, v }))} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Line type="monotone" dataKey="v" stroke={c.series[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  maxHeight = 280,
}: {
  columns: { key: string; label: string; align?: 'left' | 'right'; format?: (v: unknown) => string }[];
  rows: Record<string, unknown>[];
  maxHeight?: number;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-white/[0.06]" style={{ maxHeight }}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-ink-900">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2 font-medium text-white/50 whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-white/[0.06] hover:bg-white/[0.03]">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-white/75 whitespace-nowrap ${
                    col.align === 'right' ? 'text-right tabular-nums' : ''
                  }`}
                >
                  {col.format ? col.format(row[col.key]) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SampleDataBadge({ text = 'Sample data' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[11px] font-medium text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
      {text}
    </span>
  );
}
