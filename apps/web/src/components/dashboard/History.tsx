import { useMemo, useState } from 'react';
import { Search, Star, MessageSquare, ArrowRight } from 'lucide-react';
import { conversationHistory, type HistoryItem } from '@/lib/mockData';
import { SampleDataBadge } from './ChartKit';

const TAGS = ['All', 'Analysis', 'Code', 'Content', 'Support', 'Research'] as const;

function relativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  return 'Earlier';
}

export default function History({ onOpen }: { onOpen: (item: HistoryItem) => void }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<(typeof TAGS)[number]>('All');
  const [starredOnly, setStarredOnly] = useState(false);
  const [starred, setStarred] = useState<Set<number>>(
    () => new Set(conversationHistory.filter((h) => h.starred).map((h) => h.id))
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = conversationHistory.filter(
      (h) =>
        (tag === 'All' || h.tag === tag) &&
        (!starredOnly || starred.has(h.id)) &&
        (!q || h.title.toLowerCase().includes(q) || h.preview.toLowerCase().includes(q))
    );
    const map = new Map<string, HistoryItem[]>();
    for (const h of filtered) {
      const key = relativeDay(h.updatedAt);
      map.set(key, [...(map.get(key) ?? []), h]);
    }
    return Array.from(map);
  }, [query, tag, starredOnly, starred]);

  const toggleStar = (id: number) =>
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white">Conversation history</h1>
            <SampleDataBadge />
          </div>
          <p className="text-sm text-white/50">Search, filter and reopen past conversations.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations..."
              aria-label="Search conversations"
              className="w-full rounded-lg surface-muted pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                aria-pressed={tag === t}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tag === t ? 'bg-brand-600/20 text-brand-300' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStarredOnly((s) => !s)}
              aria-pressed={starredOnly}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                starredOnly ? 'bg-amber-500/15 text-amber-300' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Star className="h-3.5 w-3.5" />
              Starred
            </button>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="surface rounded-xl p-10 text-center text-sm text-white/40">No conversations match your filters.</div>
        ) : (
          groups.map(([label, items]) => (
            <section key={label}>
              <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{label}</h3>
              <ul className="space-y-2">
                {items.map((h) => (
                  <li key={h.id}>
                    <div className="group surface rounded-xl transition-colors hover:border-brand-500/30 p-4 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600/15">
                        <MessageSquare className="h-4 w-4 text-brand-400" />
                      </div>
                      <button type="button" onClick={() => onOpen(h)} className="flex-1 min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">{h.title}</span>
                          <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-white/50">{h.tag}</span>
                        </div>
                        <p className="text-xs text-white/50 mt-0.5 truncate">{h.preview}</p>
                        <p className="text-[11px] text-white/30 mt-1 font-mono">
                          {h.model} · {h.messages} messages ·{' '}
                          {new Date(h.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleStar(h.id)}
                          aria-label={starred.has(h.id) ? 'Unstar' : 'Star'}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/5 ${
                            starred.has(h.id) ? 'text-amber-400' : 'text-white/30 hover:text-white'
                          }`}
                        >
                          <Star className="h-4 w-4" fill={starred.has(h.id) ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpen(h)}
                          aria-label="Open conversation"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/5"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
