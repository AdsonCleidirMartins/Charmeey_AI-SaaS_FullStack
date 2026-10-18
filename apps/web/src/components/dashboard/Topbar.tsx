import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  ChevronRight,
  CircleHelp,
  CreditCard,
  ExternalLink,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  Sun,
  Trash2,
  User as UserIcon,
  WifiOff,
  MessageSquare,
  Info,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type Theme } from '@/context/ThemeContext';
import type { NotificationItem } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { NAV, groupOf, type Section } from './nav';
import { useWorkspace } from './WorkspaceContext';
import { Avatar, Badge, Dropdown, EmptyState, MenuItem } from './ui';

const themes: { id: Theme; icon: typeof Sun; label: string }[] = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'dark', icon: Moon, label: 'Dark' },
  { id: 'system', icon: Monitor, label: 'System' },
];

function parseSenderName(title: string): string {
  const prefix = 'New direct message from ';
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

export default function Topbar({
  section,
  onToggleSidebar,
  onOpenSearch,
  onNavigate,
  notifications,
}: {
  section: Section;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onNavigate: (s: Section, query?: string) => void;
  notifications: {
    items: NotificationItem[];
    unread: number;
    remove: (id: number) => void;
    markAllRead: () => void;
  };
}) {
  const navigate = useNavigate();
  const { user, isDemo, offline, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { workspace } = useWorkspace();
  const group = groupOf(section);
  const name = user?.name || 'Guest';

  const openNotification = (n: NotificationItem, close: () => void) => {
    close();
    notifications.remove(n.id);
    if (n.kind === 'dm' && n.sender_id) {
      onNavigate('room', `dm=${n.sender_id}&name=${encodeURIComponent(parseSenderName(n.title))}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl px-3 sm:px-5">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      <div className="h-4 w-px bg-white/10 hidden sm:block" aria-hidden />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden sm:inline text-white/40 truncate">{workspace.name}</span>
        {group && (
          <>
            <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-white/25" />
            <span className="hidden md:inline text-white/40">{group}</span>
          </>
        )}
        <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-white/25" />
        <span className="font-medium text-white truncate">{NAV[section].label}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        {offline && (
          <span title="The backend is unreachable. Auth and AI replies are simulated in the browser." className="hidden md:inline-flex">
            <Badge tone="warning">
              <WifiOff className="h-3 w-3" />
              Offline demo
            </Badge>
          </span>
        )}
        {isDemo && (
          <button
            type="button"
            onClick={() => navigate('/auth?mode=signup')}
            className="hidden sm:inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-500"
          >
            Sign up free
          </button>
        )}
        <button
          type="button"
          onClick={onOpenSearch}
          className="lg:hidden flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('support')}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5"
          aria-label="Help & Support"
          title="Help & Support"
        >
          <CircleHelp className="h-4 w-4" />
        </button>

        {/* Notifications */}
        <Dropdown
          align="right"
          mobileSheet
          width="sm:w-[380px]"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`Notifications${notifications.unread ? `, ${notifications.unread} unread` : ''}`}
              className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                open ? 'bg-white/5 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Bell className="h-4 w-4" />
              {notifications.unread > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-ink-950" aria-hidden />
              )}
            </button>
          )}
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between px-2.5 py-2">
                <span className="text-sm font-semibold text-white">Notifications</span>
                {notifications.unread > 0 && (
                  <button type="button" onClick={notifications.markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.items.length === 0 ? (
                  <EmptyState icon={BellOff} title="You’re all caught up" description="New messages and workspace alerts appear here." />
                ) : (
                  notifications.items.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-start gap-3 rounded-lg px-2.5 py-2.5 hover:bg-white/[0.04] cursor-pointer"
                      onClick={() => openNotification(n, close)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openNotification(n, close)}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5">
                        {n.kind === 'dm' ? <MessageSquare className="h-3.5 w-3.5 text-brand-400" /> : <Info className="h-3.5 w-3.5 text-white/50" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] break-words ${n.is_read ? 'text-white/60' : 'text-white font-medium'}`}>{n.title}</p>
                        {n.body && <p className="mt-0.5 text-xs text-white/40 line-clamp-2">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-white/30">{n.created_at ? timeAgo(n.created_at) : ''}</p>
                      </div>
                      {!n.is_read && <span className="mt-2 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" aria-label="Unread" />}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          notifications.remove(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-rose-400"
                        aria-label="Dismiss notification"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </Dropdown>

        {/* User menu */}
        <Dropdown
          align="right"
          width="w-64"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label="Account menu"
              className="ml-1 rounded-full ring-2 ring-transparent hover:ring-white/10 transition"
            >
              <Avatar name={name} size={30} />
            </button>
          )}
        >
          {(close) => (
            <>
              <div className="flex items-center gap-3 px-2.5 py-2">
                <Avatar name={name} size={34} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{name}</p>
                  <p className="text-xs text-white/40 truncate">{isDemo ? 'Demo workspace' : user?.email}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-white/[0.06]" />
              <MenuItem icon={UserIcon} onClick={() => { close(); onNavigate('settings', 'tab=profile'); }}>
                Profile & settings
              </MenuItem>
              <MenuItem icon={CreditCard} onClick={() => { close(); onNavigate('billing'); }}>
                Billing
              </MenuItem>
              <MenuItem icon={ExternalLink} onClick={() => { close(); navigate('/'); }}>
                Back to website
              </MenuItem>
              <div className="my-1 h-px bg-white/[0.06]" />
              <div className="px-2.5 py-1.5">
                <p className="text-[11px] text-white/35 mb-1.5">Theme</p>
                <div className="grid grid-cols-3 gap-1 rounded-lg surface-muted p-0.5" role="group" aria-label="Theme">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      aria-pressed={theme === t.id}
                      className={`flex items-center justify-center gap-1 rounded-md py-1 text-[11px] font-medium transition-colors ${
                        theme === t.id ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white'
                      }`}
                    >
                      <t.icon className="h-3 w-3" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="my-1 h-px bg-white/[0.06]" />
              {isDemo ? (
                <MenuItem icon={LogIn} onClick={() => { close(); navigate('/auth'); }}>
                  Sign in
                </MenuItem>
              ) : (
                <MenuItem icon={LogOut} danger onClick={() => { close(); void signOut(); }}>
                  Sign out
                </MenuItem>
              )}
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
