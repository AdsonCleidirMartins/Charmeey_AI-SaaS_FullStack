/**
 * Canned responses used when the AI backend is unreachable, so the chat UI
 * remains explorable in a frontend-only deployment.
 */

const OFFLINE_NOTE =
  '\n\n---\n_Offline demo response — start the FastAPI service (`services/ai`) to get live Gemini answers._';

const responses: { match: RegExp; reply: string }[] = [
  {
    match: /data|csv|analy|chart|dataset|metric|revenue|sales/i,
    reply: `## Dataset insights

Here's what stands out in the data you shared:

| Metric | Value | Trend |
|---|---|---|
| Total revenue | $482.6K | ▲ 12.4% vs prior period |
| Avg. order value | $86.20 | ▲ 3.1% |
| Top region | North America | 41% of revenue |

**Key findings**

1. **Growth is accelerating** — the last 4 weeks grew faster than the 12-week average.
2. **Concentration risk** — the top 2 products account for 58% of revenue.
3. **Seasonality** — weekends underperform weekdays by ~18%.

**Suggested next steps:** open *Data Studio* to chart revenue by region, and set an alert for week-over-week drops above 10%.`,
  },
  {
    match: /code|function|bug|debug|python|typescript|javascript|react|sql/i,
    reply: `Here's a clean, typed starting point:

\`\`\`typescript
export async function fetchWithRetry<T>(url: string, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return (await res.json()) as T;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 100)); // exponential backoff
    }
  }
  throw new Error('unreachable');
}
\`\`\`

**Why this shape:** retries are bounded, back-off grows exponentially, and the generic keeps call sites type-safe.`,
  },
  {
    match: /market|copy|email|blog|post|content|write|draft/i,
    reply: `### Draft: product launch announcement

**Headline:** Turn raw data into decisions — in one conversation.

**Body:** CharmeeyAI brings chat, data analysis, and reusable prompt templates into a single workspace. Upload a CSV, ask a question in plain English, and get charts and a summary your team can act on.

**CTA:** Start free — no credit card required.

_Want a shorter version for social, or an A/B variant of the headline?_`,
  },
];

const fallback = `I'm **CharmeeyAI**, your AI workspace assistant. I can help you:

- **Analyze data** — summarize CSVs, spot trends, and suggest charts
- **Write & debug code** — TypeScript, Python, SQL, and more
- **Draft content** — marketing copy, emails, docs
- **Use templates** — pick one from the *Templates* tab to get started fast

What would you like to work on?`;

export async function mockGenerate(prompt: string): Promise<{ response: string; model: string }> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 600));
  const hit = responses.find((r) => r.match.test(prompt));
  return { response: (hit ? hit.reply : fallback) + OFFLINE_NOTE, model: 'demo-offline' };
}
