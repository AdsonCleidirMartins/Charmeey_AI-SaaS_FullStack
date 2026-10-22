import { useMemo, useState } from 'react';
import { Search, Play, BarChart3, Code2, Megaphone, LifeBuoy, ListChecks } from 'lucide-react';
import { promptTemplates, type PromptTemplate } from '@/lib/mockData';

const CATEGORIES = ['All', 'Analytics', 'Engineering', 'Marketing', 'Support', 'Productivity'] as const;

const categoryIcon: Record<PromptTemplate['category'], typeof BarChart3> = {
  Analytics: BarChart3,
  Engineering: Code2,
  Marketing: Megaphone,
  Support: LifeBuoy,
  Productivity: ListChecks,
};

export default function Templates({ onUse }: { onUse: (prompt: string) => void }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return promptTemplates.filter(
      (t) =>
        (category === 'All' || t.category === category) &&
        (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    );
  }, [query, category]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Prompt templates</h1>
          <p className="text-sm text-white/50">Battle-tested prompts for your team. Pick one and fill in the brackets.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates..."
              aria-label="Search templates"
              className="w-full rounded-lg surface-muted pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={category === cat}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <div className="surface rounded-xl p-10 text-center text-sm text-white/40">No templates match your search.</div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((t) => {
              const Icon = categoryIcon[t.category];
              return (
                <article key={t.id} className="surface rounded-xl p-5 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/15">
                      <Icon className="h-4 w-4 text-brand-400" />
                    </span>
                    <span className="text-[11px] text-white/40">{t.uses.toLocaleString()} runs</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                  <p className="text-xs text-white/50 mt-1 flex-1">{t.description}</p>
                  <pre className="mt-3 rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 text-[11px] text-white/50 font-mono whitespace-pre-wrap line-clamp-3">
                    {t.prompt}
                  </pre>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-brand-400/80">{t.category}</span>
                    <button
                      type="button"
                      onClick={() => onUse(t.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Play className="h-3 w-3" />
                      Use template
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
