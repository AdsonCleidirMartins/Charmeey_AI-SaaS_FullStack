import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  Code2,
  Copy,
  Download,
  FileText,
  ImagePlus,
  Loader2,
  Mic,
  PenLine,
  Plus,
  Send,
  Trash2,
  Bug,
  X,
} from 'lucide-react';
import { generateChat } from '@/lib/api';
import type { Attachment } from '@/lib/attachments';
import { readFileAsAttachment } from '@/lib/attachments';
import { downloadFile } from '@/lib/format';
import Markdown from '@/components/Markdown';
import AttachmentButton from '@/components/AttachmentButton';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Button } from './ui';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  model?: string;
  attachment?: Attachment;
}

const suggestions = [
  { title: 'Analyze data', desc: 'Open Data Studio to chart a CSV', icon: BarChart3, studio: true },
  { title: 'Write code', desc: 'Generate clean, documented code', icon: Code2 },
  { title: 'Draft content', desc: 'Create marketing copy & docs', icon: PenLine },
  { title: 'Debug issues', desc: 'Find and fix code problems', icon: Bug },
];

export default function ChatView({
  messages,
  setMessages,
  prompt,
  setPrompt,
  onOpenStudio,
}: {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  prompt: string;
  setPrompt: (p: string) => void;
  onOpenStudio: () => void;
}) {
  const { user } = useAuth();
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { supported: voiceSupported, listening, transcript, toggle: toggleVoice, reset: resetVoice } = useSpeechRecognition();

  useEffect(() => {
    if (listening && transcript) setPrompt(transcript);
  }, [listening, transcript, setPrompt]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            setAttachment(await readFileAsAttachment(file));
          } catch (err) {
            console.error('Paste failed:', err);
          }
        }
        return;
      }
    }
  };

  const handleSend = async () => {
    const current = prompt.trim();
    if ((!current && !attachment) || isGenerating) return;
    const finalPrompt = current || 'Please analyze the attached file/image and tell me about it.';
    const sent = attachment;
    setMessages((prev) => [...prev, { role: 'user', content: finalPrompt, attachment: sent || undefined }]);
    setPrompt('');
    setAttachment(null);
    setIsGenerating(true);
    try {
      const data = await generateChat(finalPrompt, { attachment: sent || undefined });
      setMessages((prev) => [...prev, { role: 'ai', content: data.response || 'Received an empty response.', model: data.model }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [...prev, { role: 'ai', content: `Error communicating with backend: ${message}` }]);
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

  const toggleSelect = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    setMessages((prev) => prev.filter((_, i) => !selected.has(i)));
    exitSelect();
  };

  const newChat = () => {
    setMessages([]);
    setPrompt('');
    setAttachment(null);
    exitSelect();
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      {/* Conversation toolbar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 sm:px-6 py-2">
          <p className="text-xs text-white/40">{messages.length} messages</p>
          <div className="flex items-center gap-1.5">
            {selectMode ? (
              <>
                <span className="text-xs text-white/60 mr-1">{selected.size} selected</span>
                <Button size="sm" variant="danger" icon={Trash2} disabled={selected.size === 0} onClick={deleteSelected}>
                  Delete
                </Button>
                <Button size="sm" variant="ghost" icon={X} onClick={exitSelect}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setSelectMode(true)}>
                  Select
                </Button>
                <Button size="sm" variant="secondary" icon={Plus} onClick={newChat}>
                  New chat
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
              <img src="/favicon.svg" alt="" className="mb-5 h-12 w-12" />
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Good to see you{user?.name && !user.is_demo ? `, ${user.name.split(' ')[0]}` : ''}.
              </h2>
              <p className="mt-2 text-sm text-white/50 max-w-md">Ask anything, analyze data, or start from a template.</p>
              <div className="mt-8 grid w-full max-w-2xl gap-2.5 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => (s.studio ? onOpenStudio() : setPrompt(`Help me ${s.title.toLowerCase()}: `))}
                    className="group surface rounded-xl p-4 text-left transition-colors hover:border-brand-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 group-hover:bg-brand-600/20 transition-colors">
                        <s.icon className="h-4 w-4 text-brand-400" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-white">{s.title}</span>
                        <span className="block text-xs text-white/45 mt-0.5">{s.desc}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ol className="space-y-6">
              {messages.map((msg, i) => {
                const isSel = selected.has(i);
                const mine = msg.role === 'user';
                return (
                  <li
                    key={i}
                    className={`flex gap-3 animate-fade-up ${mine ? 'flex-row-reverse' : ''} ${selectMode ? 'cursor-pointer' : ''} ${
                      selectMode && !isSel ? 'opacity-50' : ''
                    }`}
                    onClick={selectMode ? () => toggleSelect(i) : undefined}
                  >
                    {selectMode && (
                      <span
                        role="checkbox"
                        aria-checked={isSel}
                        className={`mt-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isSel ? 'bg-brand-500 border-brand-500' : 'border-white/30'
                        }`}
                      >
                        {isSel && <Check className="h-3 w-3 text-white" />}
                      </span>
                    )}
                    {mine ? (
                      <Avatar name={user?.name || 'You'} size={28} />
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/15">
                        <img src="/favicon.svg" alt="" className="h-4 w-4" />
                      </span>
                    )}
                    <div className={`min-w-0 ${mine ? 'max-w-[85%] items-end flex flex-col' : 'flex-1'}`}>
                      {msg.attachment && (
                        <div className="mb-2 flex w-fit items-center gap-2 rounded-lg surface-muted px-2.5 py-1.5 text-xs">
                          {msg.attachment.preview ? (
                            <img src={msg.attachment.preview} alt={msg.attachment.name} className="h-8 w-8 rounded object-cover" />
                          ) : (
                            <FileText className="h-4 w-4 text-white/50" />
                          )}
                          <span className="truncate text-white/60">{msg.attachment.name}</span>
                        </div>
                      )}
                      {mine ? (
                        <div className="rounded-2xl rounded-tr-md bg-brand-600 px-4 py-2.5 text-sm text-white whitespace-pre-line">
                          {msg.content}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-white">CharmeeyAI</span>
                            {msg.model && <span className="text-[10px] font-mono text-white/30">{msg.model}</span>}
                          </div>
                          <div className="text-sm leading-relaxed text-white/80">
                            <Markdown content={msg.content} />
                          </div>
                          {!selectMode && (
                            <div className="mt-2 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => copy(i, msg.content)}
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-white/40 hover:text-white hover:bg-white/5"
                              >
                                {copiedId === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                {copiedId === i ? 'Copied' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                onClick={() => downloadFile(`charmeeyai-response-${Date.now()}.md`, msg.content, 'text/markdown;charset=utf-8')}
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-white/40 hover:text-white hover:bg-white/5"
                              >
                                <Download className="h-3 w-3" />
                                Save
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
              {isGenerating && (
                <li className="flex gap-3 animate-fade-in">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600/15">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-400" />
                  </span>
                  <div className="flex items-center gap-1.5 h-7">
                    {[0, 0.2, 0.4].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: `${d}s` }} />
                    ))}
                    <span className="ml-1 text-xs text-white/40">Thinking…</span>
                  </div>
                </li>
              )}
            </ol>
          )}
        </div>
      </div>

      {/* Composer */}
      {/* Right inset keeps the send button clear of the floating assistant until the composer is centered away from it */}
      <div className="pl-4 sm:pl-6 pr-[84px] sm:pr-[92px] xl:pr-6 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="surface rounded-2xl p-2 shadow-lg shadow-black/10 focus-within:border-brand-500/40 transition-colors">
            {attachment && (
              <div className="mb-2 ml-1 flex w-fit items-center gap-2 rounded-lg surface-muted px-2.5 py-1.5 text-xs">
                {attachment.preview ? (
                  <img src={attachment.preview} alt={attachment.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-white/50" />
                )}
                <span className="truncate text-white/60">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} className="ml-1 text-white/40 hover:text-white" aria-label="Remove attachment">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-1">
              <AttachmentButton onAttach={setAttachment} disabled={isGenerating} />
              <AutoGrowTextarea
                value={prompt}
                onChange={setPrompt}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message CharmeeyAI…"
                disabled={isGenerating}
                maxLines={8}
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (listening) resetVoice();
                    toggleVoice();
                  }}
                  aria-label={listening ? 'Stop recording' : 'Speak to type'}
                  title={listening ? 'Stop recording' : 'Speak to type'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    listening ? 'text-brand-300 bg-brand-600/20 animate-pulse' : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!prompt.trim() && !attachment) || isGenerating}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-white/30">
            Enter to send · Shift + Enter for a new line · CharmeeyAI can make mistakes.
          </p>
        </div>
      </div>
    </div>
  );
}
