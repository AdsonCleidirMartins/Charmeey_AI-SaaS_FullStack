import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Upload,
  Database,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Crown,
  Link2,
  AlertTriangle,
  Hash,
  Calendar,
  Type,
  BarChart3,
  LineChart as LineIcon,
  AreaChart as AreaIcon,
  ScatterChart as ScatterIcon,
  X,
} from 'lucide-react';
import { sampleDatasets } from '@/lib/mockData';
import { aggregate, parseCsv, pearson, type Aggregation, type Dataset } from '@/lib/csv';
import { compact, useChartColors } from '@/lib/chartTheme';
import { ChartCard, ChartTooltip, DataTable, Legend } from './ChartKit';

type ChartKind = 'bar' | 'line' | 'area' | 'scatter';
const MAX_MEASURES = 3; // fixed palette slots 1–3 stay distinguishable in every chart form
const MAX_CATEGORIES = 12;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const chartKinds: { id: ChartKind; label: string; icon: typeof BarChart3 }[] = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'line', label: 'Line', icon: LineIcon },
  { id: 'area', label: 'Area', icon: AreaIcon },
  { id: 'scatter', label: 'Scatter', icon: ScatterIcon },
];

const typeIcon = { number: Hash, date: Calendar, text: Type };

interface Insight {
  icon: typeof Sparkles;
  text: string;
}

function fmt(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '—';
  return Math.abs(n) >= 10000 ? compact(n) : Number(n.toFixed(2)).toLocaleString();
}

function pickDefaults(ds: Dataset) {
  const numeric = ds.profiles.filter((p) => p.type === 'number').map((p) => p.name);
  const ordered = ds.profiles.find((p) => p.type === 'date') ?? ds.profiles.find((p) => p.type === 'text');
  return {
    x: ordered?.name ?? ds.columns[0],
    measures: numeric.slice(0, 1),
    kind: (ordered?.type === 'date' ? 'line' : 'bar') as ChartKind,
  };
}

export default function DataStudio({ onAskAI }: { onAskAI: (prompt: string) => void }) {
  const c = useChartColors();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<Dataset>(() => parseCsv(sampleDatasets[0].csv, sampleDatasets[0].name));
  const [activeSample, setActiveSample] = useState<string | null>(sampleDatasets[0].id);
  const [x, setX] = useState('');
  const [measures, setMeasures] = useState<string[]>([]);
  const [agg, setAgg] = useState<Aggregation>('sum');
  const [kind, setKind] = useState<ChartKind>('line');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  // Reset the builder whenever a new dataset is loaded
  useEffect(() => {
    const d = pickDefaults(dataset);
    setX(d.x);
    setMeasures(d.measures);
    setKind(d.kind);
    setAgg('sum');
  }, [dataset]);

  const numericCols = dataset.profiles.filter((p) => p.type === 'number').map((p) => p.name);
  const xProfile = dataset.profiles.find((p) => p.name === x);
  const scatterAllowed = xProfile?.type === 'number' && measures.length > 0;
  const effectiveKind: ChartKind = kind === 'scatter' && !scatterAllowed ? 'bar' : kind;

  const loadText = (text: string, name: string, sampleId: string | null) => {
    try {
      const ds = parseCsv(text, name);
      setDataset(ds);
      setActiveSample(sampleId);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse this file.');
    }
  };

  const loadFile = async (file: File) => {
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) {
      setError('Please upload a .csv file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Files up to 5 MB are supported in the demo.');
      return;
    }
    let text = await file.text();
    if (/\.tsv$/i.test(file.name)) text = text.replace(/\t/g, ',');
    loadText(text, file.name.replace(/\.[^.]+$/, ''), null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void loadFile(file);
  };

  const toggleMeasure = (m: string) => {
    setMeasures((prev) => {
      if (prev.includes(m)) return prev.filter((p) => p !== m);
      if (prev.length >= MAX_MEASURES) return prev;
      return [...prev, m];
    });
  };

  const { chartData, hiddenGroups } = useMemo(() => {
    if (!x || (measures.length === 0 && agg !== 'count')) return { chartData: [], hiddenGroups: 0 };
    const ms = measures.length ? measures : [];
    const rows = aggregate(dataset, x, agg === 'count' ? ['count'] : ms, agg);
    if (xProfile?.type === 'text' && rows.length > MAX_CATEGORIES) {
      return { chartData: rows.slice(0, MAX_CATEGORIES), hiddenGroups: rows.length - MAX_CATEGORIES };
    }
    return { chartData: rows, hiddenGroups: 0 };
  }, [dataset, x, measures, agg, xProfile?.type]);

  const plotted = agg === 'count' ? ['count'] : measures;
  const seriesLabel = (m: string) => (agg === 'count' ? 'Row count' : `${agg === 'avg' ? 'Avg' : 'Sum of'} ${m}`);

  const scatterData = useMemo(() => {
    if (!scatterAllowed) return [];
    return dataset.rows
      .filter((r) => typeof r[x] === 'number' && typeof r[measures[0]] === 'number')
      .slice(0, 2000)
      .map((r) => ({ x: r[x] as number, y: r[measures[0]] as number }));
  }, [dataset, x, measures, scatterAllowed]);

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = [];
    const m = plotted[0];
    if (m && chartData.length > 1) {
      const vals = chartData.map((d) => Number(d[m]));
      const total = vals.reduce((s, v) => s + v, 0);
      if (xProfile?.type !== 'text') {
        const first = vals[0];
        const last = vals[vals.length - 1];
        if (first) {
          const g = (last - first) / Math.abs(first);
          out.push({
            icon: g >= 0 ? TrendingUp : TrendingDown,
            text: `${seriesLabel(m)} ${g >= 0 ? 'grew' : 'fell'} ${Math.abs(g * 100).toFixed(1)}% from ${chartData[0][x]} to ${chartData[chartData.length - 1][x]}.`,
          });
        }
      }
      const maxIdx = vals.indexOf(Math.max(...vals));
      out.push({
        icon: Crown,
        text:
          agg === 'avg'
            ? `Highest average ${m}: ${chartData[maxIdx][x]} (${fmt(vals[maxIdx])}).`
            : `${chartData[maxIdx][x]} leads with ${fmt(vals[maxIdx])} — ${((vals[maxIdx] / total) * 100).toFixed(1)}% of the total.`,
      });
    }
    // Strongest correlation between numeric columns
    let best: { a: string; b: string; r: number } | null = null;
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const a = numericCols[i];
        const b = numericCols[j];
        const pairs = dataset.rows.filter((r) => typeof r[a] === 'number' && typeof r[b] === 'number');
        const r = pearson(pairs.map((p) => p[a] as number), pairs.map((p) => p[b] as number));
        if (!best || Math.abs(r) > Math.abs(best.r)) best = { a, b, r };
      }
    }
    if (best && Math.abs(best.r) >= 0.3) {
      const strength = Math.abs(best.r) >= 0.7 ? 'strong' : 'moderate';
      out.push({
        icon: Link2,
        text: `${strength[0].toUpperCase() + strength.slice(1)} ${best.r > 0 ? 'positive' : 'negative'} correlation between ${best.a} and ${best.b} (r = ${best.r.toFixed(2)}).`,
      });
    }
    // Outliers (|z| > 3)
    const outlierCols = dataset.profiles
      .filter((p) => p.type === 'number' && p.std)
      .map((p) => ({
        name: p.name,
        n: dataset.rows.filter((r) => typeof r[p.name] === 'number' && Math.abs(((r[p.name] as number) - p.mean!) / p.std!) > 3).length,
      }))
      .filter((o) => o.n > 0);
    if (outlierCols.length) {
      out.push({
        icon: AlertTriangle,
        text: `Possible outliers: ${outlierCols.map((o) => `${o.n} in ${o.name}`).join(', ')} (more than 3σ from the mean).`,
      });
    }
    const missing = dataset.profiles.filter((p) => p.missing > 0);
    if (missing.length) {
      out.push({
        icon: AlertTriangle,
        text: `Missing values in ${missing.map((p) => `${p.name} (${p.missing})`).join(', ')}.`,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, dataset, agg, x]);

  const askAI = () => {
    const schema = dataset.profiles
      .map((p) =>
        p.type === 'number'
          ? `- ${p.name} (number): min ${fmt(p.min)}, max ${fmt(p.max)}, mean ${fmt(p.mean)}, median ${fmt(p.median)}`
          : `- ${p.name} (${p.type}): ${p.unique} distinct values`
      )
      .join('\n');
    const head = `| ${x} | ${plotted.map(seriesLabel).join(' | ')} |\n|${' --- |'.repeat(plotted.length + 1)}\n`;
    const table =
      head +
      chartData
        .slice(0, 15)
        .map((d) => `| ${d[x]} | ${plotted.map((m) => fmt(Number(d[m]))).join(' | ')} |`)
        .join('\n');
    onAskAI(
      `Analyze this dataset and give me the top insights, risks, and recommended next steps.\n\nDataset: "${dataset.name}" — ${dataset.rows.length} rows, ${dataset.columns.length} columns.\n\nColumns:\n${schema}\n\nAggregated view (${seriesLabel(plotted[0] ?? '')} by ${x}):\n${table}\n\nAuto-detected:\n${insights.map((i) => `- ${i.text}`).join('\n')}`
    );
  };

  const axisProps = { tick: { fill: c.muted, fontSize: 11 }, tickLine: false, axisLine: { stroke: c.axis } } as const;

  const renderChart = () => {
    if (effectiveKind === 'scatter') {
      return (
        <ScatterChart margin={{ top: 8, right: 28, bottom: 4, left: -4 }}>
          <CartesianGrid stroke={c.grid} />
          <XAxis type="number" dataKey="x" name={x} {...axisProps} tickFormatter={compact} />
          <YAxis type="number" dataKey="y" name={measures[0]} {...axisProps} axisLine={false} tickFormatter={compact} width={48} />
          <Tooltip
            cursor={{ stroke: c.axis }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="rounded-lg px-3 py-2 text-xs shadow-xl" style={{ background: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, color: c.text }}>
                  <div>{x}: <b>{fmt(payload[0].payload.x)}</b></div>
                  <div>{measures[0]}: <b>{fmt(payload[0].payload.y)}</b></div>
                </div>
              ) : null
            }
          />
          <Scatter isAnimationActive={false} data={scatterData} fill={c.series[0]} fillOpacity={0.75} stroke={c.surface} strokeWidth={1} />
        </ScatterChart>
      );
    }
    const common = { data: chartData, margin: { top: 8, right: 28, bottom: 4, left: -4 } };
    const xAxis = <XAxis dataKey={x} {...axisProps} minTickGap={12} />;
    const yAxis = <YAxis {...axisProps} axisLine={false} tickFormatter={compact} width={48} />;
    const grid = <CartesianGrid vertical={false} stroke={c.grid} />;
    const tooltip = <Tooltip content={<ChartTooltip format={(v) => fmt(v)} />} cursor={effectiveKind === 'bar' ? { fill: c.grid, opacity: 0.5 } : { stroke: c.axis }} />;
    if (effectiveKind === 'bar') {
      return (
        <BarChart {...common} barGap={2} barCategoryGap="20%">
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {plotted.map((m, i) => (
            <Bar isAnimationActive={false} key={m} dataKey={m} name={seriesLabel(m)} fill={c.series[i]} radius={[4, 4, 0, 0]} maxBarSize={24} />
          ))}
        </BarChart>
      );
    }
    if (effectiveKind === 'area') {
      return (
        <AreaChart {...common}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {plotted.map((m, i) => (
            <Area isAnimationActive={false}
              key={m}
              type="monotone"
              dataKey={m}
              name={seriesLabel(m)}
              stroke={c.series[i]}
              strokeWidth={2}
              fill={c.series[i]}
              fillOpacity={0.1}
              activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      );
    }
    return (
      <LineChart {...common}>
        {grid}
        {xAxis}
        {yAxis}
        {tooltip}
        {plotted.map((m, i) => (
          <Line isAnimationActive={false}
            key={m}
            type="monotone"
            dataKey={m}
            name={seriesLabel(m)}
            stroke={c.series[i]}
            strokeWidth={2}
            dot={chartData.length <= 16 ? { r: 3, strokeWidth: 0, fill: c.series[i] } : false}
            activeDot={{ r: 4, stroke: c.surface, strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    );
  };

  const selectClass =
    'w-full rounded-lg surface-muted px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500/40 bg-transparent';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Data Studio</h1>
            <p className="text-sm text-white/50">Upload a CSV, explore it visually, and hand the findings to CharmeeyAI.</p>
          </div>
          <button
            type="button"
            onClick={askAI}
            disabled={plotted.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" />
            Ask CharmeeyAI about this data
          </button>
        </div>

        {/* Source */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div className="surface rounded-xl p-4">
            <p className="text-xs font-medium text-white/40 mb-2">Sample datasets</p>
            <div className="grid sm:grid-cols-3 gap-2">
              {sampleDatasets.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadText(s.csv, s.name, s.id)}
                  className={`text-left rounded-xl px-3 py-2.5 border transition-colors ${
                    activeSample === s.id
                      ? 'bg-brand-600/15 border-brand-500/40'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <Database className="h-3.5 w-3.5 text-brand-400" />
                    {s.name}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
              dragging ? 'border-brand-400 bg-brand-600/10' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]'
            }`}
          >
            <Upload className="h-5 w-5 text-brand-400 mb-1.5" />
            <p className="text-sm font-medium text-white">Drop a CSV or click to upload</p>
            <p className="text-xs text-white/40">Processed in your browser · up to 5 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-center justify-between rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-300">
            {error}
            <button type="button" onClick={() => setError('')} aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Dataset summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Dataset', value: dataset.name },
            { label: 'Rows', value: dataset.rows.length.toLocaleString() },
            { label: 'Columns', value: String(dataset.columns.length) },
            { label: 'Numeric columns', value: String(numericCols.length) },
          ].map((s) => (
            <div key={s.label} className="surface rounded-xl p-4 min-w-0">
              <div className="text-xs text-white/50">{s.label}</div>
              <div className="mt-1 text-lg font-semibold text-white truncate" title={s.value}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Builder + chart */}
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
          <div className="surface rounded-xl p-4 space-y-4">
            <div>
              <p className="text-xs font-medium text-white/40 mb-2">Chart type</p>
              <div className="grid grid-cols-4 gap-1.5">
                {chartKinds.map((k) => {
                  const disabled = k.id === 'scatter' && xProfile?.type !== 'number';
                  return (
                    <button
                      key={k.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setKind(k.id)}
                      title={disabled ? 'Scatter needs a numeric X axis' : k.label}
                      aria-pressed={effectiveKind === k.id}
                      className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        effectiveKind === k.id
                          ? 'bg-brand-600/15 text-brand-300 border-brand-500/40'
                          : 'text-white/50 border-white/10 hover:text-white'
                      }`}
                    >
                      <k.icon className="h-4 w-4" />
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="ds-x" className="block text-xs font-medium text-white/40 mb-1.5">
                X axis / group by
              </label>
              <select id="ds-x" value={x} onChange={(e) => setX(e.target.value)} className={selectClass}>
                {dataset.profiles.map((p) => (
                  <option key={p.name} value={p.name} className="bg-ink-900">
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ds-agg" className="block text-xs font-medium text-white/40 mb-1.5">
                Aggregation
              </label>
              <select id="ds-agg" value={agg} onChange={(e) => setAgg(e.target.value as Aggregation)} className={selectClass}>
                <option value="sum" className="bg-ink-900">Sum</option>
                <option value="avg" className="bg-ink-900">Average</option>
                <option value="count" className="bg-ink-900">Count of rows</option>
              </select>
            </div>

            <fieldset disabled={agg === 'count'} className="disabled:opacity-40">
              <legend className="text-xs font-medium text-white/40 mb-1.5">
                Measures <span className="text-white/30">(up to {MAX_MEASURES})</span>
              </legend>
              <div className="space-y-1">
                {numericCols.length === 0 && <p className="text-xs text-white/40">No numeric columns found.</p>}
                {numericCols.map((m) => {
                  const idx = measures.indexOf(m);
                  const checked = idx >= 0;
                  return (
                    <label
                      key={m}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-white/5 ${
                        !checked && measures.length >= MAX_MEASURES ? 'opacity-40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMeasure(m)}
                        className="accent-brand-500"
                      />
                      <span className="text-white/80 truncate">{m}</span>
                      {checked && (
                        <span className="ml-auto h-2.5 w-2.5 rounded-sm" style={{ background: c.series[idx] }} aria-hidden />
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <ChartCard
            title={
              effectiveKind === 'scatter'
                ? `${measures[0]} vs ${x}`
                : `${plotted.map(seriesLabel).join(', ') || 'Pick a measure'} by ${x}`
            }
            subtitle={
              hiddenGroups > 0
                ? `Showing top ${MAX_CATEGORIES} of ${MAX_CATEGORIES + hiddenGroups} groups`
                : effectiveKind === 'scatter'
                  ? `${scatterData.length.toLocaleString()} points`
                  : `${chartData.length} groups`
            }
            table={
              <DataTable
                columns={[
                  { key: x, label: x },
                  ...plotted.map((m) => ({ key: m, label: seriesLabel(m), align: 'right' as const, format: (v: unknown) => fmt(Number(v)) })),
                ]}
                rows={chartData}
                maxHeight={340}
              />
            }
          >
            {effectiveKind !== 'scatter' && plotted.length > 1 && (
              <Legend items={plotted.map((m, i) => ({ label: seriesLabel(m), color: c.series[i], line: effectiveKind !== 'bar' }))} />
            )}
            <div className="h-80">
              {plotted.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-white/40">
                  Select at least one measure to build a chart.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </div>

        {/* Insights + column profile */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4">
          <section className="surface rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-semibold text-white">Auto insights</h3>
            </div>
            {insights.length === 0 ? (
              <p className="text-sm text-white/40">Pick a measure to generate insights.</p>
            ) : (
              <ul className="space-y-2.5">
                {insights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/75">
                    <ins.icon className="h-4 w-4 mt-0.5 shrink-0 text-brand-400" />
                    {ins.text}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface rounded-xl p-5 min-w-0">
            <h3 className="text-sm font-semibold text-white mb-3">Column profile</h3>
            <div className="overflow-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-xs">
                <thead className="bg-ink-900">
                  <tr className="text-white/50">
                    {['Column', 'Type', 'Distinct', 'Missing', 'Min', 'Mean', 'Median', 'Max'].map((h, i) => (
                      <th key={h} scope="col" className={`px-3 py-2 font-medium whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.profiles.map((p) => {
                    const Icon = typeIcon[p.type];
                    return (
                      <tr key={p.name} className="border-t border-white/[0.06]">
                        <td className="px-3 py-2 text-white/80 font-medium whitespace-nowrap">{p.name}</td>
                        <td className="px-3 py-2 text-white/50">
                          <span className="inline-flex items-center gap-1">
                            <Icon className="h-3 w-3" />
                            {p.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{p.unique.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{p.missing}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{fmt(p.min)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{fmt(p.mean)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{fmt(p.median)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-white/70">{fmt(p.max)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Raw preview */}
        <ChartCard title="Data preview" subtitle={`First ${Math.min(50, dataset.rows.length)} of ${dataset.rows.length.toLocaleString()} rows`}>
          <DataTable
            columns={dataset.columns.map((col) => ({
              key: col,
              label: col,
              align: dataset.profiles.find((p) => p.name === col)?.type === 'number' ? 'right' : 'left',
              format: (v) => (v === null ? '—' : typeof v === 'number' ? v.toLocaleString() : String(v)),
            }))}
            rows={dataset.rows.slice(0, 50)}
            maxHeight={320}
          />
        </ChartCard>
      </div>
    </div>
  );
}
