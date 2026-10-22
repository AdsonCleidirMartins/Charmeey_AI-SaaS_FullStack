import { useState } from 'react';
import { Check, CreditCard, Download, ExternalLink, Receipt, Sparkles } from 'lucide-react';
import { PLANS, seedInvoices, type Plan } from '@/lib/saasData';
import { currency } from '@/lib/chartTheme';
import { downloadFile } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { useWorkspace } from './WorkspaceContext';
import { Badge, Button, Card, CardHeader, Modal, Page, PageHeader } from './ui';

function Meter({ label, used, limit, unit = '' }: { label: string; used: number; limit: number; unit?: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  const warn = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="tabular-nums text-white/80">
          {used.toLocaleString()}
          {unit} <span className="text-white/35">/ {limit.toLocaleString()}{unit}</span>
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-brand-500/15" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${warn ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Billing() {
  const toast = useToast();
  const { plan, cycle, setPlan, members, messagesUsed, workspace } = useWorkspace();
  const [viewCycle, setViewCycle] = useState(cycle);
  const [changing, setChanging] = useState<Plan | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const price = (p: Plan, c = cycle) => (c === 'annual' ? p.annual : p.monthly);
  const renewal = new Date();
  renewal.setMonth(renewal.getMonth() + 1, 1);
  const seatsTotal = price(plan) * members.length;

  const invoiceText = (id: string, date: string, amount: number, desc: string) =>
    [
      'CharmeeyAI — SAMPLE INVOICE (demo data)',
      '',
      `Invoice:   ${id}`,
      `Date:      ${new Date(date).toLocaleDateString()}`,
      `Workspace: ${workspace.name}`,
      '',
      `${desc.padEnd(32)} ${currency(amount)}`,
      `${'Total'.padEnd(32)} ${currency(amount)}`,
    ].join('\n');

  return (
    <Page width="max-w-6xl">
      <PageHeader title="Billing" description="Manage your plan, payment method and invoices." />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{plan.name} plan</h2>
                <Badge tone="brand">{cycle === 'annual' ? 'Annual' : 'Monthly'}</Badge>
              </div>
              <p className="mt-1 text-sm text-white/50">
                {plan.monthly === 0
                  ? 'Free forever'
                  : `${currency(price(plan), 0)} per seat / month · ${members.length} seats · renews ${renewal.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="text-xs text-white/40">Next invoice</p>
              <p className="text-2xl font-semibold text-white">{currency(seatsTotal)}</p>
            </div>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Meter label="Messages" used={messagesUsed} limit={plan.messages} />
            <Meter label="Seats" used={members.length} limit={plan.seats} />
            <Meter label="Data Studio storage" used={1.8} limit={plan.id === 'starter' ? 1 : 25} unit=" GB" />
            <Meter label="API requests (today)" used={4120} limit={plan.id === 'starter' ? 1000 : 50000} />
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Payment method" />
          <div className="flex items-center gap-3 rounded-lg surface-muted p-3">
            <span className="flex h-9 w-12 items-center justify-center rounded-md bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-bold text-white">VISA</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Visa ending 4242</p>
              <p className="text-xs text-white/40">Expires 08 / 2028</p>
            </div>
          </div>
          <div className="mt-4 space-y-1 text-xs text-white/50">
            <p>
              Billing email: <span className="text-white/80">finance@acme.io</span>
            </p>
            <p>Acme Inc · 548 Market St, San Francisco, CA</p>
          </div>
          <div className="mt-auto pt-4">
            <Button
              className="w-full"
              icon={ExternalLink}
              onClick={() => toast({ kind: 'info', title: 'Customer portal', description: 'In production this opens the Stripe billing portal.' })}
            >
              Update payment details
            </Button>
          </div>
        </Card>
      </div>

      {/* Plans */}
      <Card>
        <CardHeader
          title="Plans"
          description="Upgrade or downgrade at any time. Changes are prorated."
          action={
            <div className="inline-flex rounded-lg surface-muted p-0.5" role="group" aria-label="Billing cycle">
              {(['monthly', 'annual'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={viewCycle === c}
                  onClick={() => setViewCycle(c)}
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    viewCycle === c ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'
                  }`}
                >
                  {c}
                  {c === 'annual' && <span className="ml-1 text-emerald-400">−20%</span>}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid gap-3 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = p.id === plan.id && viewCycle === cycle;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col rounded-xl border p-4 ${
                  p.id === 'pro' ? 'border-brand-500/40 bg-brand-500/[0.04]' : 'border-white/[0.08]'
                }`}
              >
                {p.id === 'pro' && (
                  <span className="absolute -top-2.5 left-4">
                    <Badge tone="brand">Most popular</Badge>
                  </span>
                )}
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="mt-2">
                  <span className="text-2xl font-semibold text-white">{currency(price(p, viewCycle), 0)}</span>
                  <span className="text-xs text-white/40"> / seat / mo</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-white/65">
                      <Check className="h-3.5 w-3.5 mt-px shrink-0 text-brand-400" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-4 w-full"
                  variant={current ? 'secondary' : p.id === 'pro' || p.id === 'business' ? 'primary' : 'secondary'}
                  disabled={current}
                  icon={current ? Check : p.monthly > plan.monthly ? Sparkles : undefined}
                  onClick={() => setChanging(p)}
                >
                  {current ? 'Current plan' : p.monthly > plan.monthly ? `Upgrade to ${p.name}` : p.id === plan.id ? `Switch to ${viewCycle}` : `Downgrade to ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Invoices */}
      <Card padded={false}>
        <div className="px-5 pt-5">
          <CardHeader title="Invoices" description="Download receipts for your records." />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-white/40">
                <th scope="col" className="px-5 py-2.5 font-medium">Invoice</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-3 py-2.5 font-medium hidden md:table-cell">Description</th>
                <th scope="col" className="px-3 py-2.5 font-medium text-right">Amount</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="px-5 py-2.5"><span className="sr-only">Download</span></th>
              </tr>
            </thead>
            <tbody>
              {seedInvoices.map((inv) => (
                <tr key={inv.id} className="border-t border-white/[0.05]">
                  <td className="px-5 py-3 font-mono text-xs text-white/80">{inv.id}</td>
                  <td className="px-3 py-3 text-xs text-white/60 whitespace-nowrap">
                    {new Date(inv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50 hidden md:table-cell">{inv.description}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-white/85">{currency(inv.amount)}</td>
                  <td className="px-3 py-3">
                    <Badge tone={inv.status === 'Paid' ? 'success' : inv.status === 'Open' ? 'warning' : 'neutral'}>{inv.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => downloadFile(`${inv.id}.txt`, invoiceText(inv.id, inv.date, inv.amount, inv.description), 'text/plain;charset=utf-8')}
                      className="rounded-md p-1.5 text-white/40 hover:text-white hover:bg-white/5"
                      aria-label={`Download ${inv.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {plan.id !== 'starter' && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-rose-500/20">
          <div>
            <p className="text-sm font-medium text-white">Cancel subscription</p>
            <p className="text-xs text-white/45">Your workspace moves to Starter at the end of the billing period.</p>
          </div>
          <Button variant="danger" onClick={() => setCancelOpen(true)}>
            Cancel plan
          </Button>
        </Card>
      )}

      <Modal
        open={!!changing}
        onClose={() => setChanging(null)}
        title={changing ? `Switch to ${changing.name} (${viewCycle})?` : ''}
        description={
          changing
            ? changing.monthly === 0
              ? 'You’ll lose API access, webhooks and unlimited Data Studio at the end of this period.'
              : `${currency(price(changing, viewCycle), 0)} per seat / month × ${members.length} seats = ${currency(price(changing, viewCycle) * members.length)} / month, prorated today.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setChanging(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={CreditCard}
              onClick={() => {
                if (!changing) return;
                setPlan(changing.id, viewCycle);
                toast({ kind: 'success', title: `You’re on ${changing.name}`, description: 'Sample change — no card was charged.' });
                setChanging(null);
              }}
            >
              Confirm change
            </Button>
          </>
        }
      />

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel your subscription?"
        description="You can resubscribe at any time. Data is kept for 90 days."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep plan
            </Button>
            <Button
              variant="danger"
              icon={Receipt}
              onClick={() => {
                setPlan('starter', 'monthly');
                setCancelOpen(false);
                toast({ kind: 'info', title: 'Subscription cancelled', description: 'Moved to the Starter plan.' });
              }}
            >
              Cancel subscription
            </Button>
          </>
        }
      />
    </Page>
  );
}
