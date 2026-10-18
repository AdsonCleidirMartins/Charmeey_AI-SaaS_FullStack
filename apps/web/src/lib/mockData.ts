/**
 * Deterministic mock data for the dashboard (portfolio demo). A seeded PRNG
 * keeps numbers stable between reloads so screenshots stay consistent.
 */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Usage analytics
// ---------------------------------------------------------------------------
export const MODELS = ['Gemini 3.5 Flash', 'Gemini 1.5 Pro', 'GPT-4o mini'] as const;
export type ModelName = (typeof MODELS)[number];

export interface UsageDay {
  date: string; // ISO yyyy-mm-dd
  label: string; // e.g. "Oct 12"
  requests: Record<ModelName, number>;
  totalRequests: number;
  tokens: number;
  cost: number;
  p50: number;
  p95: number;
  errors: number;
}

const COST_PER_1K: Record<ModelName, number> = {
  'Gemini 3.5 Flash': 0.00035,
  'Gemini 1.5 Pro': 0.0035,
  'GPT-4o mini': 0.0006,
};

function buildUsage(days: number): UsageDay[] {
  const rand = mulberry32(42);
  const out: UsageDay[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const progress = (days - i) / days; // steady growth
    const weekend = d.getDay() === 0 || d.getDay() === 6 ? 0.72 : 1;
    const base = (1400 + 2200 * progress) * weekend;
    const flash = Math.round(base * (0.58 + rand() * 0.08));
    const pro = Math.round(base * (0.18 + rand() * 0.05));
    const mini = Math.round(base * (0.14 + rand() * 0.05) * (0.6 + progress * 0.6));
    const requests = { 'Gemini 3.5 Flash': flash, 'Gemini 1.5 Pro': pro, 'GPT-4o mini': mini };
    const totalRequests = flash + pro + mini;
    const avgTokens = 820 + rand() * 260;
    const tokens = Math.round(totalRequests * avgTokens);
    const cost = (Object.keys(requests) as ModelName[]).reduce(
      (sum, m) => sum + (requests[m] * avgTokens * COST_PER_1K[m]) / 1000,
      0
    );
    const p50 = Math.round(380 + rand() * 90 - progress * 60);
    out.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      requests,
      totalRequests,
      tokens,
      cost,
      p50,
      p95: Math.round(p50 * (2.1 + rand() * 0.5)),
      errors: Math.round(totalRequests * (0.004 + rand() * 0.006)),
    });
  }
  return out;
}

/** 180 days of history; slice for 7/30/90 day ranges plus the comparison period. */
export const usageHistory = buildUsage(180);

export const featureUsage = [
  { feature: 'AI Chat', requests: 48210 },
  { feature: 'Data Studio', requests: 21480 },
  { feature: 'Templates', requests: 15930 },
  { feature: 'Embeddings', requests: 9820 },
  { feature: 'File analysis', requests: 6140 },
];

export const topTemplates = [
  { name: 'Executive summary', runs: 3842, rating: 4.8, avgTokens: 1240 },
  { name: 'SQL query builder', runs: 2915, rating: 4.7, avgTokens: 680 },
  { name: 'Customer reply (support)', runs: 2480, rating: 4.6, avgTokens: 540 },
  { name: 'Weekly KPI report', runs: 1966, rating: 4.9, avgTokens: 1580 },
  { name: 'Blog post outline', runs: 1420, rating: 4.4, avgTokens: 960 },
];

export const teamMembers = [
  { name: 'Ava Thompson', role: 'Admin', requests: 12480, tokens: 10.4e6 },
  { name: 'Marcus Lee', role: 'Analyst', requests: 9820, tokens: 8.9e6 },
  { name: 'Priya Nair', role: 'Developer', requests: 8610, tokens: 9.7e6 },
  { name: 'Diego Alvarez', role: 'Marketing', requests: 5240, tokens: 3.8e6 },
  { name: 'Hana Sato', role: 'Support', requests: 4130, tokens: 2.6e6 },
];

// ---------------------------------------------------------------------------
// Conversation history
// ---------------------------------------------------------------------------
export interface HistoryItem {
  id: number;
  title: string;
  preview: string;
  model: string;
  messages: number;
  tag: 'Analysis' | 'Code' | 'Content' | 'Support' | 'Research';
  updatedAt: string; // ISO
  starred?: boolean;
  transcript: { role: 'user' | 'ai'; content: string }[];
}

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export const conversationHistory: HistoryItem[] = [
  {
    id: 1,
    title: 'Q3 revenue breakdown by region',
    preview: 'North America grew 14% QoQ while EMEA flattened…',
    model: 'gemini-3.5-flash',
    messages: 12,
    tag: 'Analysis',
    updatedAt: daysAgo(0, 9),
    starred: true,
    transcript: [
      { role: 'user', content: 'Break down Q3 revenue by region and highlight anything unusual.' },
      {
        role: 'ai',
        content:
          '## Q3 revenue by region\n\n| Region | Revenue | QoQ |\n|---|---|---|\n| North America | $1.82M | ▲ 14.2% |\n| EMEA | $1.10M | ▲ 0.8% |\n| APAC | $0.74M | ▲ 21.5% |\n| LATAM | $0.31M | ▼ 3.4% |\n\n**Unusual:** APAC growth is driven by a single enterprise deal (≈$96K). Excluding it, APAC grew 8%.',
      },
    ],
  },
  {
    id: 2,
    title: 'Refactor auth middleware to FastAPI dependencies',
    preview: 'Use Depends(get_current_user) instead of parsing headers…',
    model: 'gpt-4o-mini',
    messages: 8,
    tag: 'Code',
    updatedAt: daysAgo(0, 7),
    transcript: [
      { role: 'user', content: 'How do I turn my header parsing into a reusable FastAPI dependency?' },
      {
        role: 'ai',
        content:
          'Create a dependency and inject it:\n\n```python\ndef get_current_user(authorization: str | None = Header(None), db = Depends(get_db)):\n    user = resolve_user(db, authorization)\n    if not user:\n        raise HTTPException(401, "Not authenticated")\n    return user\n\n@app.get("/me")\ndef me(user = Depends(get_current_user)):\n    return user\n```',
      },
    ],
  },
  {
    id: 3,
    title: 'Launch email for Data Studio',
    preview: 'Subject: Your spreadsheets just learned to talk…',
    model: 'gemini-3.5-flash',
    messages: 6,
    tag: 'Content',
    updatedAt: daysAgo(1, 16),
    starred: true,
    transcript: [
      { role: 'user', content: 'Write a short launch email for our new Data Studio feature.' },
      {
        role: 'ai',
        content:
          '**Subject:** Your spreadsheets just learned to talk\n\nUpload a CSV, ask a question in plain English, and get a chart plus a summary in seconds. Data Studio is live for all Pro workspaces today.\n\n[Try Data Studio →]',
      },
    ],
  },
  {
    id: 4,
    title: 'Churn drivers from support tickets',
    preview: 'Top 3 themes: billing confusion, slow exports, SSO…',
    model: 'gemini-1.5-pro',
    messages: 15,
    tag: 'Analysis',
    updatedAt: daysAgo(2, 11),
    transcript: [
      { role: 'user', content: 'Cluster last month’s support tickets and tell me what drives churn.' },
      {
        role: 'ai',
        content:
          '1. **Billing confusion** (31% of tickets) — prorated charges are unclear\n2. **Slow exports** (22%) — CSV exports over 50K rows time out\n3. **SSO setup** (17%) — Okta SCIM mapping errors\n\nAccounts with 2+ billing tickets churn at **3.4×** the baseline rate.',
      },
    ],
  },
  {
    id: 5,
    title: 'Reply to enterprise billing question',
    preview: 'Thanks for reaching out — annual plans are invoiced…',
    model: 'gemini-3.5-flash',
    messages: 4,
    tag: 'Support',
    updatedAt: daysAgo(3, 14),
    transcript: [
      { role: 'user', content: 'Draft a polite reply explaining how annual invoicing works.' },
      {
        role: 'ai',
        content:
          'Hi Jordan,\n\nThanks for reaching out! Annual plans are invoiced up front on your renewal date. Added seats are prorated and appear on your next invoice.\n\nHappy to set up a quick call if that helps.\n\n— The CharmeeyAI team',
      },
    ],
  },
  {
    id: 6,
    title: 'Vector DB comparison for RAG',
    preview: 'pgvector vs. Pinecone vs. Qdrant on cost and recall…',
    model: 'gemini-1.5-pro',
    messages: 10,
    tag: 'Research',
    updatedAt: daysAgo(5, 10),
    transcript: [
      { role: 'user', content: 'Compare pgvector, Pinecone and Qdrant for a 5M-vector RAG workload.' },
      {
        role: 'ai',
        content:
          '| | pgvector | Pinecone | Qdrant |\n|---|---|---|---|\n| Hosting | Self / managed PG | Managed | Self / cloud |\n| Recall@10 (HNSW) | 0.95 | 0.96 | 0.97 |\n| Est. monthly cost | $ | $$$ | $$ |\n\nIf you already run PostgreSQL, **pgvector** is the simplest path.',
      },
    ],
  },
  {
    id: 7,
    title: 'SQL: weekly active users by plan',
    preview: 'SELECT date_trunc(\'week\', created_at) AS week…',
    model: 'gpt-4o-mini',
    messages: 5,
    tag: 'Code',
    updatedAt: daysAgo(8, 15),
    transcript: [
      { role: 'user', content: 'Write SQL for weekly active users grouped by plan.' },
      {
        role: 'ai',
        content:
          "```sql\nSELECT date_trunc('week', e.created_at) AS week,\n       u.plan,\n       COUNT(DISTINCT e.user_id) AS wau\nFROM events e\nJOIN users u ON u.id = e.user_id\nGROUP BY 1, 2\nORDER BY 1, 2;\n```",
      },
    ],
  },
  {
    id: 8,
    title: 'Competitive landscape: AI analytics tools',
    preview: 'Positioning against BI tools with bolt-on AI…',
    model: 'gemini-3.5-flash',
    messages: 9,
    tag: 'Research',
    updatedAt: daysAgo(12, 9),
    transcript: [
      { role: 'user', content: 'Summarize the competitive landscape for AI-native analytics tools.' },
      {
        role: 'ai',
        content:
          'Three groups: **legacy BI with AI add-ons**, **notebook-first tools**, and **chat-first analytics** (where CharmeeyAI sits). Our edge: zero setup, natural-language charts, and shared templates.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------
export interface PromptTemplate {
  id: string;
  name: string;
  category: 'Analytics' | 'Engineering' | 'Marketing' | 'Support' | 'Productivity';
  description: string;
  prompt: string;
  uses: number;
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: 'exec-summary',
    name: 'Executive summary',
    category: 'Productivity',
    description: 'Condense a long document into 5 bullet points and 3 action items.',
    prompt:
      'Summarize the following for an executive audience. Give 5 key bullet points, then 3 recommended actions with owners.\n\n[Paste document here]',
    uses: 3842,
  },
  {
    id: 'kpi-report',
    name: 'Weekly KPI report',
    category: 'Analytics',
    description: 'Turn raw weekly metrics into a narrative report with highlights and risks.',
    prompt:
      'Here are this week’s KPIs. Write a short report: headline, 3 highlights, 2 risks, and a comparison with last week.\n\n[Paste metrics or CSV here]',
    uses: 1966,
  },
  {
    id: 'csv-insights',
    name: 'Find insights in a CSV',
    category: 'Analytics',
    description: 'Detect trends, outliers and correlations, and suggest charts.',
    prompt:
      'Analyze the attached dataset. List the top 3 trends, any outliers, notable correlations, and the 2 charts that would best communicate them.',
    uses: 2210,
  },
  {
    id: 'sql-builder',
    name: 'SQL query builder',
    category: 'Engineering',
    description: 'Describe the question in plain English; get PostgreSQL with explanations.',
    prompt:
      'Write a PostgreSQL query that answers: [your question]. Tables: [describe schema]. Explain each clause briefly.',
    uses: 2915,
  },
  {
    id: 'code-review',
    name: 'Code review',
    category: 'Engineering',
    description: 'Review code for bugs, security issues and readability.',
    prompt:
      'Review this code for correctness bugs, security issues and readability. Rank findings by severity and suggest fixes.\n\n```\n[Paste code here]\n```',
    uses: 1785,
  },
  {
    id: 'support-reply',
    name: 'Customer reply (support)',
    category: 'Support',
    description: 'Empathetic, on-brand reply that resolves the issue in one message.',
    prompt:
      'Write a friendly, concise support reply to this customer message. Acknowledge the issue, give the fix, and offer next steps.\n\nCustomer: [paste message]',
    uses: 2480,
  },
  {
    id: 'blog-outline',
    name: 'Blog post outline',
    category: 'Marketing',
    description: 'SEO-friendly outline with H2/H3 structure and key points.',
    prompt:
      'Create an SEO-friendly blog outline about [topic] for [audience]. Include a title, meta description, H2/H3 headings and key points per section.',
    uses: 1420,
  },
  {
    id: 'ad-variants',
    name: 'Ad copy A/B variants',
    category: 'Marketing',
    description: 'Five headline + description pairs for A/B testing.',
    prompt:
      'Write 5 ad variants (headline ≤ 40 chars, description ≤ 90 chars) for [product], each with a different angle: price, speed, trust, outcome, curiosity.',
    uses: 980,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting notes → action items',
    category: 'Productivity',
    description: 'Extract decisions, owners and deadlines from a transcript.',
    prompt:
      'From this meeting transcript, extract: decisions made, action items (owner + deadline), and open questions.\n\n[Paste transcript]',
    uses: 1650,
  },
];

// ---------------------------------------------------------------------------
// Data Studio sample datasets (CSV text)
// ---------------------------------------------------------------------------
function salesCsv(): string {
  const rand = mulberry32(7);
  const regions = ['North America', 'EMEA', 'APAC', 'LATAM'];
  const products = ['Starter', 'Pro', 'Enterprise'];
  const rows = ['month,region,product,revenue,units,marketing_spend'];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
  months.forEach((m, mi) => {
    regions.forEach((r, ri) => {
      products.forEach((p, pi) => {
        const price = [29, 49, 420][pi];
        const regionScale = [1.6, 1.0, 0.75, 0.35][ri];
        const units = Math.round((60 - pi * 18) * regionScale * (1 + mi * 0.06) * (0.85 + rand() * 0.3));
        const spend = Math.round(units * price * (0.12 + rand() * 0.08));
        rows.push(`${m},${r},${p},${units * price},${units},${spend}`);
      });
    });
  });
  return rows.join('\n');
}

function signupsCsv(): string {
  const rand = mulberry32(11);
  const channels = ['Organic', 'Paid search', 'Referral', 'Social'];
  const rows = ['week,channel,visitors,signups,activated'];
  for (let w = 1; w <= 12; w++) {
    channels.forEach((c, ci) => {
      const visitors = Math.round([4200, 3100, 900, 1800][ci] * (1 + w * 0.03) * (0.9 + rand() * 0.2));
      const signups = Math.round(visitors * [0.045, 0.032, 0.11, 0.021][ci] * (0.9 + rand() * 0.2));
      const activated = Math.round(signups * (0.48 + rand() * 0.2));
      rows.push(`W${String(w).padStart(2, '0')},${c},${visitors},${signups},${activated}`);
    });
  }
  return rows.join('\n');
}

function ticketsCsv(): string {
  const rand = mulberry32(23);
  const cats = ['Billing', 'Bug', 'How-to', 'Feature request', 'Account'];
  const rows = ['day,category,tickets,avg_response_min,csat'];
  for (let d = 1; d <= 30; d++) {
    cats.forEach((c, ci) => {
      const tickets = Math.round([22, 15, 30, 8, 11][ci] * (0.7 + rand() * 0.6));
      const resp = Math.round([18, 42, 12, 60, 25][ci] * (0.8 + rand() * 0.4));
      const csat = (4.7 - resp / 120 - rand() * 0.3).toFixed(2);
      rows.push(`2026-09-${String(d).padStart(2, '0')},${c},${tickets},${resp},${csat}`);
    });
  }
  return rows.join('\n');
}

export const sampleDatasets = [
  { id: 'sales', name: 'SaaS sales 2026', description: 'Revenue by month, region and plan', csv: salesCsv() },
  { id: 'signups', name: 'Signup funnel', description: 'Weekly visitors → signups by channel', csv: signupsCsv() },
  { id: 'tickets', name: 'Support tickets', description: 'Daily tickets, response time & CSAT', csv: ticketsCsv() },
];
