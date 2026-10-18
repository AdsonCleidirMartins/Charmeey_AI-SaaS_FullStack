import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Moon, Plus, Search, Sun, UserPlus, KeyRound, MessageSquare, LayoutTemplate, History as HistoryIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NAV, type Section } from './nav';
import { conversationHistory, promptTemplates } from '@/lib/mockData';
import { useTheme } from '@/context/ThemeContext';

interface Command {
  id: string;
  group: 'Navigate' | 'Actions' | 'Templates' | 'Conversations';
  label: string;
  hint?: string;
  icon: LucideIcon;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  onStartChat,
  onOpenConversation,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (s: Section, query?: string) => void;
  onStartChat: (prompt: string) => void;
  onOpenConversation: (id: number) => void;
}) {
  const { resolved, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = (Object.keys(NAV) as Section[]).map((id) => ({
      id: `nav-${id}`,
      group: 'Navigate',
      label: NAV[id].label,
      hint: NAV[id].description,
      icon: NAV[id].icon,
      run: () => onNavigate(id),
    }));
    const actions: Command[] = [
      { id: 'new-chat', group: 'Actions', label: 'New chat', icon: Plus, run: () => onStartChat('') },
      { id: 'invite', group: 'Actions', label: 'Invite a teammate', icon: UserPlus, run: () => onNavigate('members', 'invite=1') },
      { id: 'new-key', group: 'Actions', label: 'Create API key', icon: KeyRound, run: () => onNavigate('api-keys', 'create=1') },
      {
        id: 'theme',
        group: 'Actions',
        label: resolved === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: resolved === 'dark' ? Sun : Moon,
        run: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
      },
    ];
    const templates: Command[] = promptTemplates.map((t) => ({
      id: `tpl-${t.id}`,
      group: 'Templates',
      label: t.name,
      hint: t.category,
      icon: LayoutTemplate,
      run: () => onStartChat(t.prompt),
    }));
    const convos: Command[] = conversationHistory.map((h) => ({
      id: `conv-${h.id}`,
      group: 'Conversations',
      label: h.title,
      hint: h.tag,
      icon: HistoryIcon,
      run: () => onOpenConversation(h.id),
    }));
    return [...nav, ...actions, ...templates, ...convos];
  }, [onNavigate, onStartChat, onOpenConversation, resolved, setTheme]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group === 'Navigate' || c.group === 'Actions');
    return commands.filter((c) => c.label.toLowerCase().includes(q) || c.hint?.toLowerCase().includes(q)).slice(0, 30);
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const run = (c: Command) => {
    onClose();
    c.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[index]) {
      e.preventDefault();
      run(filtered[index]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = '';
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="relative w-full max-w-xl surface rounded-2xl shadow-2xl overflow-hidden animate-fade-down">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4">
          <Search className="h-4 w-4 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, actions, templates, conversations…"
            className="h-12 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
          />
          <kbd className="rounded border border-white/10 px-1.5 text-[10px] text-white/40">Esc</kbd>
        </div>
        <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">No results for “{query}”.</p>
          ) : (
            filtered.map((c, i) => {
              const header = c.group !== lastGroup ? c.group : null;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {header && <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-white/35">{header}</p>}
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === index}
                    data-index={i}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => run(c)}
                    className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm ${
                      i === index ? 'bg-white/[0.07] text-white' : 'text-white/70'
                    }`}
                  >
                    <c.icon className="h-4 w-4 shrink-0 text-white/45" />
                    <span className="truncate">{c.label}</span>
                    {c.hint && <span className="ml-auto hidden sm:block truncate text-xs text-white/35">{c.hint}</span>}
                    {i === index && <CornerDownLeft className="ml-auto sm:ml-0 h-3.5 w-3.5 shrink-0 text-white/40" />}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="flex items-center gap-4 border-t border-white/[0.06] px-4 py-2 text-[11px] text-white/35">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Tip: templates start a new chat
          </span>
        </div>
      </div>
    </div>
  );
}
