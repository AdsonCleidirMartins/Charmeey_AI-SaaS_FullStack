import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RoomChat from '@/components/RoomChat';
import useNotifications from '@/hooks/useNotifications';
import { conversationHistory, type HistoryItem } from '@/lib/mockData';
import Analytics from '@/components/dashboard/Analytics';
import DataStudio from '@/components/dashboard/DataStudio';
import HistoryView from '@/components/dashboard/History';
import Templates from '@/components/dashboard/Templates';
import Overview from '@/components/dashboard/Overview';
import Members from '@/components/dashboard/Members';
import ApiKeys from '@/components/dashboard/ApiKeys';
import Integrations from '@/components/dashboard/Integrations';
import Billing from '@/components/dashboard/Billing';
import AuditLog from '@/components/dashboard/AuditLog';
import Support from '@/components/dashboard/Support';
import SettingsView from '@/components/dashboard/SettingsView';
import ChatView, { type ChatMessage } from '@/components/dashboard/ChatView';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';
import CommandPalette from '@/components/dashboard/CommandPalette';
import { WorkspaceProvider } from '@/components/dashboard/WorkspaceContext';
import { SECTIONS, type Section } from '@/components/dashboard/nav';
import { PageHeader } from '@/components/dashboard/ui';

const COLLAPSE_KEY = 'charmeey_sidebar_collapsed';

function DashboardShell() {
  const navigate = useNavigate();
  const { section: raw } = useParams<{ section: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const section: Section = SECTIONS.has(raw as Section) ? (raw as Section) : 'overview';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [dmTarget, setDmTarget] = useState<{ id: number; name: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const notifications = useNotifications();

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Unknown sections fall back to the overview URL
  useEffect(() => {
    if (raw && !SECTIONS.has(raw as Section)) navigate('/dashboard/overview', { replace: true });
  }, [raw, navigate]);

  // ?dm=<id>&name=<name> opens a direct-message thread in Team Chat
  useEffect(() => {
    const dm = searchParams.get('dm');
    if (!dm) return;
    const peerId = Number(dm);
    if (Number.isFinite(peerId) && peerId > 0) setDmTarget({ id: peerId, name: searchParams.get('name') || 'User' });
    const next = new URLSearchParams(searchParams);
    next.delete('dm');
    next.delete('name');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (section !== 'room') setDmTarget(null);
  }, [section]);

  // ?prompt=<text> (handoff from the site assistant) starts a fresh chat with the prompt prefilled
  useEffect(() => {
    const handed = searchParams.get('prompt');
    if (handed === null) return;
    setMessages([]);
    setPrompt(handed);
    const next = new URLSearchParams(searchParams);
    next.delete('prompt');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = useCallback(
    (s: Section, query?: string) => {
      setMobileOpen(false);
      navigate(`/dashboard/${s}${query ? `?${query}` : ''}`);
    },
    [navigate]
  );

  const startChat = useCallback(
    (text: string) => {
      if (!text) setMessages([]);
      setPrompt(text);
      go('chats');
    },
    [go]
  );

  const openConversation = useCallback(
    (item: HistoryItem | number) => {
      const h = typeof item === 'number' ? conversationHistory.find((c) => c.id === item) : item;
      if (!h) return;
      setMessages(h.transcript.map((m) => ({ ...m, model: m.role === 'ai' ? h.model : undefined })));
      go('chats');
    },
    [go]
  );

  const toggleSidebar = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  const content = (() => {
    switch (section) {
      case 'overview':
        return <Overview onNavigate={go} onOpenConversation={openConversation} />;
      case 'chats':
        return <ChatView messages={messages} setMessages={setMessages} prompt={prompt} setPrompt={setPrompt} onOpenStudio={() => go('studio')} />;
      case 'templates':
        return <Templates onUse={startChat} />;
      case 'history':
        return <HistoryView onOpen={openConversation} />;
      case 'studio':
        return <DataStudio onAskAI={startChat} />;
      case 'analytics':
        return <Analytics />;
      case 'room':
        return (
          <div className="flex flex-1 min-h-0 flex-col px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-[88px] sm:pb-24 gap-6 max-w-7xl w-full mx-auto">
            <PageHeader title="Team Chat" description="Talk with your workspace in real time, or open a direct message." />
            <RoomChat className="flex-1 min-h-[480px]" initialDmPeer={dmTarget} />
          </div>
        );
      case 'members':
        return <Members />;
      case 'api-keys':
        return <ApiKeys />;
      case 'integrations':
        return <Integrations />;
      case 'billing':
        return <Billing />;
      case 'audit-log':
        return <AuditLog />;
      case 'support':
        return <Support onNavigate={go} />;
      case 'settings':
        return <SettingsView />;
    }
  })();

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-ink-950">
      <Sidebar active={section} collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={go} onOpenSearch={() => setPaletteOpen(true)} />

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          section={section}
          onToggleSidebar={toggleSidebar}
          onOpenSearch={() => setPaletteOpen(true)}
          onNavigate={go}
          notifications={notifications}
        />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden" id="main">
          {content}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={go}
        onStartChat={startChat}
        onOpenConversation={openConversation}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <WorkspaceProvider>
      <DashboardShell />
    </WorkspaceProvider>
  );
}
