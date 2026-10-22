'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Boxes, ImagePlus, Loader2, Pencil, Plus, Search, Wrench, X } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';

type AssetStatus = 'available' | 'in_repair' | 'retired' | 'disposed';
type AssetRepair = {
  id: number;
  identified_problem: string;
  repair_fix: string;
  repair_cost: number | null;
  currency: string;
  status_after: AssetStatus;
  reported_by: string;
  created_at: string;
};
type SchoolAsset = {
  id: number;
  asset_code: string;
  serial_number: string;
  name: string;
  category: string;
  department: string;
  description: string;
  image_path: string;
  status: AssetStatus;
  identified_problem: string | null;
  repair_fix: string | null;
  repair_cost: number | null;
  repair_currency: string;
  repairs: AssetRepair[];
};
type AssetDraft = {
  asset_code: string;
  serial_number: string;
  name: string;
  category: string;
  department: string;
  description: string;
  image_path: string;
  status: AssetStatus;
  repair: { identified_problem: string; repair_fix: string; repair_cost: string; currency: string };
};
type AssetsResponse = {
  success: true;
  data: SchoolAsset[];
  user?: { department?: string };
};

const blankDraft = (department = ''): AssetDraft => ({
  asset_code: '',
  serial_number: '',
  name: '',
  category: '',
  department,
  description: '',
  image_path: '',
  status: 'available',
  repair: { identified_problem: '', repair_fix: '', repair_cost: '', currency: 'ZMW' },
});

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white';

function isAssetsResponse(value: unknown): value is AssetsResponse {
  return Boolean(value && typeof value === 'object'
    && (value as { success?: unknown }).success === true
    && Array.isArray((value as { data?: unknown }).data));
}

function isUploadResponse(value: unknown): value is { success: true; data: { path: string } } {
  return Boolean(value && typeof value === 'object'
    && (value as { success?: unknown }).success === true
    && typeof (value as { data?: { path?: unknown } }).data?.path === 'string');
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<SchoolAsset[]>([]);
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssetStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AssetDraft>(() => blankDraft());

  async function loadAssets() {
    try {
      const response: unknown = await api.assets.list();
      if (!isAssetsResponse(response)) throw new Error('The asset service returned an invalid response.');
      setAssets(response.data);
      setDepartment(response.user?.department || '');
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load school assets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.assets.list()
      .then((response: unknown) => {
        if (!isAssetsResponse(response)) throw new Error('The asset service returned an invalid response.');
        if (active) {
          setAssets(response.data);
          setDepartment(response.user?.department || '');
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load school assets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => (statusFilter === 'all' || asset.status === statusFilter)
      && (!query || `${asset.asset_code} ${asset.serial_number} ${asset.name} ${asset.category} ${asset.department} ${asset.description}`.toLowerCase().includes(query)));
  }, [assets, search, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setDraft(blankDraft(department));
    setModalOpen(true);
  }

  function openEdit(asset: SchoolAsset) {
    setEditingId(asset.id);
    setDraft({
      asset_code: asset.asset_code,
      serial_number: asset.serial_number,
      name: asset.name,
      category: asset.category,
      department: asset.department,
      description: asset.description,
      image_path: asset.image_path,
      status: asset.status,
      repair: { identified_problem: '', repair_fix: '', repair_cost: '', currency: asset.repair_currency || 'ZMW' },
    });
    setModalOpen(true);
  }

  async function uploadImage(file?: File) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const response: unknown = await api.uploads.image(file, 'assets');
      if (!isUploadResponse(response)) throw new Error('The image service returned an invalid response.');
      setDraft((current) => ({ ...current, image_path: response.data.path }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload the asset image.');
    } finally {
      setUploading(false);
    }
  }

  async function saveAsset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.assets.save({ ...draft, ...(editingId ? { id: editingId } : {}) });
      setModalOpen(false);
      await loadAssets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the asset.');
    } finally {
      setSaving(false);
    }
  }

  const inRepairCount = assets.filter((asset) => asset.status === 'in_repair').length;

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">School property</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Asset register</h1>
          <p className="mt-1 text-sm text-slate-500">Record school-owned equipment, identify its department and track condition and repair costs.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white"><Plus size={15} /> Record asset</button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric title="School assets" value={assets.length} icon={<Boxes className="text-blue-700" />} />
        <Metric title="Currently in repair" value={inRepairCount} icon={<Wrench className="text-amber-700" />} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <label className="relative block min-w-52 flex-1 sm:max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search code, item, department" className={`${inputClass} pl-9`} /></label>
          <select aria-label="Filter assets by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"><option value="all">All statuses</option><option value="available">Available</option><option value="in_repair">In repair</option><option value="retired">Retired</option><option value="disposed">Disposed</option></select>
        </div>
        {loading ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500"><tr><th className="px-4 py-3">Asset</th><th className="px-4 py-3">ID / serial</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Condition</th><th className="px-4 py-3">Latest repair</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>{filteredAssets.map((asset) => (
                <tr key={asset.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3"><div className="flex min-w-56 items-start gap-3">{asset.image_path ? <Image src={assetUrl(asset.image_path)} alt={asset.name} width={56} height={56} unoptimized className="h-14 w-14 rounded-lg object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Boxes size={20} /></div>}<div><p className="font-bold text-slate-900">{asset.name}</p><p className="text-xs text-slate-500">{asset.category}</p><p className="mt-1 max-w-xs text-xs text-slate-500">{asset.description}</p></div></div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs"><p className="font-bold text-slate-800">{asset.asset_code}</p><p className="mt-1 text-slate-500">{asset.serial_number || 'No serial'}</p></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{asset.department || '—'}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${asset.status === 'available' ? 'bg-emerald-50 text-emerald-700' : asset.status === 'in_repair' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{asset.status.replace('_', ' ')}</span></td>
                  <td className="max-w-64 px-4 py-3 text-xs text-slate-600">{asset.repairs[0] ? <><p className="line-clamp-2 font-semibold text-slate-800">{asset.repairs[0].identified_problem}</p><p className="mt-1">{asset.repairs[0].repair_fix || 'Fix not recorded'}</p><p className="mt-1 font-bold">{asset.repairs[0].repair_cost === null ? 'Cost not recorded' : `${asset.repairs[0].currency} ${Number(asset.repairs[0].repair_cost).toFixed(2)}`}</p><p className="mt-1 text-slate-400">{asset.repairs[0].created_at}</p></> : 'No repair history'}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => openEdit(asset)} aria-label={`Edit ${asset.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button><span className="ml-1 text-[11px] text-slate-500">{asset.repairs.length} repairs</span></td>
                </tr>
              ))}{filteredAssets.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">{assets.length ? 'No assets match your filters.' : 'No school assets recorded yet. Add the first item to start the register.'}</td></tr>}</tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveAsset} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">School property</p><h2 className="mt-1 text-xl font-black text-slate-900">{editingId ? 'Update asset' : 'Record asset'}</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close form" className="rounded-lg bg-slate-100 p-2"><X size={16} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Asset ID code"><input required maxLength={80} value={draft.asset_code} onChange={(event) => setDraft({ ...draft, asset_code: event.target.value.toUpperCase() })} placeholder="e.g. SCH-IT-001" className={inputClass} /></Field>
          <Field label="Serial number"><input maxLength={120} value={draft.serial_number} onChange={(event) => setDraft({ ...draft, serial_number: event.target.value })} className={inputClass} /></Field>
          <Field label="Item name"><input required maxLength={180} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={inputClass} /></Field>
          <Field label="Category"><input required maxLength={100} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Computer equipment" className={inputClass} /></Field>
          <Field label="Department / location"><input maxLength={150} value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} className={inputClass} /></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as AssetStatus })} className={inputClass}><option value="available">Available</option><option value="in_repair">In repair</option><option value="retired">Retired</option><option value="disposed">Disposed</option></select></Field>
        </div>
        <Field label="Description"><textarea required rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={inputClass} /></Field>
        <Field label="Asset image (JPG, PNG, WEBP or GIF; max 8 MB)">
          <div className="flex flex-wrap items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"><ImagePlus size={16} />{uploading ? 'Uploading…' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={(event) => { void uploadImage(event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" /></label>{draft.image_path && <Image src={assetUrl(draft.image_path)} alt="Asset preview" width={64} height={64} unoptimized className="h-16 w-16 rounded-lg object-cover" />}{!draft.image_path && <span className="text-xs text-slate-500">An image is required before saving.</span>}</div>
        </Field>
        <section className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <div><h3 className="text-sm font-black text-slate-800">Repair record</h3><p className="mt-1 text-xs text-slate-500">Add a problem and the work/cost when reporting or completing a repair.</p></div>
          <Field label="Identified problem"><textarea rows={2} value={draft.repair.identified_problem} onChange={(event) => setDraft({ ...draft, repair: { ...draft.repair, identified_problem: event.target.value } })} className={inputClass} /></Field>
          <Field label="Fix / work performed"><textarea rows={2} value={draft.repair.repair_fix} onChange={(event) => setDraft({ ...draft, repair: { ...draft.repair, repair_fix: event.target.value } })} className={inputClass} /></Field>
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Repair cost"><input type="number" min="0" max="100000000" step="0.01" value={draft.repair.repair_cost} onChange={(event) => setDraft({ ...draft, repair: { ...draft.repair, repair_cost: event.target.value } })} className={inputClass} /></Field><Field label="Currency"><select value={draft.repair.currency} onChange={(event) => setDraft({ ...draft, repair: { ...draft.repair, currency: event.target.value } })} className={inputClass}><option value="ZMW">ZMW</option><option value="GHS">GHS</option><option value="USD">USD</option></select></Field></div>
          {editingId && assets.find((asset) => asset.id === editingId)?.repairs.length ? <div className="border-t border-amber-200 pt-3"><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-600">Previous repair history</p><div className="max-h-32 space-y-2 overflow-y-auto">{assets.find((asset) => asset.id === editingId)?.repairs.map((repair) => <article key={repair.id} className="rounded-lg bg-white p-3 text-xs"><p className="font-bold text-slate-800">{repair.identified_problem}</p><p className="mt-1 text-slate-600">{repair.repair_fix || 'Fix not recorded'} · {repair.repair_cost === null ? 'Cost not recorded' : `${repair.currency} ${Number(repair.repair_cost).toFixed(2)}`}</p><p className="mt-1 text-slate-400">{repair.created_at} · {repair.reported_by}</p></article>)}</div></div> : null}
        </section>
        {draft.status === 'in_repair' && !draft.repair.identified_problem.trim() && <p className="text-xs font-semibold text-amber-800">An identified problem is required while an asset is marked in repair.</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving || uploading || !draft.image_path || (draft.status === 'in_repair' && !draft.repair.identified_problem.trim())} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving…' : 'Save asset'}</button></div>
      </form></div>}
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 text-2xl font-black text-slate-900">{value}</p></article>;
}

function LoadingState() {
  return <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading school assets…</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<span className="mt-1.5 block">{children}</span></label>;
}
