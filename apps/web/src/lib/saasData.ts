/** Seed data for the admin areas of the demo workspace (members, keys, billing, audit…). */

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export type Role = 'Owner' | 'Admin' | 'Member' | 'Viewer';
export const ROLES: Role[] = ['Owner', 'Admin', 'Member', 'Viewer'];

export interface Member {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: 'active' | 'invited';
  lastActive: string; // ISO
  twoFactor: boolean;
}

export const seedMembers: Member[] = [
  { id: 1, name: 'Ava Thompson', email: 'ava@acme.io', role: 'Owner', status: 'active', lastActive: ago(4), twoFactor: true },
  { id: 2, name: 'Marcus Lee', email: 'marcus@acme.io', role: 'Admin', status: 'active', lastActive: ago(38), twoFactor: true },
  { id: 3, name: 'Priya Nair', email: 'priya@acme.io', role: 'Member', status: 'active', lastActive: ago(150), twoFactor: false },
  { id: 4, name: 'Diego Alvarez', email: 'diego@acme.io', role: 'Member', status: 'active', lastActive: ago(60 * 26), twoFactor: true },
  { id: 5, name: 'Hana Sato', email: 'hana@acme.io', role: 'Viewer', status: 'active', lastActive: ago(60 * 72), twoFactor: false },
  { id: 6, name: 'jordan@partner.co', email: 'jordan@partner.co', role: 'Member', status: 'invited', lastActive: ago(60 * 20), twoFactor: false },
];

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  created: string;
  lastUsed: string | null;
  createdBy: string;
}

export const seedApiKeys: ApiKey[] = [
  { id: 'k1', name: 'Production backend', prefix: 'chm_live_3f9a', scopes: ['chat:write', 'data:read'], created: ago(60 * 24 * 46), lastUsed: ago(2), createdBy: 'Ava Thompson' },
  { id: 'k2', name: 'Staging', prefix: 'chm_test_b71c', scopes: ['chat:write', 'data:read', 'data:write'], created: ago(60 * 24 * 65), lastUsed: ago(60 * 5), createdBy: 'Marcus Lee' },
  { id: 'k3', name: 'Analytics export job', prefix: 'chm_live_e20d', scopes: ['analytics:read'], created: ago(60 * 24 * 12), lastUsed: null, createdBy: 'Priya Nair' },
];

export const API_SCOPES = [
  { id: 'chat:write', label: 'Chat', description: 'Send prompts and receive completions' },
  { id: 'data:read', label: 'Data (read)', description: 'Read datasets and Data Studio results' },
  { id: 'data:write', label: 'Data (write)', description: 'Upload and delete datasets' },
  { id: 'analytics:read', label: 'Analytics', description: 'Read usage and billing metrics' },
];

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastDelivery: { status: number; at: string } | null;
}

export const WEBHOOK_EVENTS = ['chat.completed', 'dataset.uploaded', 'member.invited', 'usage.threshold', 'invoice.paid'];

export const seedWebhooks: Webhook[] = [
  { id: 'w1', url: 'https://hooks.acme.io/charmeey', events: ['chat.completed', 'usage.threshold'], enabled: true, lastDelivery: { status: 200, at: ago(9) } },
  { id: 'w2', url: 'https://api.acme.io/billing/events', events: ['invoice.paid'], enabled: false, lastDelivery: { status: 500, at: ago(60 * 30) } },
];

export interface Integration {
  id: string;
  name: string;
  category: 'Communication' | 'Storage' | 'Data' | 'CRM' | 'Developer' | 'Automation';
  description: string;
  color: string; // brand tile background
  letter: string;
}

export const integrationsCatalog: Integration[] = [
  { id: 'slack', name: 'Slack', category: 'Communication', description: 'Ask CharmeeyAI from any channel and get usage alerts.', color: '#4A154B', letter: 'S' },
  { id: 'teams', name: 'Microsoft Teams', category: 'Communication', description: 'Bring AI answers and reports into Teams chats.', color: '#4B53BC', letter: 'T' },
  { id: 'gdrive', name: 'Google Drive', category: 'Storage', description: 'Import Sheets and CSVs straight into Data Studio.', color: '#1A73E8', letter: 'G' },
  { id: 'notion', name: 'Notion', category: 'Storage', description: 'Use Notion pages as context and export summaries.', color: '#2F2F2F', letter: 'N' },
  { id: 'snowflake', name: 'Snowflake', category: 'Data', description: 'Query warehouse tables with natural language.', color: '#29B5E8', letter: '❄' },
  { id: 'postgres', name: 'PostgreSQL', category: 'Data', description: 'Connect a read replica for live dashboards.', color: '#336791', letter: 'P' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', description: 'Summarize deals and draft follow-ups.', color: '#FF7A59', letter: 'H' },
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', description: 'Pipeline insights and account briefs.', color: '#00A1E0', letter: 'S' },
  { id: 'github', name: 'GitHub', category: 'Developer', description: 'Code review assistant on pull requests.', color: '#24292F', letter: 'G' },
  { id: 'zapier', name: 'Zapier', category: 'Automation', description: 'Trigger 6,000+ apps from CharmeeyAI events.', color: '#FF4F00', letter: 'Z' },
];

export const seedConnected = ['slack', 'gdrive', 'github'];

export interface Plan {
  id: 'starter' | 'pro' | 'business';
  name: string;
  monthly: number;
  annual: number;
  seats: number;
  messages: number;
  features: string[];
}

export const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', monthly: 0, annual: 0, seats: 1, messages: 1000, features: ['1 seat', '1,000 messages / mo', '5 Data Studio uploads', 'Community support'] },
  { id: 'pro', name: 'Pro', monthly: 49, annual: 39, seats: 10, messages: 50000, features: ['Up to 10 seats', '50,000 messages / mo', 'Unlimited Data Studio', 'API access & webhooks', 'Priority support'] },
  { id: 'business', name: 'Business', monthly: 129, annual: 99, seats: 50, messages: 250000, features: ['Up to 50 seats', '250,000 messages / mo', 'SSO & audit log export', 'Custom integrations', 'Dedicated success manager'] },
];

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Open' | 'Refunded';
  description: string;
}

export const seedInvoices: Invoice[] = Array.from({ length: 8 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i, 1);
  return {
    id: `INV-${2026}${String(10 - i).padStart(2, '0')}-${(4821 + i * 37).toString()}`,
    date: d.toISOString(),
    amount: i === 0 ? 245 : i < 4 ? 245 : 196,
    status: i === 0 ? 'Open' : i === 5 ? 'Refunded' : 'Paid',
    description: `Pro plan · ${i < 4 ? 5 : 4} seats`,
  };
});

export interface AuditEvent {
  id: number;
  actor: string;
  action: string;
  category: 'auth' | 'member' | 'billing' | 'api' | 'data' | 'settings';
  target: string;
  ip: string;
  at: string;
}

const auditTemplates: Omit<AuditEvent, 'id' | 'at'>[] = [
  { actor: 'Ava Thompson', action: 'Signed in', category: 'auth', target: 'Web · Chrome on macOS', ip: '84.21.13.7' },
  { actor: 'Marcus Lee', action: 'Created API key', category: 'api', target: 'Analytics export job', ip: '102.88.4.19' },
  { actor: 'Ava Thompson', action: 'Invited member', category: 'member', target: 'jordan@partner.co', ip: '84.21.13.7' },
  { actor: 'Priya Nair', action: 'Uploaded dataset', category: 'data', target: 'q3_revenue.csv', ip: '49.36.211.4' },
  { actor: 'Marcus Lee', action: 'Changed role', category: 'member', target: 'Hana Sato → Viewer', ip: '102.88.4.19' },
  { actor: 'System', action: 'Payment succeeded', category: 'billing', target: 'INV-202609-4858', ip: '—' },
  { actor: 'Diego Alvarez', action: 'Failed sign-in', category: 'auth', target: 'Wrong password', ip: '177.54.9.201' },
  { actor: 'Ava Thompson', action: 'Enabled SSO enforcement', category: 'settings', target: 'Workspace security', ip: '84.21.13.7' },
  { actor: 'Priya Nair', action: 'Connected integration', category: 'settings', target: 'GitHub', ip: '49.36.211.4' },
  { actor: 'Marcus Lee', action: 'Revoked API key', category: 'api', target: 'Old CI token', ip: '102.88.4.19' },
  { actor: 'Hana Sato', action: 'Exported report', category: 'data', target: 'Weekly KPI report.pdf', ip: '126.12.88.3' },
  { actor: 'Ava Thompson', action: 'Updated billing email', category: 'billing', target: 'finance@acme.io', ip: '84.21.13.7' },
];

export const seedAudit: AuditEvent[] = Array.from({ length: 36 }, (_, i) => ({
  ...auditTemplates[i % auditTemplates.length],
  id: i + 1,
  at: ago(i * 97 + 3),
}));

export interface ActivityItem {
  id: number;
  who: string;
  what: string;
  at: string;
}

export const recentActivity: ActivityItem[] = [
  { id: 1, who: 'Priya Nair', what: 'uploaded q3_revenue.csv to Data Studio', at: ago(12) },
  { id: 2, who: 'Marcus Lee', what: 'ran the “Weekly KPI report” template', at: ago(47) },
  { id: 3, who: 'Ava Thompson', what: 'invited jordan@partner.co as Member', at: ago(130) },
  { id: 4, who: 'Diego Alvarez', what: 'shared “Launch email for Data Studio”', at: ago(60 * 5) },
  { id: 5, who: 'Hana Sato', what: 'exported the support tickets dashboard', at: ago(60 * 22) },
];

export const faqs = [
  { q: 'How are messages counted?', a: 'Each prompt you send and each response you receive counts as one message. Data Studio charts don’t count; asking the AI about a dataset does.' },
  { q: 'Is my data used to train models?', a: 'No. Prompts, files and datasets are processed only to answer your request and are never used for model training.' },
  { q: 'Can I change plans at any time?', a: 'Yes. Upgrades take effect immediately and are prorated. Downgrades apply at the end of the current billing period.' },
  { q: 'Which file types does Data Studio support?', a: 'CSV and TSV files up to 5 MB in the demo (100 MB on paid plans). Excel and Google Sheets import are available through integrations.' },
  { q: 'How do I rotate an API key?', a: 'Create a new key, deploy it, then revoke the old one from Developers → API Keys. Revoked keys stop working immediately.' },
  { q: 'Do you support SSO?', a: 'SAML SSO and SCIM provisioning are included on the Business plan and above.' },
];

export const systemStatus = [
  { name: 'AI Chat API', status: 'operational' as const, uptime: 99.98 },
  { name: 'Data Studio', status: 'operational' as const, uptime: 99.95 },
  { name: 'Webhooks', status: 'degraded' as const, uptime: 99.41 },
  { name: 'Dashboard', status: 'operational' as const, uptime: 100 },
];
