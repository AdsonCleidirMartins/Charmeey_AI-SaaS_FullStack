import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, Copy, KeyRound, Plus, Send, Trash2, Webhook as WebhookIcon, BookOpen } from 'lucide-react';
import usePersistentState from '@/hooks/usePersistentState';
import { API_SCOPES, WEBHOOK_EVENTS, seedApiKeys, seedWebhooks, type ApiKey, type Webhook } from '@/lib/saasData';
import { inputClass, timeAgo } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Modal, Page, PageHeader, Toggle } from './ui';

function randomSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return 'chm_live_' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const curlExample = `curl https://api.charmeey.ai/v1/generate \\
  -H "Authorization: Bearer $CHARMEEY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Summarize Q3 revenue by region"}'`;

export default function ApiKeys() {
  const toast = useToast();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [keys, setKeys] = usePersistentState<ApiKey[]>('charmeey_api_keys', seedApiKeys);
  const [hooks, setHooks] = usePersistentState<Webhook[]>('charmeey_webhooks', seedWebhooks);

  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['chat:write']);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);

  const [hookOpen, setHookOpen] = useState(false);
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>(['chat.completed']);
  const [hookError, setHookError] = useState('');

  useEffect(() => {
    if (params.get('create')) {
      setCreateOpen(true);
      params.delete('create');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const createKey = () => {
    const s = randomSecret();
    setKeys((prev) => [
      {
        id: `k${Date.now()}`,
        name: keyName.trim(),
        prefix: s.slice(0, 13),
        scopes,
        created: new Date().toISOString(),
        lastUsed: null,
        createdBy: user?.name || 'You',
      },
      ...prev,
    ]);
    setSecret(s);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setSecret(null);
    setKeyName('');
    setScopes(['chat:write']);
    setCopied(false);
  };

  const copySecret = async () => {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  const addHook = () => {
    try {
      const u = new URL(hookUrl.trim());
      if (u.protocol !== 'https:') throw new Error();
    } catch {
      setHookError('Enter a valid https:// URL.');
      return;
    }
    if (hookEvents.length === 0) {
      setHookError('Pick at least one event.');
      return;
    }
    setHooks((prev) => [...prev, { id: `w${Date.now()}`, url: hookUrl.trim(), events: hookEvents, enabled: true, lastDelivery: null }]);
    toast({ kind: 'success', title: 'Webhook endpoint added' });
    setHookOpen(false);
    setHookUrl('');
    setHookEvents(['chat.completed']);
    setHookError('');
  };

  const testHook = (h: Webhook) => {
    const ok = h.enabled;
    setHooks((prev) => prev.map((x) => (x.id === h.id ? { ...x, lastDelivery: { status: ok ? 200 : 503, at: new Date().toISOString() } } : x)));
    toast({
      kind: ok ? 'success' : 'error',
      title: ok ? 'Test event delivered' : 'Delivery skipped',
      description: ok ? `${h.url} responded 200 OK` : 'Enable the endpoint to receive events.',
    });
  };

  return (
    <Page width="max-w-5xl">
      <PageHeader
        title="API keys"
        description="Authenticate requests to the CharmeeyAI API and receive events with webhooks."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Create key
          </Button>
        }
      />

      <Card padded={false}>
        {keys.length === 0 ? (
          <EmptyState icon={KeyRound} title="No API keys yet" description="Create a key to call the API from your own apps." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/40">
                  <th scope="col" className="px-4 sm:px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="hidden sm:table-cell px-3 py-3 font-medium">Key</th>
                  <th scope="col" className="px-3 py-3 font-medium hidden md:table-cell">Scopes</th>
                  <th scope="col" className="px-3 py-3 font-medium hidden sm:table-cell">Last used</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-t border-white/[0.05]">
                    <td className="px-4 sm:px-5 py-3">
                      <p className="font-medium text-white">{k.name}</p>
                      <p className="sm:hidden mt-0.5 font-mono text-[11px] text-white/55">{k.prefix}••••</p>
                      <p className="text-xs text-white/40">
                        Created {timeAgo(k.created)} by {k.createdBy}
                      </p>
                    </td>
                    <td className="hidden sm:table-cell px-3 py-3 font-mono text-xs text-white/60 whitespace-nowrap">{k.prefix}••••••••</td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s}>{s}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50 hidden sm:table-cell">{k.lastUsed ? timeAgo(k.lastUsed) : 'Never'}</td>
                    <td className="px-3 sm:px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setRevoking(k)} aria-label={`Revoke ${k.name}`}>
                        <span className="hidden sm:inline">Revoke</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader
            title="Webhooks"
            description="We POST signed JSON payloads to these endpoints."
            action={
              <Button size="sm" icon={Plus} onClick={() => setHookOpen(true)}>
                Add endpoint
              </Button>
            }
          />
          {hooks.length === 0 ? (
            <EmptyState icon={WebhookIcon} title="No endpoints" />
          ) : (
            <ul className="space-y-2">
              {hooks.map((h) => (
                <li key={h.id} className="rounded-lg surface-muted p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-white/85 break-all">{h.url}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {h.events.map((e) => (
                          <Badge key={e}>{e}</Badge>
                        ))}
                      </div>
                      <p className="mt-2 text-[11px] text-white/40">
                        {h.lastDelivery ? (
                          <>
                            Last delivery{' '}
                            <span className={h.lastDelivery.status < 300 ? 'text-emerald-400' : 'text-rose-400'}>
                              {h.lastDelivery.status < 300 ? '✓' : '✕'} {h.lastDelivery.status}
                            </span>{' '}
                            · {timeAgo(h.lastDelivery.at)}
                          </>
                        ) : (
                          'No deliveries yet'
                        )}
                      </p>
                    </div>
                    <Toggle
                      checked={h.enabled}
                      label={`Enable ${h.url}`}
                      onChange={(v) => setHooks((prev) => prev.map((x) => (x.id === h.id ? { ...x, enabled: v } : x)))}
                    />
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="ghost" icon={Send} onClick={() => testHook(h)}>
                      Send test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Trash2}
                      onClick={() => {
                        setHooks((prev) => prev.filter((x) => x.id !== h.id));
                        toast({ kind: 'success', title: 'Endpoint deleted' });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Quickstart" description="Make your first request" action={<BookOpen className="h-4 w-4 text-white/30" />} />
          <pre className="overflow-x-auto rounded-lg bg-black/40 border border-white/[0.06] p-3 text-[11px] leading-relaxed text-white/75 font-mono">
            {curlExample}
          </pre>
          <p className="mt-3 text-xs text-white/45">
            Keys inherit the permissions of their scopes. Store them in an environment variable — never in client-side code.
          </p>
        </Card>
      </div>

      {/* Create key */}
      <Modal
        open={createOpen}
        onClose={closeCreate}
        title={secret ? 'Save your API key' : 'Create API key'}
        description={secret ? 'This is the only time the full key is shown. Store it somewhere safe.' : 'Give the key a name and choose what it can access.'}
        footer={
          secret ? (
            <Button variant="primary" onClick={closeCreate}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={closeCreate}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!keyName.trim() || scopes.length === 0} onClick={createKey}>
                Create key
              </Button>
            </>
          )
        }
      >
        {secret ? (
          <>
            <div className="flex items-center gap-2 rounded-lg surface-muted p-2 pl-3">
              <code className="flex-1 truncate font-mono text-xs text-white/85">{secret}</code>
              <Button size="sm" icon={copied ? Check : Copy} onClick={copySecret}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Demo key — it isn’t accepted by any real API.
            </p>
          </>
        ) : (
          <>
            <Field label="Name" htmlFor="key-name">
              <input id="key-name" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="e.g. Production backend" maxLength={48} className={inputClass} />
            </Field>
            <Field label="Scopes">
              <div className="space-y-1.5">
                {API_SCOPES.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.id)}
                      onChange={() => setScopes((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                      className="mt-0.5 accent-brand-500"
                    />
                    <span>
                      <span className="block text-sm text-white">
                        {s.label} <code className="ml-1 text-[11px] text-white/40">{s.id}</code>
                      </span>
                      <span className="block text-xs text-white/45">{s.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Field>
          </>
        )}
      </Modal>

      {/* Revoke */}
      <Modal
        open={!!revoking}
        onClose={() => setRevoking(null)}
        title="Revoke API key?"
        description={`Requests using “${revoking?.name}” will fail immediately. This can’t be undone.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!revoking) return;
                setKeys((prev) => prev.filter((k) => k.id !== revoking.id));
                toast({ kind: 'success', title: 'API key revoked', description: revoking.name });
                setRevoking(null);
              }}
            >
              Revoke key
            </Button>
          </>
        }
      />

      {/* Add webhook */}
      <Modal
        open={hookOpen}
        onClose={() => {
          setHookOpen(false);
          setHookError('');
        }}
        title="Add webhook endpoint"
        footer={
          <>
            <Button variant="ghost" onClick={() => setHookOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={addHook}>
              Add endpoint
            </Button>
          </>
        }
      >
        <Field label="Endpoint URL" htmlFor="hook-url">
          <input id="hook-url" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://example.com/webhooks/charmeey" className={inputClass} />
        </Field>
        <Field label="Events">
          <div className="flex flex-wrap gap-1.5">
            {WEBHOOK_EVENTS.map((ev) => {
              const on = hookEvents.includes(ev);
              return (
                <button
                  key={ev}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setHookEvents((prev) => (on ? prev.filter((x) => x !== ev) : [...prev, ev]))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-mono transition-colors ${
                    on ? 'border-brand-500/50 bg-brand-500/10 text-brand-300' : 'border-white/10 text-white/50 hover:text-white'
                  }`}
                >
                  {ev}
                </button>
              );
            })}
          </div>
        </Field>
        {hookError && <p role="alert" className="text-xs text-rose-400">{hookError}</p>}
      </Modal>
    </Page>
  );
}
