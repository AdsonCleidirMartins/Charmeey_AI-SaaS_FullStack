import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoreHorizontal, Search, ShieldCheck, UserPlus, Mail, Trash2, RotateCw, Users, ShieldAlert } from 'lucide-react';
import { ROLES, type Member, type Role } from '@/lib/saasData';
import { inputClass, timeAgo } from '@/lib/format';
import { useToast } from '@/context/ToastContext';
import { useWorkspace } from './WorkspaceContext';
import { Avatar, Badge, Button, Card, Dropdown, EmptyState, Field, MenuItem, Modal, Page, PageHeader, Tabs } from './ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const roleHelp: Record<Role, string> = {
  Owner: 'Full access, including billing and deleting the workspace',
  Admin: 'Manage members, keys, integrations and billing',
  Member: 'Use chat, Data Studio and templates',
  Viewer: 'Read-only access to shared conversations and dashboards',
};

type Filter = 'all' | 'admins' | 'pending';

export default function Members() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { members, setMembers, plan } = useWorkspace();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emails, setEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Member');
  const [inviteError, setInviteError] = useState('');
  const [removing, setRemoving] = useState<Member | null>(null);

  useEffect(() => {
    if (params.get('invite')) {
      setInviteOpen(true);
      params.delete('invite');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const seatsUsed = members.length;
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (m) =>
        (filter === 'all' || (filter === 'admins' ? m.role === 'Owner' || m.role === 'Admin' : m.status === 'invited')) &&
        (!q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    );
  }, [members, query, filter]);

  const sendInvites = () => {
    const list = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (list.length === 0) return setInviteError('Enter at least one email address.');
    const bad = list.find((e) => !EMAIL_RE.test(e));
    if (bad) return setInviteError(`“${bad}” isn’t a valid email address.`);
    const dupe = list.find((e) => members.some((m) => m.email === e));
    if (dupe) return setInviteError(`${dupe} is already in this workspace.`);
    if (seatsUsed + list.length > plan.seats)
      return setInviteError(`Your ${plan.name} plan includes ${plan.seats} seats. Upgrade to invite more people.`);

    setMembers((prev) => [
      ...prev,
      ...list.map((email, i) => ({
        id: Date.now() + i,
        name: email,
        email,
        role: inviteRole,
        status: 'invited' as const,
        lastActive: new Date().toISOString(),
        twoFactor: false,
      })),
    ]);
    toast({ kind: 'success', title: `${list.length} invitation${list.length > 1 ? 's' : ''} sent`, description: `Invited as ${inviteRole}.` });
    setEmails('');
    setInviteError('');
    setInviteOpen(false);
  };

  const changeRole = (m: Member, role: Role) => {
    setMembers((prev) => prev.map((x) => (x.id === m.id ? { ...x, role } : x)));
    toast({ kind: 'success', title: 'Role updated', description: `${m.name} is now ${role === 'Admin' ? 'an' : 'a'} ${role}.` });
  };

  const counts = {
    all: members.length,
    admins: members.filter((m) => m.role === 'Owner' || m.role === 'Admin').length,
    pending: members.filter((m) => m.status === 'invited').length,
  };

  return (
    <Page>
      <PageHeader
        title="Members"
        description="Invite teammates and control what they can access."
        actions={
          <Button variant="primary" icon={UserPlus} onClick={() => setInviteOpen(true)}>
            Invite members
          </Button>
        }
      />

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-white/50">Seats used</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {seatsUsed} <span className="text-base font-normal text-white/40">/ {plan.seats}</span>
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-brand-500/15">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, (seatsUsed / plan.seats) * 100)}%` }} />
          </div>
        </Card>
        <Card>
          <p className="text-xs text-white/50">Pending invitations</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.pending}</p>
          <p className="mt-2 text-xs text-white/40">Invites expire after 7 days.</p>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <p className="text-xs text-white/50">Two-factor coverage</p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {Math.round((members.filter((m) => m.twoFactor).length / Math.max(1, counts.all - counts.pending)) * 100)}%
          </p>
          <p className="mt-2 text-xs text-white/40">of active members have 2FA enabled.</p>
        </Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
          <Tabs
            value={filter}
            onChange={setFilter}
            tabs={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'admins', label: 'Admins', count: counts.admins },
              { id: 'pending', label: 'Pending', count: counts.pending },
            ]}
          />
          <div className="relative mb-2 w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" aria-label="Search members" className={`${inputClass} pl-8 h-8 py-0`} />
          </div>
        </div>

        {list.length === 0 ? (
          <EmptyState icon={Users} title="No members found" description="Try a different search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-white/40">
                  <th scope="col" className="px-4 sm:px-5 py-3 font-medium">Member</th>
                  <th scope="col" className="px-3 py-3 font-medium">Role</th>
                  <th scope="col" className="px-3 py-3 font-medium hidden md:table-cell">Security</th>
                  <th scope="col" className="px-3 py-3 font-medium hidden sm:table-cell">Last active</th>
                  <th scope="col" className="px-2 sm:px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 sm:px-5 py-3 max-w-[170px] sm:max-w-none">
                      <div className="flex items-center gap-3">
                        {m.status === 'invited' ? (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/20">
                            <Mail className="h-3.5 w-3.5 text-white/40" />
                          </span>
                        ) : (
                          <Avatar name={m.name} />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{m.status === 'invited' ? m.email : m.name}</p>
                          <p className="text-xs text-white/40 truncate">{m.status === 'invited' ? 'Invitation pending' : m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {m.role === 'Owner' ? (
                        <Badge tone="brand">Owner</Badge>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as Role)}
                          aria-label={`Role for ${m.name}`}
                          className="rounded-md bg-transparent border border-white/10 px-2 py-1 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                        >
                          {ROLES.filter((r) => r !== 'Owner').map((r) => (
                            <option key={r} value={r} className="bg-ink-900">
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      {m.status === 'invited' ? (
                        <span className="text-xs text-white/30">—</span>
                      ) : m.twoFactor ? (
                        <Badge tone="success">
                          <ShieldCheck className="h-3 w-3" /> 2FA on
                        </Badge>
                      ) : (
                        <Badge tone="warning">
                          <ShieldAlert className="h-3 w-3" /> No 2FA
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-white/50 hidden sm:table-cell">
                      {m.status === 'invited' ? `Invited ${timeAgo(m.lastActive)}` : timeAgo(m.lastActive)}
                    </td>
                    <td className="px-2 sm:px-5 py-3 text-right">
                      {m.role !== 'Owner' && (
                        <Dropdown
                          align="right"
                          width="w-48"
                          trigger={({ toggle }) => (
                            <button type="button" onClick={toggle} className="rounded-md p-1.5 text-white/40 hover:text-white hover:bg-white/5" aria-label={`Actions for ${m.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          )}
                        >
                          {(close) => (
                            <>
                              {m.status === 'invited' && (
                                <MenuItem
                                  icon={RotateCw}
                                  onClick={() => {
                                    close();
                                    toast({ kind: 'success', title: 'Invitation resent', description: m.email });
                                  }}
                                >
                                  Resend invite
                                </MenuItem>
                              )}
                              <MenuItem
                                icon={Trash2}
                                danger
                                onClick={() => {
                                  close();
                                  setRemoving(m);
                                }}
                              >
                                {m.status === 'invited' ? 'Revoke invite' : 'Remove member'}
                              </MenuItem>
                            </>
                          )}
                        </Dropdown>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteError('');
        }}
        title="Invite members"
        description={`${plan.seats - seatsUsed} seat${plan.seats - seatsUsed === 1 ? '' : 's'} left on your ${plan.name} plan.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" icon={Mail} onClick={sendInvites}>
              Send invites
            </Button>
          </>
        }
      >
        <Field label="Email addresses" hint="Separate multiple emails with commas." htmlFor="invite-emails">
          <textarea
            id="invite-emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            placeholder="alex@company.com, sam@company.com"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <Field label="Role">
          <div className="grid gap-2">
            {ROLES.filter((r) => r !== 'Owner').map((r) => (
              <label
                key={r}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  inviteRole === r ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/10 hover:bg-white/[0.03]'
                }`}
              >
                <input type="radio" name="invite-role" checked={inviteRole === r} onChange={() => setInviteRole(r)} className="mt-0.5 accent-brand-500" />
                <span>
                  <span className="block text-sm font-medium text-white">{r}</span>
                  <span className="block text-xs text-white/45">{roleHelp[r]}</span>
                </span>
              </label>
            ))}
          </div>
        </Field>
        {inviteError && <p role="alert" className="text-xs text-rose-400">{inviteError}</p>}
      </Modal>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={removing?.status === 'invited' ? 'Revoke invitation?' : 'Remove member?'}
        description={
          removing?.status === 'invited'
            ? `${removing?.email} will no longer be able to join.`
            : `${removing?.name} will lose access to this workspace immediately. Their conversations stay with the workspace.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!removing) return;
                setMembers((prev) => prev.filter((x) => x.id !== removing.id));
                toast({ kind: 'success', title: removing.status === 'invited' ? 'Invitation revoked' : 'Member removed' });
                setRemoving(null);
              }}
            >
              {removing?.status === 'invited' ? 'Revoke' : 'Remove'}
            </Button>
          </>
        }
      />
    </Page>
  );
}
