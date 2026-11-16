'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import { employeeDepartmentOptions } from '@/lib/employee-account-options';

type AdminRole = 'owner' | 'administrator' | 'it' | 'finance' | 'academic' | 'registrar' | 'support' | 'operations';
type AccountStatus = 'active' | 'suspended';
type AdminAccount = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  employee_number: string | null;
  department: string;
  role: AdminRole;
  status: AccountStatus;
  last_login_at: string | null;
};
type AccessDraft = Pick<AdminAccount, 'department' | 'role' | 'status'>;
type NewAccountDraft = { name: string; email: string; department: string; otherDepartment: string; role: AdminRole };
type AdminAccessResponse = {
  success: boolean;
  message?: string;
  users?: AdminAccount[];
  current_admin_id?: string;
  current_admin_role?: AdminRole;
  can_assign_privileged_roles?: boolean;
};

const staffRoles: AdminRole[] = ['finance', 'academic', 'registrar', 'support', 'operations'];
const allRoles: AdminRole[] = ['owner', 'administrator', 'it', ...staffRoles];
const roleLabels: Record<AdminRole, string> = {
  owner: 'Owner',
  administrator: 'Administrator',
  it: 'IT administrator',
  finance: 'Finance',
  academic: 'Academic',
  registrar: 'Registrar',
  support: 'Support',
  operations: 'Operations',
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'A';
}

function formatLastSignIn(value: string | null) {
  if (!value) return 'Never';
  const date = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function StaffAccessPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [drafts, setDrafts] = useState<Record<string, AccessDraft>>({});
  const [currentAdminId, setCurrentAdminId] = useState('');
  const [currentAdminRole, setCurrentAdminRole] = useState<AdminRole>('it');
  const [canAssignPrivilegedRoles, setCanAssignPrivilegedRoles] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [newAccount, setNewAccount] = useState<NewAccountDraft>({
    name: '',
    email: '',
    department: '',
    otherDepartment: '',
    role: 'support',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.adminAccessUsers() as AdminAccessResponse;
      if (!response.success || !Array.isArray(response.users) || !response.current_admin_id) {
        throw new Error(response.message || 'Staff access could not be loaded.');
      }
      setAccounts(response.users);
      setDrafts(Object.fromEntries(response.users.map((account) => [
        account.id,
        { department: account.department, role: account.role, status: account.status },
      ])));
      setCurrentAdminId(response.current_admin_id);
      setCurrentAdminRole(response.current_admin_role || 'it');
      setCanAssignPrivilegedRoles(response.can_assign_privileged_roles === true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Staff access could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAccounts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAccounts]);

  const updateDraft = <Key extends keyof AccessDraft>(id: string, key: Key, value: AccessDraft[Key]) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [key]: value },
    }));
  };

  const saveAccess = async (account: AdminAccount) => {
    const draft = drafts[account.id];
    if (!draft) return;
    setSavingId(account.id);
    setError('');
    setMessage('');
    try {
      const response = await api.saveAdminAccess({ id: account.id, ...draft }) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'Staff access could not be saved.');
      setMessage(`${account.name}: ${response.message || 'Access saved.'}`);
      await loadAccounts();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Staff access could not be saved.');
    } finally {
      setSavingId('');
    }
  };

  const createAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const department = newAccount.department === 'Other'
      ? newAccount.otherDepartment.trim()
      : newAccount.department;
    if (!department) {
      setError('Enter the department for this account.');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const response = await api.createAdminAccess({
        name: newAccount.name,
        email: newAccount.email,
        department,
        role: newAccount.role,
      }) as {
        success: boolean;
        message?: string;
        employee_number?: string;
      };
      if (!response.success) throw new Error(response.message || 'The account could not be created.');
      setMessage(`${response.message || 'Account created.'}${response.employee_number ? ` Employee number: ${response.employee_number}.` : ''}`);
      setNewAccount({ name: '', email: '', department: '', otherDepartment: '', role: 'support' });
      await loadAccounts();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The account could not be created.');
    } finally {
      setCreating(false);
    }
  };

  const canEditPrivilegedAccounts = currentAdminRole === 'owner' || currentAdminRole === 'administrator';

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">IT administration</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Staff access</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Assign a department and permission profile to staff administrator accounts. Access changes take effect after the account signs in again.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAccounts()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ['Finance', 'Payments, budgets, assets and finance reports.'],
          ['Academic', 'Courses, assessments, library and student affairs.'],
          ['Registrar, Support & Operations', 'Each profile grants access to its related administrative modules.'],
        ].map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-black text-slate-900">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        ))}
      </section>

      {(error || message) && (
        <div role={error ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>{error || message}</p>
        </div>
      )}

      <form onSubmit={(event) => void createAccount(event)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black text-slate-900">Create admin or staff login</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">An employee number and temporary password will be generated and emailed to the new user.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Full name<input required maxLength={160} value={newAccount.name} onChange={(event) => setNewAccount((current) => ({ ...current, name: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-xs font-bold text-slate-600">Email<input required type="email" value={newAccount.email} onChange={(event) => setNewAccount((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>
          <label className="text-xs font-bold text-slate-600">Department<select required value={newAccount.department} onChange={(event) => setNewAccount((current) => ({ ...current, department: event.target.value, otherDepartment: event.target.value === 'Other' ? current.otherDepartment : '' }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5"><option value="">Select a department</option>{employeeDepartmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
          {newAccount.department === 'Other' && <label className="text-xs font-bold text-slate-600">Department name<input required maxLength={120} value={newAccount.otherDepartment} onChange={(event) => setNewAccount((current) => ({ ...current, otherDepartment: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5" /></label>}
          <label className="text-xs font-bold text-slate-600">System access level<select value={newAccount.role} onChange={(event) => setNewAccount((current) => ({ ...current, role: event.target.value as AdminRole }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5">{(canAssignPrivilegedRoles ? allRoles : staffRoles).map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select><span className="mt-1 block text-[11px] font-normal text-slate-500">Controls which admin areas the login can access.</span></label>
        </div>
        <button type="submit" disabled={creating} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create account and email credentials
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[860px] w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Administrator</th>
              <th className="px-3 py-2.5">Employee no.</th>
              <th className="px-3 py-2.5">Department</th>
              <th className="px-3 py-2.5">Access</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Last sign-in</th>
              <th className="px-3 py-2.5">Save</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {accounts.map((account) => {
              const draft = drafts[account.id] || { department: account.department, role: account.role, status: account.status };
              const isPrivilegedTarget = ['owner', 'administrator', 'it'].includes(account.role);
              const canEdit = account.id !== currentAdminId && (canEditPrivilegedAccounts || !isPrivilegedTarget);
              const roleOptions = canAssignPrivilegedRoles ? allRoles : staffRoles;
              const optionsWithCurrent = Array.from(new Set([account.role, ...roleOptions]));
              const isDirty = draft.department !== account.department || draft.role !== account.role || draft.status !== account.status;
              return (
                <tr key={account.id} className="align-middle">
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-[10px] font-black text-blue-900">
                        {account.avatar ? (
                          <div
                            role="img"
                            aria-label={`${account.name} avatar`}
                            className="h-full w-full bg-cover bg-center"
                            style={{ backgroundImage: `url("${assetUrl(account.avatar)}")` }}
                          />
                        ) : (
                          <span aria-hidden="true">{initials(account.name)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900" title={account.name}>{account.name}</p>
                        <p className="truncate text-[11px] text-slate-500" title={account.email}>{account.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-600">{account.employee_number || '—'}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`${account.name} department`}
                      value={draft.department}
                      disabled={!canEdit}
                      maxLength={120}
                      onChange={(event) => updateDraft(account.id, 'department', event.target.value)}
                      className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`${account.name} permission profile`}
                      value={draft.role}
                      disabled={!canEdit}
                      onChange={(event) => updateDraft(account.id, 'role', event.target.value as AdminRole)}
                      className="w-36 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      {optionsWithCurrent.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                    </select>
                    {account.role === 'it' && <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-blue-800"><ShieldCheck className="h-3 w-3" />Full access</p>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      aria-label={`${account.name} account status`}
                      value={draft.status}
                      disabled={!canEdit}
                      onChange={(event) => updateDraft(account.id, 'status', event.target.value as AccountStatus)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-800 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-500" title={account.last_login_at || undefined}>
                    {formatLastSignIn(account.last_login_at)}
                  </td>
                  <td className="px-3 py-2">
                    {canEdit && (
                      <button
                        type="button"
                        disabled={!isDirty || savingId === account.id}
                        onClick={() => void saveAccess(account)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-950 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {savingId === account.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Save
                      </button>
                    )}
                    {!canEdit && <span className="whitespace-nowrap text-[11px] text-slate-400">{account.id === currentAdminId ? 'Your account' : 'Protected'}</span>}
                  </td>
                </tr>
              );
            })}
            {!isLoading && accounts.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-500">No administrator accounts found.</td></tr>
            )}
          </tbody>
        </table>
        {isLoading && <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading staff access…</div>}
      </div>

      {!canAssignPrivilegedRoles && (
        <p className="text-xs leading-5 text-slate-500">
          IT administrators can manage staff profiles, but owner, administrator, and IT-level access is protected. An owner or administrator must assign those profiles.
        </p>
      )}
    </div>
  );
}
