import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Compass, Copy, Loader2, Mic, Moon, RotateCcw, Send, Sparkles, Sun, X } from 'lucide-react';
import { generateChat } from '@/lib/api';
import Markdown from '@/components/Markdown';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import {
  ACTIONS,
  buildSystemPrompt,
  extractActions,
  matchIntent,
  pageLabel,
  suggestionsFor,
  type AssistantAction,
  type AssistantContext,
} from '@/lib/siteKnowledge';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  actions?: AssistantAction[];
  source?: 'guide' | 'ai';
}

const FALLBACK: Omit<ChatMessage, 'role'> = {
  content:
    'I’m not sure about that one. I can explain any feature, find a setting, or take you to the right page — try one of the suggestions, or contact the team in **Help & Support**.',
  actions: [ACTIONS.support, ACTIONS.overview],
  source: 'guide',
};

export default function ChatBot() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolved, setTheme } = useTheme();
  const { user, isDemo, offline } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx: AssistantContext = useMemo(
    () => ({ pathname: location.pathname, search: location.search, signedIn: !!user && !isDemo, isDemo }),
    [location.pathname, location.search, user, isDemo]
  );
  const suggestions = suggestionsFor(ctx);
  const here = pageLabel(ctx);

  const { supported: voiceSupported, listening, transcript, toggle: toggleVoice, reset: resetVoice } = useSpeechRecognition();

  useEffect(() => {
    if (listening && transcript) setInput(transcript);
  }, [listening, transcript]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isGenerating, open]);

  const runAction = (a: AssistantAction) => {
    if (a.theme) {
      setTheme(a.theme);
      return;
    }
    if (!a.to) return;
    const [path, hash] = a.to.split('#');
    if (hash) {
      // Landing-page anchors: scroll if we're already there, otherwise navigate then scroll
      const scroll = () => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
      if (location.pathname === (path || '/')) scroll();
      else {
        navigate(path || '/');
        window.setTimeout(scroll, 150);
      }
    } else {
      navigate(a.to);
    }
    // Keep the panel out of the way on small screens once we've taken the user somewhere
    if (window.matchMedia('(max-width: 639px)').matches) setOpen(false);
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || isGenerating) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);

    // 1) Grounded rules: instant, consistent, and work without the backend
    const local = matchIntent(question, ctx);
    if (local.kind !== 'none') {
      setMessages((prev) => [...prev, { role: 'ai', content: local.text, actions: local.actions, source: 'guide' }]);
      return;
    }

    // 2) Anything else goes to the model, grounded in the same site knowledge
    if (offline) {
      setMessages((prev) => [...prev, { role: 'ai', ...FALLBACK }]);
      return;
    }
    setIsGenerating(true);
    try {
      const data = await generateChat(question, { system: buildSystemPrompt(ctx) });
      if (data.error || data.model === 'demo-offline' || !data.response) {
        setMessages((prev) => [...prev, { role: 'ai', ...FALLBACK }]);
      } else {
        const { text: answer, actions } = extractActions(data.response, question);
        setMessages((prev) => [...prev, { role: 'ai', content: answer, actions, source: 'ai' }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', ...FALLBACK }]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copy = async (i: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(i);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const actionIcon = (a: AssistantAction) => (a.theme === 'dark' ? Moon : a.theme === 'light' ? Sun : a.prompt ? Sparkles : ArrowRight);

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close site assistant' : 'Open site assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[70] flex h-14 w-14 items-center justify-center bg-transparent text-white hover:scale-105 active:scale-95 transition-all duration-300"
      >
        {open ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-full surface shadow-xl">
            <X className="h-5 w-5" />
          </span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" viewBox="0 0 512 512" className="h-9 w-9">
              <defs>
                <linearGradient
                  id="hexabot_svg__a"
                  x1="3387.043"
                  x2="4262.065"
                  y1="-1048.576"
                  y2="286.095"
                  gradientTransform="matrix(.2265 .05678 .05678 -.2265 -567.888 -91.71)"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0" style={{ stopColor: '#4dc4e6' }} />
                  <stop offset=".473" style={{ stopColor: '#73ca51' }} />
                  <stop offset="1" style={{ stopColor: '#dce92e' }} />
                </linearGradient>
              </defs>
              <path
                d="M304.1 512c-.7 0-1.4 0-2.2-.1-10.3-.8-19.2-7.6-22.9-17.3l-26.9-72.2-79.6-.2c-28.1-.1-54.3-15.2-68.4-39.5l-77-132.5c-13.8-23.7-13.9-53.3-.2-77.1l74.3-129.5C116.4 17 144.9.5 175.5.4L321.4 0h.2c29.5 0 57 15.8 71.8 41.4l71 122.2c23.5 19.5 35 50.5 29.4 80.8-.7 3.9-2.3 7.5-4.6 10.7L377.6 410.3l-50.2 88.2c-4.8 8.4-13.7 13.5-23.3 13.5m17.5-458.6-145.9.4c-11.6 0-22.4 6.3-28.2 16.4L73.3 199.7c-4.2 7.3-4.2 16.4.1 23.7l77 132.5c4.6 7.9 13.2 12.9 22.4 12.9l98.1.2c11.1 0 21.1 7 25 17.4l13.4 36 22.6-39.8 1.5-2.4 108.5-150.7c.2-10.3-4.7-20.3-13.3-26.3-3.1-2.2-5.7-5.1-7.6-8.4L347.3 68.2c-5.3-9.2-15.1-14.8-25.7-14.8"
                fill="url(#hexabot_svg__a)"
              />
              <path
                d="M353 208.9c0 15.7-12.7 28.4-28.3 28.4-15.7 0-28.4-12.7-28.4-28.3 0-15.7 12.7-28.4 28.3-28.4 15.7-.1 28.4 12.6 28.4 28.3m-154.9 0c0 15.7-12.7 28.4-28.3 28.4-15.7 0-28.4-12.7-28.4-28.3 0-15.7 12.7-28.4 28.3-28.4 15.6-.1 28.4 12.6 28.4 28.3m77.4 0c0 15.7-12.7 28.4-28.3 28.4-15.7 0-28.4-12.7-28.4-28.3 0-15.7 12.7-28.4 28.3-28.4 15.7-.1 28.4 12.6 28.4 28.3"
                fill={resolved === 'light' ? '#040606' : '#ffffff'}
              />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-ink-950" />
            </span>
          </>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="CharmeeyAI site assistant"
          className="fixed bottom-24 right-3 sm:bottom-28 sm:right-6 z-[70] w-[min(26rem,calc(100vw-1.5rem))] h-[min(600px,calc(100dvh-8rem))] flex flex-col surface rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-up origin-bottom-right"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 h-14 border-b border-white/[0.06]">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white leading-tight">CharmeeyAI Guide</div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/45 truncate">
                  <Compass className="h-3 w-3 shrink-0" />
                  Helping on: <span className="text-white/70">{here}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/5"
                  aria-label="Start over"
                  title="Start over"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:text-white hover:bg-white/5"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="pt-2">
                <p className="text-sm font-medium text-white">Hi! I’m your guide to CharmeeyAI.</p>
                <p className="mt-1 text-xs leading-relaxed text-white/50">
                  Ask how anything works and I’ll explain it — and take you straight there. For writing, code or file analysis, I’ll hand you
                  over to AI Chat.
                </p>
                <p className="mt-5 mb-2 text-[11px] font-medium text-white/35">Suggested for {here}</p>
                <div className="flex flex-col items-start gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-left text-xs text-white/70 hover:text-white hover:border-brand-500/40 hover:bg-brand-500/5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-brand-600 px-3.5 py-2 text-sm text-white whitespace-pre-line">{msg.content}</div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  <img src="/favicon.svg" alt="" className="mt-0.5 h-6 w-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-relaxed text-white/80">
                      <Markdown content={msg.content} />
                    </div>
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {msg.actions.map((a) => {
                          const Icon = actionIcon(a);
                          return (
                            <button
                              key={a.id}
                              onClick={() => runAction(a)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-2.5 py-1.5 text-xs font-medium text-brand-300 hover:bg-brand-500/20 transition-colors"
                            >
                              {a.label}
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/30">
                      <span>{msg.source === 'ai' ? 'AI answer · grounded in site docs' : 'From the CharmeeyAI guide'}</span>
                      <button onClick={() => copy(i, msg.content)} className="inline-flex items-center gap-1 hover:text-white/70" aria-label="Copy answer">
                        {copiedId === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {isGenerating && (
              <div className="flex items-center gap-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                <span className="text-xs text-white/40">Looking that up…</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="surface-muted rounded-xl p-1.5 flex items-end gap-1">
              <AutoGrowTextarea
                value={input}
                onChange={setInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder={`Ask about ${here === 'Home' ? 'CharmeeyAI' : here}…`}
                disabled={isGenerating}
                maxLines={5}
              />
              {voiceSupported && (
                <button
                  onClick={() => {
                    if (listening) resetVoice();
                    toggleVoice();
                  }}
                  aria-label={listening ? 'Stop recording' : 'Speak to type'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    listening ? 'text-brand-300 bg-brand-600/20 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => void send(input)}
                disabled={!input.trim() || isGenerating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
