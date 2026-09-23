import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Loader2, MessageCircle, User, Copy, Check, FileText, ImagePlus, Mic, Trash2 } from 'lucide-react';
import { generateChat } from '@/lib/api';
import type { Attachment } from '@/lib/attachments';
import { readFileAsAttachment } from '@/lib/attachments';
import Markdown from '@/components/Markdown';
import AttachmentButton from '@/components/AttachmentButton';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTheme } from '@/context/ThemeContext';

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  model?: string;
  attachment?: Attachment;
}

const SITE_ASSISTANT_SYSTEM = `You are "CharmeeyAI Assistant", a friendly embedded support assistant for the CharmeeyAI website. Your job is to make visitors feel comfortable and help them use the site, and you can also answer general questions.

About the site (CharmeeyAI):
- CharmeeyAI is an AI-powered SaaS platform: a React frontend, a FastAPI backend, and AI chat powered by Google Gemini.
- Visitors do NOT need to sign up to try it: clicking "Launch App" or "Start Building Free" opens the app in Demo mode. Demo users can use the AI chat freely; the History, Templates, Analytics, and Settings areas are read-only until they sign in.
- Sign Up / Sign In are available in the top navbar and in the dashboard sidebar user card.
- The landing page has these sections: Features (#features), Playground (#playground, an interactive demo you can type into), Blog (#blog), Chat Room (#room, a live community chat), Pricing (#pricing), and Docs (#docs).
- Users can attach images or files (PDF, text, CSV, JSON, code) to a chat message to have them analyzed.

Behavior:
- Be concise, warm, and practical. Prefer short answers (a few sentences), using light Markdown (bullets or short headings) only when it helps.
- If the question is about the site, navigation, sign-in, pricing, or how to do something in the app, give clear step-by-step guidance.
- If the user seems lost on the landing page, gently point them to the Playground or the "Start Building Free" button.
- You may also answer general questions, help write/debug code, analyze attached files, and draft content.`;

const suggestions = [
  'How do I use this site without signing up?',
  'What can I do in the Playground?',
  'How do I create an account?',
  'Help me write a Python script to parse CSV',
];

export default function ChatBot() {
  const { resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    supported: voiceSupported,
    listening: voiceListening,
    transcript: voiceTranscript,
    toggle: toggleVoice,
    reset: resetVoice,
  } = useSpeechRecognition();

  useEffect(() => {
    if (voiceListening && voiceTranscript) setInput(voiceTranscript);
  }, [voiceListening, voiceTranscript]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const pasted = await readFileAsAttachment(file);
            setAttachment(pasted);
          } catch {
            /* ignore unsupported pastes */
          }
        }
        return;
      }
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, open]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if ((!prompt && !attachment) || isGenerating) return;

    const finalPrompt = prompt || 'Please analyze the attached file/image and tell me about it.';
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: finalPrompt, attachment: attachment || undefined }]);
    const sentAttachment = attachment;
    setAttachment(null);
    setIsGenerating(true);

    try {
      const data = await generateChat(finalPrompt, {
        system: SITE_ASSISTANT_SYSTEM,
        attachment: sentAttachment || undefined,
      });
      const aiContent = data.response || 'Received empty response.';
      setMessages((prev) => [...prev, { role: 'ai', content: aiContent, model: data.model }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Error communicating with the assistant: ${message}` },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyMessage = async (index: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setCopiedId(null);
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    const indices = new Set(selected);
    setMessages((prev) => prev.filter((_, i) => !indices.has(i)));
    exitSelectMode();
  };

  const deleteAll = () => {
    setMessages([]);
    exitSelectMode();
  };

  return (
    <>
      {/* Launcher button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[70] flex h-14 w-14 items-center justify-center bg-transparent text-white hover:scale-105 active:scale-95 transition-all duration-300"
      >
        {open ? (
          <X className="h-6 w-6" />
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

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-[70] w-[min(24rem,calc(100vw-2rem))] h-[min(480px,calc(100vh-8rem))] flex flex-col glass-strong rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-down origin-bottom-right">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] bg-gradient-to-r from-brand-600/20 to-violet-600/10">
            <div className="flex items-center gap-2.5">
              <img src="/favicon.svg" alt="CharmeeyAI" className="h-8 w-8" />
              <div>
                <div className="text-sm font-semibold text-white leading-tight">CharmeeyAI Assistant</div>
                <div className="flex items-center gap-1.5 text-[10px] text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Site assistant · Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-xs text-white/60">{selected.size} selected</span>
                  <button
                    onClick={deleteSelected}
                    disabled={selected.size === 0}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                  <button
                    onClick={exitSelectMode}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {messages.length > 0 && (
                    <>
                      <button
                        onClick={() => setSelectMode(true)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-white/50 transition-colors hover:text-white"
                        title="Select messages to delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Select
                      </button>
                      <button
                        onClick={deleteAll}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 transition-colors hover:bg-rose-500/30"
                        title="Clear the conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Clear all
                      </button>
                    </>
                  )}
                </>
              )}
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg glass glass-hover text-white/60 hover:text-white"
                aria-label="Close assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 mb-3">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm font-medium text-white">Hi! I'm the CharmeeyAI site assistant.</p>
                <p className="text-xs text-white/50 mt-1 mb-4 max-w-[260px]">
                  I can help you explore this site, create an account, or answer anything else. You can
                  even attach an image or file.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs text-white/60 hover:text-white glass rounded-full px-3 py-1.5 transition-colors hover:border-white/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isSelected = selected.has(i);
                return (
                <div
                  key={i}
                  onClick={selectMode ? () => toggleSelect(i) : undefined}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${
                    selectMode ? 'cursor-pointer' : ''
                  }`}
                >
                  {selectMode && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(i);
                      }}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isSelected ? 'bg-brand-500 border-brand-500' : 'border-white/30 hover:border-white/60'
                      }`}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelect(i);
                        }
                      }}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  )}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      msg.role === 'user' ? 'bg-white/5' : 'bg-gradient-to-br from-brand-500 to-violet-500'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3.5 w-3.5 text-white/60" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed transition-opacity ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white rounded-tr-none'
                        : 'glass text-white/80 rounded-tl-none'
                    } ${selectMode && !isSelected ? 'opacity-40' : ''}`}
                  >
                    {msg.attachment && (
                      <div className="flex items-center gap-2 mb-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-xs">
                        {msg.attachment.preview ? (
                          <img
                            src={msg.attachment.preview}
                            alt={msg.attachment.name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <FileText className="h-4 w-4 text-white/50" />
                        )}
                        <span className="truncate text-white/60">{msg.attachment.name}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-line">
                      {msg.role === 'ai' ? <Markdown content={msg.content} /> : msg.content}
                    </div>
                    {msg.model && (
                      <span className="mt-1.5 block text-[9px] font-mono text-white/30">{msg.model}</span>
                    )}
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => copyMessage(i, msg.content)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
                      >
                        {copiedId === i ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                );
              })
            )}

            {isGenerating && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                </div>
                <div className="glass rounded-xl rounded-tl-none px-3.5 py-2.5 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0s' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0.2s' }} />
                    <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0.4s' }} />
                  </div>
                  <span className="text-xs text-white/40">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.06]">
            {attachment && (
              <div className="mb-2 flex items-center gap-2 rounded-lg glass px-2.5 py-1.5 text-xs">
                {attachment.preview ? (
                  <img src={attachment.preview} alt={attachment.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <ImagePlus className="h-4 w-4 text-white/50" />
                )}
                <span className="truncate text-white/60">{attachment.name}</span>
                <button
                  onClick={() => setAttachment(null)}
                  className="ml-auto text-white/40 hover:text-white"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="glass rounded-xl p-1.5 flex items-end gap-1.5">
              <AttachmentButton onAttach={setAttachment} disabled={isGenerating} />
              <AutoGrowTextarea
                value={input}
                onChange={setInput}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder=""
                disabled={isGenerating}
                maxLines={7}
              />
              {voiceSupported && (
                <button
                  onClick={() => {
                    if (voiceListening) {
                      resetVoice();
                      toggleVoice();
                    } else {
                      toggleVoice();
                    }
                  }}
                  title={voiceListening ? 'Stop recording' : 'Speak to type'}
                  aria-label={voiceListening ? 'Stop recording' : 'Speak to type'}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    voiceListening
                      ? 'text-brand-300 bg-brand-600/20 animate-pulse'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => send(input)}
                disabled={(!input.trim() && !attachment) || isGenerating}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-brand-500/40 transition-all"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-white/30 text-center mt-1.5 font-mono">
              CharmeeyAI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      )}
    </>
  );
}