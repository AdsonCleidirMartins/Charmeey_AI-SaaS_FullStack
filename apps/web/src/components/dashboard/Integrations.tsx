import { useMemo, useState } from 'react';
import { Check, Loader2, Search, Settings2, Puzzle } from 'lucide-react';
import usePersistentState from '@/hooks/usePersistentState';
import { integrationsCatalog, seedConnected, type Integration } from '@/lib/saasData';
import { inputClass } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, Card, EmptyState, Modal, Page, PageHeader, Tabs, Toggle } from './ui';

const CATEGORIES = ['All', 'Communication', 'Storage', 'Data', 'CRM', 'Developer', 'Automation'] as const;
type Category = (typeof CATEGORIES)[number];

function Logo({ i, size = 40 }: { i: Integration; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
      style={{ width: size, height: size, background: i.color, fontSize: size * 0.42, color: '#fff' }}
      aria-hidden
    >
      {i.letter}
    </span>
  );
}

export default function Integrations() {
  const toast = useToast();
  const [connected, setConnected] = usePersistentState<string[]>('charmeey_integrations', seedConnected);
  const [category, setCategory] = useState<Category>('All');
  const [view, setView] = useState<'all' | 'connected'>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [settings, setSettings] = usePersistentState<Record<string, { sync: boolean; notify: boolean }>>('charmeey_integration_settings', {});

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return integrationsCatalog.filter(
      (i) =>
        (category === 'All' || i.category === category) &&
        (view === 'all' || connected.includes(i.id)) &&
        (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    );
  }, [category, view, query, connected]);

  const connect = (i: Integration) => {
    setPending(i.id);
    // Simulate the OAuth round-trip
    window.setTimeout(() => {
      setConnected((prev) => [...prev, i.id]);
      setPending(null);
      toast({ kind: 'success', title: `${i.name} connected`, description: 'You can configure it any time.' });
    }, 900);
  };

  const disconnect = (i: Integration) => {
    setConnected((prev) => prev.filter((x) => x !== i.id));
    setConfiguring(null);
    toast({ kind: 'info', title: `${i.name} disconnected` });
  };

  const cfg = configuring ? settings[configuring.id] ?? { sync: true, notify: false } : null;

  return (
    <Page>
      <PageHeader title="Integrations" description="Connect CharmeeyAI to the tools your team already uses." />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Tabs
          value={view}
          onChange={setView}
          tabs={[
            { id: 'all', label: 'Browse', count: integrationsCatalog.length },
            { id: 'connected', label: 'Connected', count: connected.length },
          ]}
        />
        <div className="relative mb-2 w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search integrations" aria-label="Search integrations" className={`${inputClass} pl-8 h-8 py-0`} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              category === c ? 'border-brand-500/40 bg-brand-500/10 text-brand-300' : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={Puzzle} title="No integrations match" description="Try another category or search term." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const isOn = connected.includes(i.id);
            return (
              <Card key={i.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Logo i={i} />
                  {isOn ? (
                    <Badge tone="success" dot>
                      Connected
                    </Badge>
                  ) : (
                    <Badge>{i.category}</Badge>
                  )}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{i.name}</h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-white/50">{i.description}</p>
                <div className="mt-4">
                  {isOn ? (
                    <Button size="sm" icon={Settings2} className="w-full" onClick={() => setConfiguring(i)}>
                      Configure
                    </Button>
                  ) : (
                    <Button size="sm" variant="primary" className="w-full" disabled={pending === i.id} onClick={() => connect(i)}>
                      {pending === i.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
                        </>
                      ) : (
                        'Connect'
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!configuring}
        onClose={() => setConfiguring(null)}
        title={configuring ? `${configuring.name} settings` : ''}
        description="Connected by Ava Thompson · Acme Inc"
        footer={
          configuring && (
            <>
              <Button variant="danger" className="mr-auto" onClick={() => disconnect(configuring)}>
                Disconnect
              </Button>
              <Button
                variant="primary"
                icon={Check}
                onClick={() => {
                  setConfiguring(null);
                  toast({ kind: 'success', title: 'Settings saved' });
                }}
              >
                Done
              </Button>
            </>
          )
        }
      >
        {configuring && cfg && (
          <div className="space-y-3">
            {(
              [
                { key: 'sync', label: 'Sync automatically', desc: 'Pull new content every 15 minutes.' },
                { key: 'notify', label: 'Post notifications', desc: 'Send usage alerts and summaries to this integration.' },
              ] as const
            ).map((row) => (
              <div key={row.key} className="flex items-start justify-between gap-4 rounded-lg surface-muted p-3">
                <div>
                  <p className="text-sm font-medium text-white">{row.label}</p>
                  <p className="text-xs text-white/45">{row.desc}</p>
                </div>
                <Toggle
                  checked={cfg[row.key]}
                  label={row.label}
                  onChange={(v) => setSettings((prev) => ({ ...prev, [configuring.id]: { ...cfg, [row.key]: v } }))}
                />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Page>
  );
}
