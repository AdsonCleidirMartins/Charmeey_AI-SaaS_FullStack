import {
  LayoutDashboard,
  MessageSquare,
  LayoutTemplate,
  History,
  Database,
  BarChart3,
  MessagesSquare,
  Users,
  KeyRound,
  Puzzle,
  CreditCard,
  ScrollText,
  Settings,
  LifeBuoy,
  type LucideIcon,
} from 'lucide-react';

export type Section =
  | 'overview'
  | 'chats'
  | 'templates'
  | 'history'
  | 'studio'
  | 'analytics'
  | 'room'
  | 'members'
  | 'api-keys'
  | 'integrations'
  | 'billing'
  | 'audit-log'
  | 'settings'
  | 'support';

export interface NavEntry {
  id: Section;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
}

export const NAV: Record<Section, NavEntry> = {
  overview: { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Workspace summary and quick actions' },
  chats: { id: 'chats', label: 'AI Chat', icon: MessageSquare, description: 'Chat with Gemini' },
  templates: { id: 'templates', label: 'Templates', icon: LayoutTemplate, description: 'Reusable prompt library' },
  history: { id: 'history', label: 'History', icon: History, description: 'Past conversations' },
  studio: { id: 'studio', label: 'Data Studio', icon: Database, description: 'Upload a CSV and build charts', badge: 'New' },
  analytics: { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Usage, latency and spend' },
  room: { id: 'room', label: 'Team Chat', icon: MessagesSquare, description: 'Real-time room and DMs' },
  members: { id: 'members', label: 'Members', icon: Users, description: 'Invite people and manage roles' },
  'api-keys': { id: 'api-keys', label: 'API Keys', icon: KeyRound, description: 'Keys and webhooks' },
  integrations: { id: 'integrations', label: 'Integrations', icon: Puzzle, description: 'Connect your tools' },
  billing: { id: 'billing', label: 'Billing', icon: CreditCard, description: 'Plan, usage and invoices' },
  'audit-log': { id: 'audit-log', label: 'Audit Log', icon: ScrollText, description: 'Security and admin events' },
  settings: { id: 'settings', label: 'Settings', icon: Settings, description: 'Profile, security and workspace' },
  support: { id: 'support', label: 'Help & Support', icon: LifeBuoy, description: 'Docs, FAQ and contact' },
};

export const NAV_GROUPS: { label: string | null; items: Section[] }[] = [
  { label: null, items: ['overview'] },
  { label: 'Workspace', items: ['chats', 'templates', 'history'] },
  { label: 'Insights', items: ['studio', 'analytics'] },
  { label: 'Team', items: ['room', 'members'] },
  { label: 'Developers', items: ['api-keys', 'integrations'] },
  { label: 'Admin', items: ['billing', 'audit-log', 'settings'] },
];

export const SECTIONS = new Set<Section>(Object.keys(NAV) as Section[]);

export function groupOf(id: Section): string | null {
  return NAV_GROUPS.find((g) => g.items.includes(id))?.label ?? null;
}
