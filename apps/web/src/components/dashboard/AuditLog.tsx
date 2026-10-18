import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, ScrollText, Search } from 'lucide-react';
import { seedAudit, type AuditEvent } from '@/lib/saasData';
import { downloadFile, inputClass } from '@/lib/format';
import { Avatar, Badge, Button, Card, EmptyState, Page, PageHeader } from './ui';

const CATEGORIES: { id: AuditEvent['category'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'auth', label: 'Authentication' },
  { id: 'member', label: 'Members' },
  { id: 'api', label: 'API' },
  { id: 'data', label: 'Data' },
  { id: 'billing', label: 'Billing' },
  { id: 'settings', label: 'Settings' },
];

const RANGES = [
  { id: 1, label: 'Last 24 hours' },
  { id: 7, label: 'Last 7 days' },
  { id: 30, label: 'Last 30 days' },
];

const PAGE_SIZE = 12;

export default function AuditLog() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['id']>('all');
  const [range, setRange] = useState(7);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const since = Date.now() - range * 86400_000;
    return seedAudit.filter(
      (e) =>
        (category === 'all' || e.category === category) &&
        new Date(e.at).getTime() >= since &&
        (!q || [e.actor, e.action, e.target, e.ip].some((v) => v.toLowerCase().includes(q)))
    );
  }, [category, range, query]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const exportCsv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = rows.map((e) => [e.at, e.actor, e.action, e.category, e.target, e.ip].map(esc).join(','));
    downloadFile(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, ['timestamp,actor,action,category,target,ip', ...lines].join('\n'));
  };

  const selectClass = 'h-8 rounded-lg surface-muted px-2.5 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/40';

  return (
    <Page>
      <PageHeader
        title="Audit log"
        description="A tamper-evident record of sign-ins, permission changes and admin actions."
        actions={
          <Button icon={Download} onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        }
      />

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search actor, action, IP…"
              aria-label="Search audit log"
              className={`${inputClass} pl-8 h-8 py-0`}
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as typeof category);
              setPage(0);
            }}
            aria-label="Event category"
            className={selectClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink-900">
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={range}
            onChange={(e) => {
              setRange(Number(e.target.value));
              setPage(0);
            }}
            aria-label="Date range"
            className={selectClass}
          >
            {RANGES.map((r) => (
              <option key={r.id} value={r.id} className="bg-ink-900">
                {r.label}
              </option>
            ))}
          </select>
          <span className="ml-auto text-xs text-white/40">{rows.length} events</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events found" description="Widen the date range or clear filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/40">
                  <th scope="col" className="px-5 py-2.5 font-medium">Actor</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
                  <th scope="col" className="px-3 py-2.5 font-medium hidden md:table-cell">Target</th>
                  <th scope="col" className="px-3 py-2.5 font-medium hidden lg:table-cell">IP address</th>
                  <th scope="col" className="px-5 py-2.5 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => (
                  <tr key={e.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {e.actor === 'System' ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60">⚙</span>
                        ) : (
                          <Avatar name={e.actor} size={24} />
                        )}
                        <span className="text-white/85 whitespace-nowrap">{e.actor}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`whitespace-nowrap ${e.action === 'Failed sign-in' ? 'text-rose-300' : 'text-white/80'}`}>{e.action}</span>
                        <span className="hidden sm:inline-flex"><Badge>{e.category}</Badge></span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/50 hidden md:table-cell">{e.target}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-white/40 hidden lg:table-cell">{e.ip}</td>
                    <td className="px-5 py-2.5 text-right text-xs text-white/50 whitespace-nowrap">
                      {new Date(e.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
          <span className="text-xs text-white/40">
            Page {current + 1} of {pages}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" icon={ChevronLeft} disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page" />
            <Button size="sm" variant="ghost" icon={ChevronRight} disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page" />
          </div>
        </div>
      </Card>
    </Page>
  );
}
