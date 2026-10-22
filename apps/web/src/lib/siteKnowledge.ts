/**
 * Single source of truth for the floating site assistant: what the product does,
 * where things live, and which actions the assistant is allowed to offer.
 * Section names/descriptions come from the dashboard nav config and plans/FAQ
 * from the shared seed data, so the assistant can't drift from the real UI.
 */
import { NAV, NAV_GROUPS, type Section } from '@/components/dashboard/nav';
import { PLANS, faqs } from '@/lib/saasData';

// ---------------------------------------------------------------------------
// Actions — a closed whitelist. The assistant (rules or LLM) can only reference these ids.
// ---------------------------------------------------------------------------
export interface AssistantAction {
  id: string;
  label: string;
  to?: string; // route, optionally with ?query or #hash
  theme?: 'light' | 'dark';
  prompt?: string; // AI Chat handoff
}

const sectionActions: Record<string, AssistantAction> = Object.fromEntries(
  (Object.keys(NAV) as Section[]).map((s) => [s, { id: s, label: `Open ${NAV[s].label}`, to: `/dashboard/${s}` }])
);

export const ACTIONS: Record<string, AssistantAction> = {
  ...sectionActions,
  invite: { id: 'invite', label: 'Invite a teammate', to: '/dashboard/members?invite=1' },
  'create-key': { id: 'create-key', label: 'Create an API key', to: '/dashboard/api-keys?create=1' },
  'settings-profile': { id: 'settings-profile', label: 'Edit profile', to: '/dashboard/settings?tab=profile' },
  'settings-security': { id: 'settings-security', label: 'Security settings', to: '/dashboard/settings?tab=security' },
  'settings-notifications': { id: 'settings-notifications', label: 'Notification settings', to: '/dashboard/settings?tab=notifications' },
  'settings-appearance': { id: 'settings-appearance', label: 'Appearance settings', to: '/dashboard/settings?tab=appearance' },
  'settings-workspace': { id: 'settings-workspace', label: 'Workspace settings', to: '/dashboard/settings?tab=workspace' },
  signup: { id: 'signup', label: 'Create a free account', to: '/auth?mode=signup' },
  signin: { id: 'signin', label: 'Sign in', to: '/auth' },
  demo: { id: 'demo', label: 'Try the live demo', to: '/dashboard/overview' },
  pricing: { id: 'pricing', label: 'See pricing', to: '/#pricing' },
  features: { id: 'features', label: 'Browse features', to: '/#features' },
  faq: { id: 'faq', label: 'Read the FAQ', to: '/#faq' },
  'theme-dark': { id: 'theme-dark', label: 'Switch to dark', theme: 'dark' },
  'theme-light': { id: 'theme-light', label: 'Switch to light', theme: 'light' },
};

export function handoffAction(prompt: string): AssistantAction {
  return { id: 'handoff', label: 'Continue in AI Chat', to: `/dashboard/chats?prompt=${encodeURIComponent(prompt)}`, prompt };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
export interface AssistantContext {
  pathname: string;
  search: string;
  signedIn: boolean;
  isDemo: boolean;
}

export function currentSection(pathname: string): Section | null {
  const m = pathname.match(/^\/dashboard\/([^/?#]+)/);
  return m && m[1] in NAV ? (m[1] as Section) : null;
}

export function pageLabel(ctx: AssistantContext): string {
  const s = currentSection(ctx.pathname);
  if (s) return NAV[s].label;
  if (ctx.pathname.startsWith('/auth')) return ctx.search.includes('signup') ? 'Sign up' : 'Sign in';
  return 'Home';
}

// ---------------------------------------------------------------------------
// Rule-based answers for common questions: instant, consistent, and offline-safe.
// ---------------------------------------------------------------------------
interface Intent {
  id: string;
  patterns: RegExp[];
  answer: string | ((ctx: AssistantContext) => string);
  actions: string[] | ((ctx: AssistantContext) => string[]);
}

const plan = (id: 'starter' | 'pro' | 'business') => PLANS.find((p) => p.id === id)!;

// One-line orientation for "what can I do here?" on each dashboard page
const PAGE_HELP: Record<Section, string> = {
  overview: 'see this month’s requests, latency, spend and seats, finish the **Get started** checklist, and jump to recent conversations',
  chats: 'ask Gemini anything — attach files or images with 📎, dictate with 🎤, and copy or save any answer',
  templates: 'browse proven prompts by category and click **Use template** to open one in AI Chat',
  history: 'search and filter past conversations, star favourites, and reopen any of them',
  studio: 'load a sample or your own CSV, build charts, read auto insights, and ask the AI to summarize the data',
  analytics: 'track requests, model mix, latency and spend over 7/30/90 days, view any chart as a table, and export CSV',
  room: 'talk with the whole workspace in real time, or click a person to start a direct message',
  members: 'invite people, change roles, resend or revoke invites, and check seat usage and 2FA coverage',
  'api-keys': 'create scoped API keys, revoke old ones, and manage webhook endpoints',
  integrations: 'connect tools like Slack, Google Drive and GitHub, then configure syncing and notifications',
  billing: 'compare and change plans, watch usage meters, update payment details and download invoices',
  'audit-log': 'review sign-ins, permission changes and admin actions, filter by category or date, and export CSV',
  settings: 'edit your profile, password and 2FA, notification preferences, theme and workspace settings',
  support: 'read the FAQ, check system status, and open a support ticket',
};

const INTENTS: Intent[] = [
  {
    id: 'here',
    patterns: [/what (can|should) i do (here|on this page)/i, /what is this (page|section|screen)/i, /where am i/i, /what does this page do/i],
    answer: (ctx) => {
      const s = currentSection(ctx.pathname);
      if (s) return `You’re in **${NAV[s].label}** — here you can ${PAGE_HELP[s]}.`;
      return 'This is the CharmeeyAI home page. The quickest way to explore is the **live demo** — a sample workspace with every feature unlocked, no account needed.';
    },
    actions: (ctx) => {
      const s = currentSection(ctx.pathname);
      return s ? (s === 'support' ? ['overview'] : ['support']) : ['demo', 'features'];
    },
  },
  {
    id: 'greeting',
    patterns: [/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b[!. ]*$/i, /^(thanks|thank you|thx)\b/i],
    answer: 'Hi! I can explain any part of CharmeeyAI, find a setting, or take you straight to it. What are you trying to do?',
    actions: (ctx) => (ctx.pathname.startsWith('/dashboard') ? ['overview', 'support'] : ['demo', 'features']),
  },
  {
    id: 'about',
    patterns: [/what (is|does) (charmeey|this (site|app|platform|product))/i, /what can (i|you) do/i, /\bfeatures?\b/i, /how does (it|this) work/i, /\boverview\b/i],
    answer: `**CharmeeyAI** is an AI workspace for teams:

- **AI Chat** — ask Gemini with text, voice, images or files
- **Data Studio** — upload a CSV, get profiling, insights and charts
- **Analytics** — requests, tokens, latency and spend
- **Templates & History** — reusable prompts and past conversations
- **Team** — real-time Team Chat, members and roles
- **Admin** — API keys, integrations, billing and an audit log`,
    actions: (ctx) => (ctx.pathname.startsWith('/dashboard') ? ['overview', 'studio', 'chats'] : ['demo', 'features', 'pricing']),
  },
  {
    id: 'demo',
    patterns: [/without (an )?(account|sign(ing)? ?up|registering)/i, /\b(demo|try it|try (it )?out|test drive)\b/i, /do i (need|have) to sign up/i],
    answer:
      'No account needed — the **live demo** opens a sample workspace with every section unlocked and realistic sample data. Create a free account any time to keep your own work.',
    actions: ['demo', 'signup'],
  },
  {
    id: 'pricing',
    patterns: [/\b(price|prices|pricing|cost|costs|how much|free (tier|plan)|trial|paid)\b/i, /\b(which|what) plans?\b/i, /\bplans? (available|compare|comparison)\b/i],
    answer: `**Plans** (per seat, per month):

- **${plan('starter').name}** — free: ${plan('starter').features.slice(0, 2).join(', ')}
- **${plan('pro').name}** — $${plan('pro').monthly} ($${plan('pro').annual} billed annually): ${plan('pro').features.slice(0, 3).join(', ')}
- **${plan('business').name}** — $${plan('business').monthly} ($${plan('business').annual} annually): ${plan('business').features.slice(0, 3).join(', ')}
- **Enterprise** — custom pricing via sales

Pro includes a 14-day trial. Annual billing saves 20%.`,
    actions: (ctx) => (ctx.pathname.startsWith('/dashboard') ? ['billing'] : ['pricing', 'signup']),
  },
  {
    id: 'signup',
    patterns: [/\b(sign ?up|create (an |my )?account|register|get started)\b/i],
    answer:
      'Click **Get started** (top right) or use the button below. You only need your **name, work email and an 8+ character password** — no credit card.',
    actions: ['signup'],
  },
  {
    id: 'signin',
    patterns: [/\b(sign ?in|log ?in|login|forgot (my )?password|reset (my )?password)\b/i],
    answer:
      'Use **Sign in** in the top bar. Password reset isn’t enabled in this demo — create a new account, or keep exploring with the demo workspace.',
    actions: ['signin', 'demo'],
  },
  {
    id: 'studio',
    patterns: [/data ?studio/i, /\b(upload|import|analy[sz]e|visuali[sz]e|chart|graph|plot)\b.*\b(csv|tsv|data|dataset|spreadsheet|excel|file)\b/i, /\b(csv|dataset|spreadsheet)\b/i, /\b(auto[- ]?)?insights?\b/i, /summari[sz]e (my |the |this )?data/i],
    answer: `In **Data Studio**:

1. Pick a sample dataset or **drop a CSV** (up to 5 MB, processed in your browser)
2. Choose a chart type, X axis, aggregation and up to 3 measures
3. Read the **auto insights** (trend, top group, correlations, outliers)
4. Click **Ask CharmeeyAI about this data** for a written summary`,
    actions: ['studio'],
  },
  {
    id: 'chat',
    patterns: [/\bai chat\b/i, /\b(attach|image|pdf|voice|microphone|mic)\b/i, /how (do i|to) (ask|chat|talk)/i],
    answer:
      'Open **AI Chat** to talk to Gemini. You can attach images or files with the 📎 button, paste screenshots, or use the 🎤 button to dictate. Every answer can be copied or saved as Markdown.',
    actions: ['chats', 'templates'],
  },
  {
    id: 'analytics',
    patterns: [/\b(analytics|usage|latency|tokens?|spend|metrics?|kpis?|requests? per)\b/i, /\b(p50|p95|percentile)\b/i],
    answer:
      '**Analytics** shows requests by model, model mix, p50/p95 latency, daily spend, usage by feature and by teammate. Switch between 7, 30 and 90 days, toggle any chart to a table, and **Export CSV**.',
    actions: ['analytics'],
  },
  {
    id: 'templates',
    patterns: [/\btemplates?\b/i, /saved prompts?/i, /prompt library/i],
    answer: '**Templates** is a shared prompt library (analytics, engineering, marketing, support, productivity). Click **Use template** and it opens in AI Chat, ready to fill in.',
    actions: ['templates'],
  },
  {
    id: 'history',
    patterns: [/\bhistory\b/i, /(past|previous|old|earlier) (chats?|conversations?)/i, /\bstar(red)?( a| my)? (chat|conversation)/i, /\breopen\b/i],
    answer: '**History** lists past conversations grouped by date. Search, filter by tag, star favourites, and click one to reopen it in AI Chat.',
    actions: ['history'],
  },
  {
    id: 'invite',
    patterns: [/\b(invite|add) (a |my )?(team ?mate|member|colleague|user|people|someone)/i, /\bmembers?\b/i, /\b(roles?|permissions?|seats?|admin|viewer)\b/i],
    answer: `To invite people: **Members → Invite members**, enter one or more emails and pick a role.

- **Admin** — manage members, keys, integrations and billing
- **Member** — use chat, Data Studio and templates
- **Viewer** — read-only

Seats are limited by your plan; change roles from the table at any time.`,
    actions: ['invite', 'members'],
  },
  {
    id: 'api',
    patterns: [/\bapi\b/i, /\b(api )?keys?\b/i, /\bwebhooks?\b/i, /\b(rotate|revoke)\b/i, /\bdevelopers?\b/i],
    answer:
      'Go to **API Keys → Create key**, name it and choose scopes. The full key is shown **once** — copy it then. To rotate: create a new key, deploy it, then **Revoke** the old one. Webhooks (on the same page) send signed events to your https endpoint; use **Send test** to check delivery.',
    actions: ['create-key', 'api-keys'],
  },
  {
    id: 'integrations',
    patterns: [/\bintegrat/i, /\b(slack|google drive|gdrive|notion|github|snowflake|postgres|hubspot|salesforce|zapier|teams)\b/i, /\bconnect\b/i],
    answer: '**Integrations** connects Slack, Microsoft Teams, Google Drive, Notion, Snowflake, PostgreSQL, HubSpot, Salesforce, GitHub and Zapier. Click **Connect**, then **Configure** to set syncing and notifications.',
    actions: ['integrations'],
  },
  {
    id: 'billing',
    patterns: [/\b(billing|invoices?|receipts?|payment|credit card|upgrade|downgrade|cancel|change (my |the )?plans?)\b/i],
    answer:
      'In **Billing** you can compare plans (monthly or annual), **upgrade or downgrade** (prorated), see usage meters, download **invoices**, update payment details, or cancel — cancelling moves the workspace to Starter at the end of the period.',
    actions: ['billing'],
  },
  {
    id: 'security',
    patterns: [/\b(2fa|two[- ]factor|mfa|authenticator|security|sessions?|change (my )?password)\b/i],
    answer:
      'Under **Settings → Security** you can change your password, enable **two-factor authentication** with an authenticator app, and sign out other sessions.',
    actions: ['settings-security'],
  },
  {
    id: 'audit',
    patterns: [/\baudit\b/i, /who (changed|did|deleted|invited)/i],
    answer:
      'The **Audit Log** records sign-ins (including failed ones), member and role changes, API key activity, dataset uploads, billing events and settings changes — with actor, target, IP and time. Filter by category or date, search, and **Export CSV**.',
    actions: ['audit-log'],
  },
  {
    id: 'theme',
    patterns: [/\b(dark|light) (mode|theme)\b/i, /\btheme\b/i, /\bappearance\b/i],
    answer: 'Switch the theme from your **avatar menu** (top right of the dashboard) or **Settings → Appearance**. Or pick one here:',
    actions: ['theme-dark', 'theme-light', 'settings-appearance'],
  },
  {
    id: 'notifications',
    patterns: [/\bnotif/i, /\b(email|alerts?|digest)\b/i],
    answer: 'The 🔔 in the top bar shows direct messages and workspace alerts. Choose email vs in-app per event, and the activity digest, in **Settings → Notifications**.',
    actions: ['settings-notifications'],
  },
  {
    id: 'search',
    patterns: [/\b(search|find|shortcut|command palette|cmd ?k|ctrl ?k|⌘k)\b/i],
    answer: 'Press **⌘K / Ctrl+K** anywhere in the dashboard to search pages, actions (invite, create key, theme), templates and past conversations.',
    actions: ['overview'],
  },
  {
    id: 'team-chat',
    patterns: [/team ?chat/i, /\b(direct message|dm|message (a|my) (colleague|teammate))\b/i, /\bchat room\b/i],
    answer: '**Team Chat** is a real-time room for the workspace. Click a person in the member list to start a private **direct message**; new DMs show up in 🔔 notifications.',
    actions: ['room'],
  },
  {
    id: 'workspace',
    patterns: [/\bworkspaces?\b/i, /rename|switch (team|org|organization)/i, /data retention|default model/i],
    answer: 'Switch or create workspaces from the **workspace menu** at the top of the sidebar. Rename it, set the default AI model and data retention in **Settings → Workspace**.',
    actions: ['settings-workspace'],
  },
  {
    id: 'privacy',
    patterns: [/\b(privacy|train(ed|ing)? on|my data|gdpr|soc ?2|secure)\b/i],
    answer: faqs.find((f) => /train/i.test(f.q))?.a ?? 'Your data is never used for model training.',
    actions: ['support', 'faq'],
  },
  {
    id: 'support',
    patterns: [/\b(support|help desk|contact|bug|problem|issue|not working|broken|status|outage|ticket)\b/i],
    answer: '**Help & Support** has the FAQ, live system status and a ticket form (typical reply within 4 business hours).',
    actions: ['support'],
  },
];

// General tasks belong in AI Chat; the site assistant hands them off with the prompt prefilled.
const GENERAL_TASK_STRONG = [
  /\b(write|generate|create|draft|compose|fix|debug|refactor|optimi[sz]e|explain|convert|translate)\b.{0,40}\b(code|script|function|class|sql|query|regex|python|javascript|typescript|java|c\+\+|html|css|email|essay|post|article|copy|poem|story|letter)\b/i,
  /```/,
];
// Only handed off when no product intent matched (e.g. "summarize my data" belongs to Data Studio)
const GENERAL_TASK_WEAK = [/\b(summari[sz]e|translate|proofread|rewrite|paraphrase)\b/i];

export type AssistantReply =
  | { kind: 'answer'; text: string; actions: AssistantAction[] }
  | { kind: 'handoff'; text: string; actions: AssistantAction[] }
  | { kind: 'none' };

export function matchIntent(question: string, ctx: AssistantContext): AssistantReply {
  const q = question.trim();
  const handoff: AssistantReply = {
    kind: 'handoff',
    text: 'That’s a great job for **AI Chat** — it’s built for writing, code and file analysis, and keeps the conversation in your History. I’ll carry your request over:',
    actions: [handoffAction(q)],
  };
  if (GENERAL_TASK_STRONG.some((r) => r.test(q))) return handoff;
  // Score by number of matching patterns; earlier intents win ties
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    const score = intent.patterns.filter((p) => p.test(q)).length;
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  if (!best) return GENERAL_TASK_WEAK.some((r) => r.test(q)) ? handoff : { kind: 'none' };
  const { intent } = best;
  const text = typeof intent.answer === 'function' ? intent.answer(ctx) : intent.answer;
  const ids = typeof intent.actions === 'function' ? intent.actions(ctx) : intent.actions;
  return { kind: 'answer', text, actions: ids.map((id) => ACTIONS[id]).filter(Boolean) };
}

// ---------------------------------------------------------------------------
// LLM grounding
// ---------------------------------------------------------------------------
export function buildSystemPrompt(ctx: AssistantContext): string {
  const sitemap = NAV_GROUPS.map(
    (g) => `${g.label ?? 'Home'}: ${g.items.map((s) => `${NAV[s].label} (${NAV[s].description})`).join('; ')}`
  ).join('\n');
  // Kept compact: some providers reject large system prompts on free tiers
  const plans = PLANS.map((p) => `${p.name} $${p.monthly}/seat/mo ($${p.annual} annual): ${p.features.slice(0, 3).join(', ')}`).join('; ');
  const faq = faqs.map((f) => `- ${f.q} ${f.a.split('. ')[0].replace(/\.?$/, '.')}`).join('\n');
  const actionList = Object.keys(ACTIONS).join(', ');

  return `You are the CharmeeyAI site assistant: a concise, friendly guide embedded in the CharmeeyAI web app. Your only job is to help people understand and use THIS product and to take them to the right place.

PRODUCT
CharmeeyAI is an AI workspace for teams: multimodal AI chat (Gemini), Data Studio for CSV analysis and charts, usage analytics, prompt templates, conversation history, real-time team chat, and admin features (members & roles, API keys & webhooks, integrations, billing, audit log, settings). Visitors can try a live demo workspace with sample data without signing up.

SITE MAP (dashboard sidebar)
${sitemap}
Help & Support: FAQ, system status, support tickets.
Landing page sections: Features, How it works, Customers, Pricing, FAQ. Top bar: Sign in, Get started.

PLANS
${plans}; Enterprise: custom pricing via sales.

FAQ
${faq}

CURRENT CONTEXT
Page: ${pageLabel(ctx)} (${ctx.pathname})
User: ${ctx.signedIn ? 'signed in' : ctx.isDemo ? 'exploring the demo workspace' : 'visitor (not signed in)'}

RULES
- Answer in 1–4 short sentences or a short list. Use the exact UI names above. Never invent features, prices or settings that aren't listed.
- When a page or action would help, add up to 3 action tags on their own line at the end, exactly like [[action:billing]]. Allowed ids: ${actionList}.
- For general tasks unrelated to using the product (writing code, essays, analysing a user's file, trivia), say AI Chat is the right place and add [[action:handoff]].
- If you don't know, say so and suggest Help & Support with [[action:support]].`;
}

/** Pull whitelisted [[action:id]] tags out of an LLM reply. */
export function extractActions(text: string, question: string): { text: string; actions: AssistantAction[] } {
  const actions: AssistantAction[] = [];
  const clean = text.replace(/\[\[action:([a-z-]+)\]\]/gi, (_, id: string) => {
    const key = id.toLowerCase();
    const a = key === 'handoff' ? handoffAction(question) : ACTIONS[key];
    if (a && !actions.some((x) => x.id === a.id)) actions.push(a);
    return '';
  });
  return { text: clean.trim(), actions: actions.slice(0, 3) };
}

// ---------------------------------------------------------------------------
// Context-aware suggestion chips
// ---------------------------------------------------------------------------
const SECTION_SUGGESTIONS: Partial<Record<Section, string[]>> = {
  overview: ['What can I do here?', 'How do I invite a teammate?', 'Where do I see usage?'],
  chats: ['Can I attach files or images?', 'Where are my past chats?', 'How do templates work?'],
  templates: ['How do I use a template?', 'Where are my past chats?'],
  history: ['How do I reopen a conversation?', 'How do I star a chat?'],
  studio: ['How do I upload a CSV?', 'What do the auto insights mean?', 'Can AI summarize my data?'],
  analytics: ['How do I export usage?', 'What do p50 and p95 mean?', 'How is spend calculated?'],
  room: ['How do I send a direct message?', 'Where do DM notifications show?'],
  members: ['How do I invite someone?', 'What can each role do?', 'How many seats do I have?'],
  'api-keys': ['How do I rotate an API key?', 'How do webhooks work?'],
  integrations: ['Which tools can I connect?', 'How do I connect Slack?'],
  billing: ['How do I change plans?', 'How do I cancel?', 'Where are my invoices?'],
  'audit-log': ['What does the audit log record?', 'Can I export the audit log?'],
  settings: ['How do I enable 2FA?', 'How do I switch to dark mode?', 'How do I change my password?'],
  support: ['How do I contact support?', 'Is my data used for training?'],
};

export function suggestionsFor(ctx: AssistantContext): string[] {
  const s = currentSection(ctx.pathname);
  if (s && SECTION_SUGGESTIONS[s]) return SECTION_SUGGESTIONS[s]!;
  if (ctx.pathname.startsWith('/auth')) return ['Do I need an account to try it?', 'Is there a free plan?', 'Is my data used for training?'];
  return ['What is CharmeeyAI?', 'Can I try it without signing up?', 'How much does it cost?'];
}
