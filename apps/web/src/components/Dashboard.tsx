import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  History,
  LayoutTemplate,
  BarChart3,
  Settings,
  MessagesSquare,
  Send,
  Loader2,
  Download,
  Copy,
  Check,
  ImagePlus,
  Menu,
  User,
  LogOut,
  LogIn,
  Lock,
  X,
  FileText,
  Moon,
  Sun,
  Monitor,
  Bell,
  Mic,
  Trash2,
  Inbox,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { generateChat, getNotifications, deleteNotification, API_WS_URL, getToken, type NotificationItem } from '@/lib/api';
import type { Attachment } from '@/lib/attachments';
import { readFileAsAttachment } from '@/lib/attachments';
import Markdown from '@/components/Markdown';
import AttachmentButton from '@/components/AttachmentButton';
import RoomChat from '@/components/RoomChat';
import AutoGrowTextarea from '@/components/AutoGrowTextarea';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';

type NavItem = 'chats' | 'history' | 'templates' | 'analytics' | 'settings' | 'room';

const navItems: { id: NavItem; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chats', label: 'Charmeey Chats', icon: MessageSquare },
  { id: 'room', label: 'Chat Room', icon: MessagesSquare },
  { id: 'history', label: 'History', icon: History },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const VALID_SECTIONS = new Set(navItems.map((i) => i.id));

function parseSenderName(title: string): string {
  const prefix = 'New direct message from ';
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { section } = useParams<{ section: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isDemo, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<NavItem>(() => {
    const s =
      typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '';
    return VALID_SECTIONS.has(s as NavItem) ? (s as NavItem) : 'chats';
  });
  const [dmTarget, setDmTarget] = useState<{ id: number; name: string } | null>(null);
  const navigateActive = useCallback(
    (id: NavItem) => {
      navigate(`/dashboard/${id}`);
    },
    [navigate]
  );

  // Derive active section from the URL and keep the UI in sync
  useEffect(() => {
    const valid = VALID_SECTIONS.has(section as NavItem) ? (section as NavItem) : 'chats';
    setActiveSection(valid);
  }, [section]);

  // A ?dm=<id>&name=<name> param opens a 1:1 thread with that peer; clear it after handing off
  useEffect(() => {
    const dm = searchParams.get('dm');
    const name = searchParams.get('name');
    if (dm) {
      const peerId = Number(dm);
      if (Number.isFinite(peerId) && peerId > 0) {
        setDmTarget({ id: peerId, name: name || 'User' });
      }
      const next = new URLSearchParams(searchParams);
      next.delete('dm');
      next.delete('name');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Don't reopen a previous DM when returning to the room later
  useEffect(() => {
    if (activeSection !== 'room') setDmTarget(null);
  }, [activeSection]);

  const [prompt, setPrompt] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; model?: string; attachment?: Attachment }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('charmeey_sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [chatSelectMode, setChatSelectMode] = useState(false);
  const [chatSelected, setChatSelected] = useState<Set<number>>(new Set());

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifCount = notifications.filter((n) => !n.is_read).length;

  // Voice input for chats
  const {
    supported: voiceSupported,
    listening: voiceListening,
    transcript: voiceTranscript,
    toggle: toggleVoice,
    reset: resetVoice,
  } = useSpeechRecognition();

  useEffect(() => {
    if (voiceListening && voiceTranscript) {
      setPrompt(voiceTranscript);
    }
  }, [voiceListening, voiceTranscript]);

  // Load notifications
  useEffect(() => {
    if (!getToken()) return;
    getNotifications()
      .then((res) => setNotifications(res.notifications))
      .catch(() => {
        /* silent */
      });
  }, []);

  // Live notification updates over WebSocket
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    let ws: WebSocket | null = null;
    let retryTimer: number | undefined;
    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        ws = new WebSocket(`${API_WS_URL}/ws/notifications?token=${encodeURIComponent(token)}`);
      } catch {
        retryTimer = window.setTimeout(connect, 5000);
        return;
      }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'notification' && data.notification) {
            setNotifications((prev) => [data.notification, ...prev].slice(0, 100));
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        if (!closed) retryTimer = window.setTimeout(connect, 4000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  // Poll as a fallback while the socket is down
  useEffect(() => {
    if (!getToken()) return;
    const pollTimer = window.setInterval(() => {
      getNotifications()
        .then((res) => setNotifications(res.notifications))
        .catch(() => {
          /* silent */
        });
    }, 30000);
    return () => window.clearInterval(pollTimer);
  }, []);

  const handleOpenNotifPanel = () => {
    setNotifOpen((o) => !o);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDeleteNotification = async (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch {
      /* already removed optimistically */
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    setNotifOpen(false);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    void deleteNotification(n.id).catch(() => {
      /* ignore: optimistic removal */
    });
    if (n.kind === 'dm' && n.sender_id) {
      const senderName = parseSenderName(n.title);
      navigate(`/dashboard/room?dm=${n.sender_id}&name=${encodeURIComponent(senderName)}`);
      return;
    }
    navigate(`/dashboard/chats`);
  };

  // Paste image/file from clipboard
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const attachment = await readFileAsAttachment(file);
            setAttachment(attachment);
          } catch (err) {
            console.error('Paste failed:', err);
          }
        }
        return;
      }
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('charmeey_sidebar_collapsed', sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore storage errors */
    }
  }, [sidebarCollapsed]);

  const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;

  const toggleSidebar = () => {
    if (isDesktop()) {
      setSidebarCollapsed((c) => !c);
    } else {
      setSidebarOpen((o) => !o);
    }
  };

  const handleSend = async () => {
    const currentPrompt = prompt.trim();
    if ((!currentPrompt && !attachment) || isGenerating) return;

    const finalPrompt = currentPrompt || 'Please analyze the attached file/image and tell me about it.';
    const userMsg = { role: 'user' as const, content: finalPrompt, attachment: attachment || undefined };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    const sentAttachment = attachment;
    setAttachment(null);
    setIsGenerating(true);

    try {
      const data = await generateChat(finalPrompt, { attachment: sentAttachment || undefined });
      const aiContent = data.response || 'Received empty response from backend service.';

      setIsGenerating(false);
      setMessages((prev) => [...prev, { role: 'ai', content: aiContent, model: data.model }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setIsGenerating(false);
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Error communicating with backend: ${message}` },
      ]);
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

  const toggleChatSelect = (index: number) => {
    setChatSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const exitChatSelectMode = () => {
    setChatSelectMode(false);
    setChatSelected(new Set());
  };

  const deleteChatSelected = () => {
    if (chatSelected.size === 0) return;
    const indices = Array.from(chatSelected).sort((a, b) => a - b);
    setMessages((prev) => {
      const toDelete = new Set(indices);
      return prev.filter((_, i) => !toDelete.has(i));
    });
    exitChatSelectMode();
  };

  const deleteChatAll = () => {
    setMessages([]);
    exitChatSelectMode();
  };

  const downloadMessage = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `charmeeyai-response-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const ItemIcon = navItems.find((item) => item.id === activeSection)?.icon ?? MessageSquare;

  return (
    <div className="fixed inset-0 bg-ink-950 flex overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <aside
        className={`absolute lg:relative z-40 h-full flex flex-col glass-strong border-r border-white/[0.06] transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-72 w-72'}`}
      >
        {/* Logo + sidebar toggle */}
        <div className="relative flex items-center justify-between h-20 px-4 border-b border-white/[0.06]">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${sidebarCollapsed ? 'lg:justify-center lg:flex-1' : ''}`}
            title="Go to home"
          >
            <img src="/favicon.svg" alt="CharmeeyAI" className="h-8 w-8 shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-bold text-lg whitespace-nowrap">Charmeey<span className="text-brand-400">AI</span></span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 mt-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigateActive(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
              } ${
                activeSection === item.id
                  ? 'bg-brand-600/15 text-brand-300 border border-brand-500/20'
                  : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && item.label}
              {!sidebarCollapsed && isDemo && item.id !== 'chats' && item.id !== 'room' && item.id !== 'settings' && (
                <Lock className="ml-auto h-3 w-3 text-white/30" />
              )}
            </button>
          ))}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-white/[0.06]">
          <div className={`relative flex items-center gap-3 px-2 py-2 rounded-lg glass ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500">
              <User className="h-5 w-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{user?.name || 'Guest'}</div>
                <div className="text-xs text-white/40 truncate">
                  {isDemo ? 'Demo · Read-only' : user?.email || 'Pro Plan'}
                </div>
              </div>
            )}
            {!sidebarCollapsed &&
              (isDemo ? (
                <button
                  onClick={() => navigate('/auth')}
                  className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-medium"
                  title="Sign in to unlock"
                >
                  <LogIn className="h-4 w-4" />
                  Sign in
                </button>
              ) : (
                <button className="text-white/40 hover:text-white" title="Sign out" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </button>
              ))}
          </div>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 border-b border-white/[0.06] glass-strong">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="flex items-center justify-center h-9 w-9 rounded-lg glass"
              title="Toggle sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h1 className="text-sm font-semibold text-white capitalize">{activeSection}</h1>
          </div>

          {/* Control pills */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center p-1 rounded-lg glass" title="Theme">
              {(
                [
                  { id: 'dark' as Theme, icon: Moon },
                  { id: 'light' as Theme, icon: Sun },
                  { id: 'system' as Theme, icon: Monitor },
                ]
              ).map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  aria-label={`${id} theme`}
                  className={`flex items-center justify-center h-7 w-7 rounded-md transition-all ${
                    theme === id
                      ? 'text-brand-300 bg-brand-600/20'
                      : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            {isDemo && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-lg glass px-3 py-2 text-xs text-white/50">
                <Lock className="h-3.5 w-3.5 text-brand-400" />
                Demo mode
              </span>
            )}
            {/* Notifications (right-end) */}
            <button
              onClick={handleOpenNotifPanel}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
                notifOpen ? 'glass text-brand-300' : 'glass text-white/50 hover:text-white'
              }`}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[9px] font-bold text-white">
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Notification slide-out panel */}
        {notifOpen && (
          <>
            <div
              className="absolute inset-0 z-30 bg-black/40"
              onClick={() => setNotifOpen(false)}
            />
            <aside className="absolute right-0 top-0 bottom-0 z-40 w-full max-w-sm glass-strong border-l border-white/[0.08] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-brand-300" />
                  <span className="text-sm font-semibold text-white">Notifications</span>
                  {notifCount > 0 && (
                    <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                      {notifCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5"
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {notifications.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-6">
                    <Inbox className="h-8 w-8 text-white/20" />
                    <p className="text-sm text-white/40">No notifications yet.</p>
                    <p className="text-xs text-white/30">Direct messages from chat room users will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationClick(n);
                        }
                      }}
                      className="group flex items-start gap-3 rounded-xl glass p-3 transition-colors text-left hover:bg-white/[0.06] w-full cursor-pointer"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500">
                        <Bell className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-white break-words">{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-white/50 break-words line-clamp-2">{n.body}</p>}
                        <p className="mt-1 text-[10px] text-white/30">
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(n.id);
                        }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/30 opacity-0 transition-opacity hover:text-rose-400 hover:bg-rose-500/10 group-hover:opacity-100"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </>
        )}

        {/* Content area */}
        {activeSection === 'room' ? (
          /* Community chat room */
          <div className="flex-1 p-4 sm:p-6 min-h-0">
            <div className="mx-auto h-full max-w-6xl">
              <RoomChat className="h-full" initialDmPeer={dmTarget} />
            </div>
          </div>
        ) : activeSection === 'settings' ? (
          /* Settings (theme control) */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
              <div className="glass-strong rounded-2xl p-8">
                <h2 className="text-lg font-bold text-white mb-1">Settings</h2>
                <p className="text-sm text-white/50 mb-8">Customize how CharmeeyAI looks and feels.</p>

                <div>
                  <label className="block text-xs font-medium text-white/40 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-2 max-w-sm">
                    {(
                      [
                        { id: 'dark' as Theme, label: 'Dark', icon: Moon },
                        { id: 'light' as Theme, label: 'Light', icon: Sun },
                        { id: 'system' as Theme, label: 'System', icon: Monitor },
                      ]
                    ).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-xs font-medium transition-all border ${
                          theme === id
                            ? 'bg-brand-600/15 text-brand-300 border-brand-500/40'
                            : 'text-white/50 hover:text-white hover:bg-white/5 border-white/10'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-white/30 mt-3">
                    System follows your device's light/dark preference.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeSection !== 'chats' ? (
          /* Non-chat views: read-only for demo, placeholder otherwise */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
              <div className="glass-strong rounded-2xl p-10 text-center">
                <div className="relative mb-6 inline-flex">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 blur-xl opacity-30" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600">
                    {isDemo ? (
                      <Lock className="h-6 w-6 text-white" />
                    ) : (
                      <ItemIcon className="h-6 w-6 text-white" />
                    )}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2 capitalize">{activeSection}</h2>
                {isDemo ? (
                  <>
                    <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
                      This area is read-only in Demo mode. Sign in to unlock {activeSection} and save your
                      chats.
                    </p>
                    <button
                      onClick={() => navigate('/auth')}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in to unlock
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-white/50 mb-2 max-w-md mx-auto">
                    {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} will be available in an
                    upcoming update.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Chat area */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
              {messages.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                  <img
                    src="/favicon.svg"
                    alt="CharmeeyAI"
                    className="relative mb-6 h-16 w-16"
                  />
                  <h2 className="text-2xl font-bold text-white mb-2">How can I help you today?</h2>
                  <p className="text-sm text-white/50 mb-8 max-w-md">
                    Ask me anything — from code generation to data analysis. I'm powered by Gemini.
                  </p>

                  {/* Suggestion cards */}
                  <div className="grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
                    {[
                      { title: 'Analyze data', desc: 'Process and visualize datasets', icon: BarChart3 },
                      { title: 'Write code', desc: 'Generate clean, documented code', icon: LayoutTemplate },
                      { title: 'Draft content', desc: 'Create marketing copy & docs', icon: MessageSquare },
                      { title: 'Debug issues', desc: 'Find and fix code problems', icon: Settings },
                    ].map((card) => (
                      <button
                        key={card.title}
                        onClick={() => setPrompt(`Help me ${card.title.toLowerCase()}: ${card.desc}`)}
                        className="group glass glass-hover rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/15 group-hover:bg-brand-600/25 transition-colors">
                            <card.icon className="h-4 w-4 text-brand-400" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{card.title}</div>
                            <div className="text-xs text-white/40 mt-0.5">{card.desc}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="space-y-6">
                  {/* Chat log toolbar: select / delete */}
                  <div className="flex items-center justify-end gap-2">
                    {chatSelectMode ? (
                      <>
                        <span className="text-xs text-white/60">{chatSelected.size} selected</span>
                        <button
                          onClick={deleteChatSelected}
                          disabled={chatSelected.size === 0}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30 disabled:opacity-40 disabled:hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete selected
                        </button>
                        <button
                          onClick={exitChatSelectMode}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 transition-colors hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setChatSelectMode(true)}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-white/5 text-white/50 hover:text-white`}
                          title="Select messages to delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Select
                        </button>
                        <button
                          onClick={deleteChatAll}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/30"
                          title="Delete the whole conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Clear all
                        </button>
                      </>
                    )}
                  </div>

                  {messages.map((msg, i) => {
                    const isSelected = chatSelected.has(i);
                    return (
                    <div key={i} className={`flex gap-4 animate-fade-up ${chatSelectMode ? 'cursor-pointer' : ''}`} onClick={chatSelectMode ? () => toggleChatSelect(i) : undefined}>
                      {chatSelectMode && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChatSelect(i);
                          }}
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                            isSelected ? 'bg-brand-500 border-brand-500' : 'border-white/30 hover:border-white/60'
                          }`}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleChatSelect(i);
                            }
                          }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      )}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-white/5'
                          : 'bg-gradient-to-br from-brand-500 to-violet-500'
                      }`}>
                        {msg.role === 'user' ? (
                          <User className="h-4 w-4 text-white/60" />
                        ) : (
                          <img src="/favicon.svg" alt="CharmeeyAI" className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-white">
                            {msg.role === 'user' ? 'You' : 'CharmeeyAI'}
                          </span>
                          {msg.model && <span className="text-[10px] text-white/30 font-mono">{msg.model}</span>}
                        </div>
                        {msg.attachment && (
                          <div className="flex items-center gap-2 mb-2 rounded-lg bg-white/5 px-2.5 py-1.5 w-fit text-xs">
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
                        <div className={`text-sm text-white/75 leading-relaxed transition-opacity ${chatSelectMode && !isSelected ? 'opacity-40' : ''}`}>
                          {msg.role === 'ai' ? (
                            <Markdown content={msg.content} />
                          ) : (
                            <span className="whitespace-pre-line">{msg.content}</span>
                          )}
                        </div>
                        {msg.role === 'ai' && (
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => copyMessage(i, msg.content)}
                              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
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
                            <button
                              onClick={() => downloadMessage(msg.content)}
                              className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Save
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}

                  {/* Generating indicator */}
                  {isGenerating && (
                    <div className="flex gap-4 animate-fade-in">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </div>
                      <div className="flex items-center gap-2 h-8">
                        <div className="flex gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0s' }} />
                          <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0.2s' }} />
                          <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce-dot" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <span className="text-xs text-white/40 font-mono">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input bar (chat only) */}
        {activeSection === 'chats' && (
          <div className="border-t border-white/[0.06] glass-strong p-4">
            <div className="max-w-3xl mx-auto">
              {attachment && (
                <div className="mb-2 flex items-center gap-2 rounded-lg glass px-2.5 py-1.5 w-fit text-xs">
                  {attachment.preview ? (
                    <img src={attachment.preview} alt={attachment.name} className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <ImagePlus className="h-4 w-4 text-white/50" />
                  )}
                  <span className="truncate text-white/60">{attachment.name}</span>
                  <button
                    onClick={() => setAttachment(null)}
                    className="ml-1 text-white/40 hover:text-white"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="glass rounded-xl p-2 flex items-end gap-1.5">
                <AttachmentButton onAttach={setAttachment} disabled={isGenerating} />
                <AutoGrowTextarea
                  value={prompt}
                  onChange={setPrompt}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Message CharmeeyAI... (paste or speak)"
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
                  onClick={handleSend}
                  disabled={(!prompt.trim() && !attachment) || isGenerating}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-lg shadow-brand-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-brand-500/40 transition-all"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-white/30 text-center mt-2 font-mono">
                CharmeeyAI can make mistakes. Verify important information.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}