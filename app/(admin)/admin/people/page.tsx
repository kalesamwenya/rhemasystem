'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { api, assetUrl } from '@/lib/api';
import { employeeDepartmentOptions } from '@/lib/employee-account-options';
import { ChevronLeft, ChevronRight, Edit3, Eye, Plus, Search, Trash2, Upload, X } from 'lucide-react';

type PersonType = 'staff' | 'lecturer';
type DirectoryTab = PersonType | 'admin';
type Status = 'Active' | 'Inactive';
type Person = { id: number; person_type: PersonType; employee_number: string; first_name: string; last_name: string; email: string; phone: string; department: string; title: string; avatar: string; access_role: string; permissions: string | string[]; status: Status; notes: string };
type AdminAccount = { id: string; name: string; email: string; avatar: string; employee_number: string | null; department: string; role: string; status: 'active' | 'suspended'; last_login_at: string | null };
type FormState = Omit<Person, 'id' | 'permissions'> & { id?: number; permissions: string[]; other_department: string; initial_password: string };
const permissionOptions = ['people.view', 'people.manage', 'courses.manage', 'students.manage', 'reports.view'];
const blank: FormState = { person_type: 'staff', employee_number: '', first_name: '', last_name: '', email: '', phone: '', department: '', other_department: '', title: '', avatar: '', access_role: 'Viewer', permissions: ['people.view'], status: 'Active', notes: '', initial_password: '' };

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || 'U';
}

function PersonAvatar({ name, path }: { name: string; path: string }) {
  const [failedSrc, setFailedSrc] = useState('');
  const src = path ? assetUrl(path) : '';

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-black text-slate-700">
      {src && failedSrc !== src
        ? <Image src={src} alt="" width={36} height={36} unoptimized onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
        : <span aria-label={`${name} initials`}>{initials(name)}</span>}
    </div>
  );
}

export default function PeoplePage() {
  const [tab, setTab] = useState<DirectoryTab>('staff');
  const [people, setPeople] = useState<Person[]>([]);
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [canViewAdminAccounts, setCanViewAdminAccounts] = useState(false);
  const [adminAccountsError, setAdminAccountsError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'All' | Status>('All');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pageSize = 6;

  const load = async () => { try { const response = await api.people.list() as { data?: Person[] }; setPeople(response.data || []); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load people.'); } };
  const loadAdminAccounts = async () => { try { const response = await api.adminAccessUsers() as { success?: boolean; users?: AdminAccount[]; message?: string }; if (!response.success || !Array.isArray(response.users)) throw new Error(response.message || 'Administrator accounts could not be loaded.'); setAdminAccounts(response.users); setCanViewAdminAccounts(true); setAdminAccountsError(''); } catch (loadError) { setCanViewAdminAccounts(false); setTab((current) => current === 'admin' ? 'staff' : current); setAdminAccountsError(loadError instanceof Error ? loadError.message : 'Administrator accounts could not be loaded.'); } };
  useEffect(() => { load(); }, []);
  useEffect(() => { loadAdminAccounts(); }, []);
  const visible = useMemo(() => people.filter((person) => tab !== 'admin' && person.person_type === tab && (status === 'All' || person.status === status) && `${person.first_name} ${person.last_name} ${person.employee_number} ${person.email} ${person.department}`.toLowerCase().includes(search.toLowerCase())), [people, search, status, tab]);
  const visibleAdminAccounts = useMemo(() => adminAccounts.filter((account) => (status === 'All' || (status === 'Active' ? account.status === 'active' : account.status === 'suspended')) && `${account.name} ${account.email} ${account.employee_number || ''} ${account.department} ${account.role}`.toLowerCase().includes(search.toLowerCase())), [adminAccounts, search, status]);
  const visibleCount = tab === 'admin' ? visibleAdminAccounts.length : visible.length;
  const pages = Math.max(1, Math.ceil(visibleCount / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const adminRows = visibleAdminAccounts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const update = (key: keyof FormState, value: string | string[]) => setEditing((current) => current ? { ...current, [key]: value } : current);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const { other_department, ...profile } = editing;
    const department = editing.department === 'Other' ? other_department.trim() : editing.department;
    if (!department) {
      setError('Select or enter a department.');
      return;
    }
    try {
      const response = await api.people.save({ ...profile, department }) as { message?: string; data?: { employee_number?: string } };
      setEditing(null);
      setMessage(`${response.message || 'Profile saved.'}${response.data?.employee_number ? ` Employee number: ${response.data.employee_number}.` : ''}`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save profile.');
    }
  };
  const remove = async (person: Person) => { if (!(await confirmWithApp(`Delete ${person.first_name} ${person.last_name}?`, { title: 'Delete profile?', confirmText: 'Delete', tone: 'danger' }))) return; try { await api.people.remove(person.id); setMessage('Profile deleted.'); await load(); } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete profile.'); } };
  const uploadAvatar = async (file: File) => { try { const body = await api.uploads.image(file, 'people') as { data?: { path?: string } }; update('avatar', assetUrl(body.data?.path || '')); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload avatar.'); } };
  const editPerson = (person: Person) => { let parsed: string[] = []; try { parsed = Array.isArray(person.permissions) ? person.permissions : JSON.parse(person.permissions || '[]'); } catch { parsed = []; } const isStandardDepartment = employeeDepartmentOptions.includes(person.department as typeof employeeDepartmentOptions[number]); setEditing({ ...person, department: isStandardDepartment ? person.department : 'Other', other_department: isStandardDepartment ? '' : person.department, permissions: parsed, initial_password: '' }); };
  const openTab = (next: DirectoryTab) => { setTab(next); setPage(1); };

  return <div className="space-y-6 pb-12">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Administration</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">People directory</h1><p className="mt-1 text-sm text-slate-500">Manage staff and lecturers, profiles, roles, and access.</p></div>{tab === 'admin' ? <Link href="/admin/staff-access" className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus className="h-4 w-4" />Add admin account</Link> : <button onClick={() => setEditing({ ...blank, person_type: tab })} className="inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus className="h-4 w-4" />Add {tab}</button>}</header>
    {(message || error) && <div className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span>{error || message}</span><button onClick={() => { setError(''); setMessage(''); }} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200"><div className="flex gap-2"><button onClick={() => openTab('staff')} className={`border-b-2 px-5 py-3 text-xs font-black uppercase tracking-wider ${tab === 'staff' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'}`}>Staff ({people.filter((person) => person.person_type === 'staff').length})</button><button onClick={() => openTab('lecturer')} className={`border-b-2 px-5 py-3 text-xs font-black uppercase tracking-wider ${tab === 'lecturer' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'}`}>Lecturers ({people.filter((person) => person.person_type === 'lecturer').length})</button>{canViewAdminAccounts && <button onClick={() => openTab('admin')} className={`border-b-2 px-5 py-3 text-xs font-black uppercase tracking-wider ${tab === 'admin' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500'}`}>Admin accounts ({adminAccounts.length})</button>}</div><div className="flex flex-wrap gap-2 pb-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search people" className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm" /></div><select value={status} onChange={(event) => { setStatus(event.target.value as 'All' | Status); setPage(1); }} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>All</option><option>Active</option><option>Inactive</option></select></div></div>
    <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm ${tab === 'admin' ? 'hidden' : ''}`}>
      <table className="min-w-[900px] w-full text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
          <tr>{['Person', 'Employee no.', 'Department', 'Access role', 'Contact', 'Status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-2.5">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((person) => {
            const name = `${person.first_name} ${person.last_name}`.trim();
            return (
              <tr key={person.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <PersonAvatar name={name} path={person.avatar || ''} />
                    <div className="min-w-0">
                      <Link href={`/admin/people/${person.id}`} className="block truncate font-bold text-slate-900 hover:text-red-700">{name}</Link>
                      <p className="truncate text-[11px] text-slate-500">{person.title || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{person.employee_number || '—'}</td>
                <td className="px-3 py-2">{person.department || '—'}</td>
                <td className="px-3 py-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black">{person.access_role || 'Viewer'}</span></td>
                <td className="px-3 py-2">
                  <p className="max-w-48 truncate" title={person.email}>{person.email || '—'}</p>
                  <p className="text-[11px] text-slate-500">{person.phone || '—'}</p>
                </td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${person.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{person.status}</span></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1.5">
                    <Link href={`/admin/people/${person.id}`} className="rounded-lg border border-slate-200 p-1.5 text-slate-600" aria-label="View profile"><Eye className="h-3.5 w-3.5" /></Link>
                    <button onClick={() => editPerson(person)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600" aria-label="Edit person"><Edit3 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => remove(person)} className="rounded-lg border border-red-200 p-1.5 text-red-600" aria-label="Delete person"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="p-8 text-center text-sm text-slate-500">No matching records.</p>}
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-500">
        <span>{visible.length ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, visible.length)} of ${visible.length}` : '0 records'}</span>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
          <span>Page {currentPage} of {pages}</span>
          <button disabled={currentPage === pages} onClick={() => setPage(Math.min(pages, currentPage + 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
    {tab === 'admin' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-base font-black text-slate-950">Admin accounts</h2><p className="mt-1 text-xs text-slate-500">IT can view staff profiles and manage email, access, and password resets.</p></div><button type="button" onClick={() => void loadAdminAccounts()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Refresh</button></div>
      {adminAccountsError ? <p role="alert" className="p-4 text-sm text-red-700">{adminAccountsError}</p> : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>{['Administrator', 'Employee no.', 'Department', 'Access profile', 'Status', 'Profile'].map((heading) => <th key={heading} className="px-3 py-2.5">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminRows.map((account) => (
                  <tr key={account.id}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <PersonAvatar name={account.name} path={account.avatar || ''} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{account.name}</p>
                          <p className="truncate text-[11px] text-slate-500">{account.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px]">{account.employee_number || '—'}</td>
                    <td className="px-3 py-2">{account.department || '—'}</td>
                    <td className="px-3 py-2 capitalize">{account.role}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${account.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{account.status}</span></td>
                    <td className="px-3 py-2"><Link href={`/admin/people/admin/${account.id}`} className="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-blue-900 hover:bg-blue-50">View profile</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!adminAccountsError && adminRows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No admin accounts found.</p>}
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-500">
            <span>{visibleCount ? `${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, visibleCount)} of ${visibleCount}` : '0 records'}</span>
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              <span>Page {currentPage} of {pages}</span>
              <button disabled={currentPage === pages} onClick={() => setPage(Math.min(pages, currentPage + 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      )}
    </section>}
    {editing && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={save} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-wider text-red-600">{editing.id ? 'Edit profile' : 'New profile'}</p><h2 className="mt-1 text-2xl font-black text-slate-900">{editing.person_type === 'staff' ? 'Staff member' : 'Lecturer'}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X className="h-5 w-5" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Employee number<input value={editing.employee_number || ''} readOnly={editing.person_type === 'staff' && !editing.id} placeholder={editing.person_type === 'staff' && !editing.id ? 'Generated automatically' : ''} onChange={(event) => update('employee_number', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 read-only:bg-slate-50" />{editing.person_type === 'staff' && !editing.id && <span className="mt-1 block font-normal text-slate-500">A unique employee number will be generated when you save.</span>}</label><label className="text-xs font-bold text-slate-600">Status<select value={editing.status} onChange={(event) => update('status', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"><option>Active</option><option>Inactive</option></select></label><label className="text-xs font-bold text-slate-600">First name<input value={editing.first_name} onChange={(event) => update('first_name', event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-600">Last name<input value={editing.last_name} onChange={(event) => update('last_name', event.target.value)} required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-xs font-bold text-slate-600">Email<input type="email" value={editing.email || ''} onChange={(event) => update('email', event.target.value)} required={editing.person_type === 'lecturer' || (editing.person_type === 'staff' && !editing.id)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" />{editing.person_type === 'staff' && !editing.id && <span className="mt-1 block font-normal text-slate-500">Login credentials will be emailed to this address.</span>}</label>{editing.person_type === 'lecturer' && <label className="text-xs font-bold text-slate-600">Initial / new password<input type="password" autoComplete="new-password" minLength={12} maxLength={4096} required={!editing.id} value={editing.initial_password} onChange={(event) => update('initial_password', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /><span className="mt-1 block font-normal text-slate-500">Required for new lecturer accounts; at least 12 characters. Leave blank to keep the current password.</span></label>}<label className="text-xs font-bold text-slate-600">Phone<input value={editing.phone || ''} onChange={(event) => update('phone', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>    <label className="text-xs font-bold text-slate-600">Department<select required value={editing.department || ''} onChange={(event) => { update('department', event.target.value); if (event.target.value !== 'Other') update('other_department', ''); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option value="">Select a department</option>{employeeDepartmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>{editing.department === 'Other' && <label className="text-xs font-bold text-slate-600">Department name<input required maxLength={120} value={editing.other_department} onChange={(event) => update('other_department', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>}<label className="text-xs font-bold text-slate-600">Title / position<input value={editing.title || ''} onChange={(event) => update('title', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><div className="sm:col-span-2"><p className="text-xs font-bold text-slate-600">Avatar</p><label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700"><Upload className="h-4 w-4" />Upload avatar<input type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadAvatar(file); }} /></label>{editing.avatar && <img src={editing.avatar} alt="Avatar preview" className="mt-3 h-20 w-20 rounded-xl object-cover" />}</div>    <label className="text-xs font-bold text-slate-600">Staff profile access level<select value={editing.access_role || 'Viewer'} onChange={(event) => update('access_role', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"><option>Administrator</option><option>Manager</option><option>Editor</option><option>Viewer</option></select></label><fieldset className="sm:col-span-2"><legend className="text-xs font-bold text-slate-600">Staff profile permissions</legend><p className="mt-1 text-[11px] font-normal text-slate-500">These are staff-directory settings. Admin login access levels are managed separately in Staff Access.</p><div className="mt-2 flex flex-wrap gap-2">{permissionOptions.map((permission) => <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"><input type="checkbox" checked={editing.permissions.includes(permission)} onChange={(event) => update('permissions', event.target.checked ? [...editing.permissions, permission] : editing.permissions.filter((item) => item !== permission))} />{permission}</label>)}</div></fieldset><label className="text-xs font-bold text-slate-600 sm:col-span-2">Notes<textarea value={editing.notes || ''} onChange={(event) => update('notes', event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600">Cancel</button><button className="rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white">Save profile</button></div></form></div>}
  </div>;
}
