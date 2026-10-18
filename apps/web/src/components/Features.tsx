import type { ReactNode } from 'react';
import {
  Database,
  MessageSquareText,
  BarChart3,
  LayoutTemplate,
  Users,
  ShieldCheck,
  Code2,
  Sparkles,
  TrendingUp,
  Check,
} from 'lucide-react';
import { useChartColors } from '@/lib/chartTheme';
import { Avatar } from '@/components/dashboard/ui';
import SectionHeader from '@/components/landing/SectionHeader';

function Tile({
  icon: Icon,
  title,
  description,
  children,
  className = '',
}: {
  icon: typeof Database;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article className={`surface rounded-2xl p-5 sm:p-6 flex flex-col overflow-hidden ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10">
        <Icon className="h-4 w-4 text-brand-400" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/55">{description}</p>
      {children && <div className="mt-5 flex-1 flex flex-col justify-end">{children}</div>}
    </article>
  );
}

const revenue = [50, 53, 56, 65, 65, 66, 69, 72, 71]; // $K by month (sample)
const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S'];

export default function Features() {
  const c = useChartColors();
  const max = Math.max(...revenue);

  return (
    <section id="features" className="relative py-14 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Platform"
          title="Everything your team needs to work with AI"
          description="One workspace for questions, analysis and administration — no more stitching five tools together."
        />

        <div className="mt-12 sm:mt-16 grid gap-4 md:grid-cols-6">
          {/* Data Studio */}
          <Tile
            className="md:col-span-4"
            icon={Database}
            title="Data Studio"
            description="Drop in a CSV and get column profiles, trends, correlations and outliers — then build bar, line, area or scatter charts in clicks."
          >
            <div className="rounded-xl surface-muted p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white/75">Revenue by month</span>
                <span className="text-white/40">$K</span>
              </div>
              <div className="mt-3 flex h-28 items-end gap-1.5 sm:gap-2.5">
                {revenue.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      className="w-full max-w-[24px] rounded-t"
                      style={{ height: `${(v / max) * 96}px`, background: c.series[0], opacity: i === revenue.length - 2 ? 1 : 0.55 }}
                    />
                    <span className="text-[10px] text-white/35">{months[i]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] text-brand-300">
                <Sparkles className="h-3 w-3" /> Revenue grew 40.9% — August peaked at $71.6K
              </p>
            </div>
          </Tile>

          {/* AI Chat */}
          <Tile
            className="md:col-span-2"
            icon={MessageSquareText}
            title="Multimodal AI chat"
            description="Ask Gemini with text, voice, images or files. Save, copy and revisit every answer."
          >
            <div className="space-y-2">
              <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-tr-md bg-brand-600 px-3 py-2 text-xs text-white">
                Summarize this invoice PDF
              </div>
              <div className="w-fit max-w-[90%] rounded-2xl rounded-tl-md surface-muted px-3 py-2 text-xs text-white/70">
                Total <span className="text-white">$4,820</span>, due Nov 1. Two line items changed vs last month.
              </div>
            </div>
          </Tile>

          {/* Analytics */}
          <Tile
            className="md:col-span-2"
            icon={BarChart3}
            title="Usage analytics"
            description="Requests, tokens, latency and spend by model, feature and teammate."
          >
            <div className="rounded-xl surface-muted p-3">
              <p className="text-[11px] text-white/45">Requests · 30d</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-xl font-semibold text-white">95.2K</p>
                <svg viewBox="0 0 100 32" className="h-8 w-24" aria-hidden>
                  <path d="M0 26 L12 22 L24 24 L36 16 L48 18 L60 12 L72 14 L84 7 L100 4" fill="none" stroke={c.series[0]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: c.good }}>
                <TrendingUp className="h-3 w-3" /> +12.8% vs prior
              </p>
            </div>
          </Tile>

          {/* Templates */}
          <Tile className="md:col-span-2" icon={LayoutTemplate} title="Prompt templates" description="A shared library of proven prompts. One click starts a chat.">
            <div className="flex flex-wrap gap-1.5">
              {['Executive summary', 'SQL builder', 'Weekly KPI report', 'Support reply', 'Code review'].map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/65">
                  {t}
                </span>
              ))}
            </div>
          </Tile>

          {/* Team */}
          <Tile className="md:col-span-2" icon={Users} title="Team & roles" description="Invite teammates, set Owner, Admin, Member or Viewer roles and chat in real time.">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {['Ava Thompson', 'Marcus Lee', 'Priya Nair', 'Diego Alvarez', 'Hana Sato'].map((n) => (
                  <span key={n} className="rounded-full ring-2 ring-[#13131a]">
                    <Avatar name={n} size={30} />
                  </span>
                ))}
              </div>
              <span className="text-xs text-white/45">+19 seats</span>
            </div>
          </Tile>

          {/* Security */}
          <Tile
            className="md:col-span-3"
            icon={ShieldCheck}
            title="Secure by default"
            description="Hashed passwords, expiring sessions, two-factor sign-in and a searchable audit log of every admin action."
          >
            <ul className="space-y-1.5 text-xs">
              {[
                ['Marcus Lee', 'Created API key', '2m ago'],
                ['Ava Thompson', 'Enabled 2FA enforcement', '1h ago'],
                ['System', 'Payment succeeded', '6h ago'],
              ].map(([who, what, when]) => (
                <li key={what} className="flex items-center gap-2 rounded-lg surface-muted px-3 py-2">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span className="text-white/75 truncate">
                    <span className="text-white">{who}</span> · {what}
                  </span>
                  <span className="ml-auto text-white/35 shrink-0">{when}</span>
                </li>
              ))}
            </ul>
          </Tile>

          {/* Developers */}
          <Tile
            className="md:col-span-3"
            icon={Code2}
            title="API, webhooks & integrations"
            description="Scoped API keys, signed webhooks, and connectors for Slack, Google Drive, GitHub, Snowflake and more."
          >
            <pre className="overflow-x-auto rounded-lg bg-black/40 border border-white/[0.06] p-3 text-[11px] leading-relaxed text-white/70 font-mono">
              <span className="text-brand-300">curl</span> api.charmeey.ai/v1/generate \{'\n'}  -H <span className="text-emerald-300">"Authorization: Bearer chm_live_…"</span> \{'\n'}  -d <span className="text-emerald-300">'{'{'}"prompt": "Top 3 churn drivers?"{'}'}'</span>
            </pre>
          </Tile>
        </div>
      </div>
    </section>
  );
}
