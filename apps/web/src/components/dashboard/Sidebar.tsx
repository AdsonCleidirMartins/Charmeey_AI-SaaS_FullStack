import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronsUpDown, Plus, Search, Sparkles } from 'lucide-react';
import { NAV, NAV_GROUPS, type Section } from './nav';
import { useWorkspace } from './WorkspaceContext';
import { Button, Dropdown, MenuItem, Modal } from './ui';
import { inputClass } from '@/lib/format';
import { useToast } from '@/context/ToastContext';

function WorkspaceMark({ name, size = 28 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export default function Sidebar({
  active,
  collapsed,
  mobileOpen,
  onNavigate,
  onOpenSearch,
}: {
  active: Section;
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: (s: Section) => void;
  onOpenSearch: () => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { workspaces, workspace, plan, messagesUsed, setWorkspaceId, addWorkspace } = useWorkspace();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  // Collapsed state only applies on desktop; the mobile drawer always shows labels
  const c = collapsed;
  const usagePct = Math.min(100, (messagesUsed / plan.messages) * 100);

  const navButton = (id: Section) => {
    const item = NAV[id];
    const isActive = active === id;
    return (
      <button
        type="button"
        onClick={() => onNavigate(id)}
        title={c ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={`group relative w-full flex items-center gap-2.5 rounded-lg px-2.5 h-8 text-[13px] font-medium transition-colors ${
          c ? 'lg:justify-center lg:px-0' : ''
        } ${isActive ? 'bg-white/[0.07] text-white' : 'text-white/55 hover:text-white hover:bg-white/[0.04]'}`}
      >
        <item.icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-brand-400' : 'text-white/45 group-hover:text-white/80'}`} />
        <span className={c ? 'lg:hidden' : ''}>{item.label}</span>
        {item.badge && (
          <span
            className={`ml-auto rounded-full bg-brand-500/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-brand-300 ${
              c ? 'lg:hidden' : ''
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`app-sidebar fixed lg:relative inset-y-0 left-0 z-40 flex h-full flex-col border-r border-white/[0.06] transition-[width,transform] duration-300 w-64 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${c ? 'lg:w-[64px]' : 'lg:w-60'}`}
      aria-label="Sidebar"
    >
      {/* Workspace switcher */}
      <div className={`p-3 ${c ? 'lg:px-2' : ''}`}>
        <Dropdown
          width="w-64"
          trigger={({ toggle, open }) => (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              className={`w-full flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-white/[0.05] transition-colors ${c ? 'lg:justify-center' : ''}`}
            >
              <WorkspaceMark name={workspace.name} />
              <span className={`flex-1 min-w-0 text-left ${c ? 'lg:hidden' : ''}`}>
                <span className="block text-sm font-semibold text-white truncate">{workspace.name}</span>
                <span className="block text-[11px] text-white/40">{plan.name} plan</span>
              </span>
              <ChevronsUpDown className={`h-3.5 w-3.5 text-white/40 ${c ? 'lg:hidden' : ''}`} />
            </button>
          )}
        >
          {(close) => (
            <>
              <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-medium text-white/35">Workspaces</p>
              {workspaces.map((w) => (
                <MenuItem
                  key={w.id}
                  onClick={() => {
                    setWorkspaceId(w.id);
                    close();
                    toast({ kind: 'info', title: `Switched to ${w.name}` });
                  }}
                  right={w.id === workspace.id ? <Check className="h-4 w-4 text-brand-400" /> : undefined}
                >
                  <span className="inline-flex items-center gap-2">
                    <WorkspaceMark name={w.name} size={20} />
                    {w.name}
                  </span>
                </MenuItem>
              ))}
              <div className="my-1 h-px bg-white/[0.06]" />
              <MenuItem
                icon={Plus}
                onClick={() => {
                  close();
                  setCreating(true);
                }}
              >
                Create workspace
              </MenuItem>
            </>
          )}
        </Dropdown>

        {/* Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className={`mt-2 w-full flex items-center gap-2 rounded-lg surface-muted px-2.5 h-8 text-[13px] text-white/40 hover:text-white/70 transition-colors ${
            c ? 'lg:justify-center lg:px-0' : ''
          }`}
          title="Search (Ctrl K)"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className={`flex-1 text-left ${c ? 'lg:hidden' : ''}`}>Search…</span>
          <kbd className={`rounded border border-white/10 px-1 text-[10px] font-sans text-white/35 ${c ? 'lg:hidden' : ''}`}>⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto px-3 pb-3 ${c ? 'lg:px-2' : ''}`} aria-label="Dashboard">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} className={gi === 0 ? '' : 'mt-4'}>
            {group.label && (
              <>
                <p className={`px-2.5 mb-1 text-[11px] font-medium text-white/30 ${c ? 'lg:hidden' : ''}`}>{group.label}</p>
                {c && <div className="hidden lg:block mx-2 mb-2 h-px bg-white/[0.06]" />}
              </>
            )}
            <ul className="space-y-px">
              {group.items.map((id) => (
                <li key={id}>
                  {navButton(id)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: plan usage + support */}
      <div className={`border-t border-white/[0.06] p-3 space-y-2 ${c ? 'lg:px-2' : ''}`}>
        <div className={`rounded-xl surface-muted p-3 ${c ? 'lg:hidden' : ''}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-white">{plan.name} plan</span>
            <span className="text-white/40 tabular-nums">{Math.round(usagePct)}%</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-brand-500/15" role="progressbar" aria-valuenow={Math.round(usagePct)} aria-valuemin={0} aria-valuemax={100} aria-label="Messages used">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${usagePct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-white/40">
            {messagesUsed.toLocaleString()} of {plan.messages.toLocaleString()} messages
          </p>
          {plan.id !== 'business' && (
            <Button variant="primary" size="sm" icon={Sparkles} className="mt-2.5 w-full" onClick={() => onNavigate('billing')}>
              Upgrade
            </Button>
          )}
        </div>
        {navButton('support')}
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2 px-2.5 pt-1 text-[11px] text-white/30 hover:text-white/60 ${c ? 'lg:hidden' : ''}`}
        >
          <img src="/favicon.svg" alt="" className="h-3.5 w-3.5" />
          CharmeeyAI · Back to site
        </button>
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create workspace"
        description="Workspaces keep data, members and billing separate."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!newName.trim()}
              onClick={() => {
                addWorkspace(newName.trim());
                toast({ kind: 'success', title: 'Workspace created', description: `${newName.trim()} is on the Starter plan.` });
                setNewName('');
                setCreating(false);
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Marketing team"
          aria-label="Workspace name"
          maxLength={40}
          className={inputClass}
        />
      </Modal>
    </aside>
  );
}
