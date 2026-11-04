'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, KeyRound, Loader2, Save, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type AdminRole = 'owner' | 'administrator' | 'it' | 'finance' | 'academic' | 'registrar' | 'support' | 'operations';
type AdminStatus = 'active' | 'suspended';
type AdminAccount = {
  id: string;
  name: string;
  email: string;
  employee_number: string | null;
  department: string;
  role: AdminRole;
  status: AdminStatus;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};
type AdminAccountForm = Pick<AdminAccount, 'name' | 'email' | 'department' | 'role' | 'status'>;
type AdminAccountResponse = {
  success: boolean;
  message?: string;
  data?: AdminAccount;
  current_admin_id?: string;
  current_admin_role?: string;
  can_assign_privileged_roles?: boolean;
};

const roles: AdminRole[] = ['owner', 'administrator', 'it', 'finance', 'academic', 'registrar', 'support', 'operations'];

export default function AdminAccountProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState<AdminAccountForm | null>(null);
  const [canAssignPrivilegedRoles, setCanAssignPrivilegedRoles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadAccount = useCallback(async (id: string) => {
    setError('');
    try {
      const response = await api.adminAccount(id) as AdminAccountResponse;
      if (!response.success || !response.data) throw new Error(response.message || 'The administrator profile could not be loaded.');
      setAccount(response.data);
      setForm({
        name: response.data.name,
        email: response.data.email,
        department: response.data.department,
        role: response.data.role,
        status: response.data.status,
      });
      setCanAssignPrivilegedRoles(response.can_assign_privileged_roles === true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The administrator profile could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void params.then(({ id }) => {
      if (!active) return;
      void loadAccount(id);
    });
    return () => { active = false; };
  }, [loadAccount, params]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !form) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.manageAdminAccount({ id: account.id, action: 'update', ...form }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'The administrator profile could not be updated.');
      setNotice(response.message || 'Administrator profile updated.');
      await loadAccount(account.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The administrator profile could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (!account) return;
    setResettingPassword(true);
    setError('');
    setNotice('');
    try {
      const response = await api.manageAdminAccount({ id: account.id, action: 'reset_password' }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'The password could not be reset.');
      setNotice(response.message || 'A temporary password was emailed to the administrator.');
      await loadAccount(account.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The password could not be reset.');
    } finally {
      setResettingPassword(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <Link href="/admin/people" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> People directory
      </Link>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : account && form ? (
        <>
          <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-red-50 p-3 text-red-700"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-700">Administrator account profile</p>
                <h1 className="mt-1 text-2xl font-black text-slate-950">{account.name}</h1>
                <p className="mt-1 text-sm text-slate-500">{account.employee_number || 'Employee number not assigned'} · {account.email}</p>
              </div>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <form onSubmit={(event) => void saveProfile(event)} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-lg font-black text-slate-900">Profile and access</h2>
                <p className="mt-1 text-xs text-slate-500">Update staff details and assign the correct administrator access level.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Full name<input required maxLength={160} value={form.name} onChange={(event) => setForm((current) => current ? { ...current, name: event.target.value } : current)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label className="text-xs font-bold text-slate-600">Login email<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => current ? { ...current, email: event.target.value } : current)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /><span className="mt-1 block font-normal text-slate-500">Changing the email signs out this account and sends a notice to the new address.</span></label>
                <label className="text-xs font-bold text-slate-600">Department<input required maxLength={120} value={form.department} onChange={(event) => setForm((current) => current ? { ...current, department: event.target.value } : current)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>
                <label className="text-xs font-bold text-slate-600">Access profile<select value={form.role} disabled={!canAssignPrivilegedRoles && ['owner', 'administrator', 'it'].includes(account.role)} onChange={(event) => setForm((current) => current ? { ...current, role: event.target.value as AdminRole } : current)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100">{(canAssignPrivilegedRoles ? roles : Array.from(new Set([account.role, ...roles.filter((role) => !['owner', 'administrator', 'it'].includes(role))]))).map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}</select></label>
                <label className="text-xs font-bold text-slate-600">Account status<select value={form.status} onChange={(event) => setForm((current) => current ? { ...current, status: event.target.value as AdminStatus } : current)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
              </div>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save profile and access
              </button>
            </form>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-700" /><h2 className="font-black text-slate-900">Password assistance</h2></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Generate a one-time temporary password, email it to the account holder, and sign out existing sessions.</p>
                <button type="button" onClick={() => void resetPassword()} disabled={resettingPassword} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-black text-amber-900 disabled:opacity-60">
                  {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Reset password and email user
                </button>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-black text-slate-900">Account activity</h2>
                <dl className="mt-3 space-y-3 text-xs">
                  <div><dt className="font-bold text-slate-400">Employee number</dt><dd className="mt-1 font-mono text-slate-800">{account.employee_number || 'Not assigned'}</dd></div>
                  <div><dt className="font-bold text-slate-400">Created</dt><dd className="mt-1 text-slate-800">{new Date(`${account.created_at.replace(' ', 'T')}Z`).toLocaleString()}</dd></div>
                  <div><dt className="font-bold text-slate-400">Last sign-in</dt><dd className="mt-1 text-slate-800">{account.last_login_at ? new Date(`${account.last_login_at.replace(' ', 'T')}Z`).toLocaleString() : 'Never'}</dd></div>
                  <div><dt className="font-bold text-slate-400">Last profile update</dt><dd className="mt-1 text-slate-800">{new Date(`${account.updated_at.replace(' ', 'T')}Z`).toLocaleString()}</dd></div>
                </dl>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
