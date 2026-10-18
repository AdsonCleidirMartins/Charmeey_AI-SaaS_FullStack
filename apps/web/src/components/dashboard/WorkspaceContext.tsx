import { createContext, useContext, type ReactNode } from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import { PLANS, seedMembers, type Member, type Plan } from '@/lib/saasData';

export interface Workspace {
  id: string;
  name: string;
  planId: Plan['id'];
}

interface WorkspaceValue {
  workspaces: Workspace[];
  workspace: Workspace;
  plan: Plan;
  cycle: 'monthly' | 'annual';
  members: Member[];
  setWorkspaceId: (id: string) => void;
  addWorkspace: (name: string) => void;
  renameWorkspace: (name: string) => void;
  setPlan: (id: Plan['id'], cycle: 'monthly' | 'annual') => void;
  setMembers: (fn: (prev: Member[]) => Member[]) => void;
  /** Messages used this billing period (sample figure). */
  messagesUsed: number;
}

const Ctx = createContext<WorkspaceValue | undefined>(undefined);

const DEFAULT_WORKSPACES: Workspace[] = [
  { id: 'acme', name: 'Acme Inc', planId: 'pro' },
  { id: 'personal', name: 'Personal', planId: 'starter' },
];

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = usePersistentState<Workspace[]>('charmeey_workspaces', DEFAULT_WORKSPACES);
  const [activeId, setActiveId] = usePersistentState('charmeey_workspace_active', 'acme');
  const [cycle, setCycle] = usePersistentState<'monthly' | 'annual'>('charmeey_billing_cycle', 'monthly');
  const [members, setMembersState] = usePersistentState<Member[]>('charmeey_members', seedMembers);

  const workspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const plan = PLANS.find((p) => p.id === workspace.planId) ?? PLANS[1];

  const value: WorkspaceValue = {
    workspaces,
    workspace,
    plan,
    cycle,
    members,
    messagesUsed: workspace.planId === 'starter' ? 412 : 31240,
    setWorkspaceId: setActiveId,
    addWorkspace: (name) => {
      const id = `ws-${Date.now()}`;
      setWorkspaces((prev) => [...prev, { id, name, planId: 'starter' }]);
      setActiveId(id);
    },
    renameWorkspace: (name) =>
      setWorkspaces((prev) => prev.map((w) => (w.id === workspace.id ? { ...w, name } : w))),
    setPlan: (planId, nextCycle) => {
      setWorkspaces((prev) => prev.map((w) => (w.id === workspace.id ? { ...w, planId } : w)));
      setCycle(nextCycle);
    },
    setMembers: (fn) => setMembersState((prev) => fn(prev)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return v;
}
