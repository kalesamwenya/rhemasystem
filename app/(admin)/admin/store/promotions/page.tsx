'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarClock, Image as ImageIcon, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { confirmWithApp } from '@/components/ui/app-dialogs';
import { useInventory } from '@/lib/store-inventory';
import { StorePromotion, useStorePromotions } from '@/lib/store-promotions';

type PromotionDraft = {
  id?: number;
  title: string;
  eyebrow: string;
  copy: string;
  image: string;
  badge: string;
  product_id: string;
  promo_code: string;
  discount_percent: string;
  sort_order: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const emptyDraft = (): PromotionDraft => ({ title: '', eyebrow: 'Featured offer', copy: '', image: '', badge: '', product_id: '', promo_code: '', discount_percent: '0', sort_order: '0', starts_at: '', ends_at: '', is_active: true });
const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-red-400 focus:bg-white';
const inputDate = (value?: string | null) => value ? value.replace(' ', 'T').slice(0, 16) : '';
const apiDate = (value: string) => value ? value.replace('T', ' ') + (value.length === 16 ? ':00' : '') : '';

export default function StorePromotionsPage() {
  const { promotions, setPromotions, loading } = useStorePromotions(true);
  const { inventory } = useInventory();
  const [editing, setEditing] = useState<PromotionDraft | null>(null);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const body = await api.promotions.list(true) as { data?: StorePromotion[] };
    setPromotions(body.data ?? []);
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    try {
      await api.promotions.save({ ...editing, product_id: editing.product_id || null, promo_code: editing.promo_code.trim().toUpperCase() || null, discount_percent: Number(editing.discount_percent) || 0, sort_order: Number(editing.sort_order) || 0, starts_at: apiDate(editing.starts_at), ends_at: apiDate(editing.ends_at), is_active: editing.is_active ? 1 : 0 });
      await refresh();
      setEditing(null);
      setMessage('Promotion saved and available to the storefront according to its schedule.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save promotion.');
    }
  };

  const remove = async (id: number) => {
    if (!(await confirmWithApp('Delete this promotion?', { title: 'Delete promotion?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.promotions.remove(id);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete promotion.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><Link href="/admin/store" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ArrowLeft size={14} /> Store management</Link><p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Campaign studio</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Store promotions</h1><p className="mt-1 text-sm text-slate-500">Manage the database-backed campaigns displayed in the public store hero.</p></div><button onClick={() => setEditing(emptyDraft())} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white"><Plus size={15} /> New promotion</button>
      </header>
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{message}</div>}
      {loading ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Loading promotions...</div> : !promotions.length ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><Tag className="mx-auto text-red-600" /><h2 className="mt-4 text-xl font-black text-slate-900">No promotions yet</h2><p className="mt-2 text-sm text-slate-500">Create a promotion to control the public store hero.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{promotions.map((promotion) => <article key={promotion.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="relative h-40 bg-slate-100">{promotion.image ? <img src={promotion.image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-400"><ImageIcon /></div>}<span className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${promotion.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{promotion.is_active ? 'Active' : 'Paused'}</span></div><div className="space-y-3 p-5"><p className="text-[10px] font-black uppercase tracking-wider text-red-600">{promotion.eyebrow}</p><h2 className="text-xl font-black text-slate-900">{promotion.title}</h2><p className="line-clamp-2 text-sm text-slate-500">{promotion.copy}</p><div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500"><span><CalendarClock size={13} className="mr-1 inline" /> Order {promotion.sort_order}</span><span>{promotion.promo_code ? `${promotion.promo_code} • ${promotion.discount_percent}% off` : promotion.badge || 'No badge'}</span></div><div className="flex gap-2"><button onClick={() => setEditing({ id: promotion.id, title: promotion.title, eyebrow: promotion.eyebrow, copy: promotion.copy, image: promotion.image, badge: promotion.badge, product_id: promotion.product_id ?? '', promo_code: promotion.promo_code ?? '', discount_percent: String(promotion.discount_percent ?? 0), sort_order: String(promotion.sort_order), starts_at: inputDate(promotion.starts_at), ends_at: inputDate(promotion.ends_at), is_active: Boolean(Number(promotion.is_active)) })} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700"><Pencil size={14} /> Edit</button><button onClick={() => remove(promotion.id)} className="rounded-xl bg-red-50 px-3 py-2 text-red-600" aria-label="Delete promotion"><Trash2 size={14} /></button></div></div></article>)}</div>}

      {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><form onSubmit={save} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between border-b border-slate-100 pb-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Hero campaign</p><h2 className="mt-1 text-2xl font-black text-slate-900">{editing.id ? 'Edit promotion' : 'New promotion'}</h2></div><button type="button" onClick={() => setEditing(null)} aria-label="Close" className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={16} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Eyebrow<input value={editing.eyebrow} onChange={(event) => setEditing({ ...editing, eyebrow: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-600">Badge<input value={editing.badge} onChange={(event) => setEditing({ ...editing, badge: event.target.value })} className={`${inputClass} mt-1`} placeholder="15% off" /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Title<input required value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Copy<textarea required rows={3} value={editing.copy} onChange={(event) => setEditing({ ...editing, copy: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-600 sm:col-span-2">Image URL<input value={editing.image} onChange={(event) => setEditing({ ...editing, image: event.target.value })} className={`${inputClass} mt-1`} placeholder="https://..." /></label><label className="text-xs font-bold text-slate-600">Linked product<select value={editing.product_id} onChange={(event) => setEditing({ ...editing, product_id: event.target.value })} className={`${inputClass} mt-1`}><option value="">No linked product</option>{inventory.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Display order<input type="number" value={editing.sort_order} onChange={(event) => setEditing({ ...editing, sort_order: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-600">Starts at<input type="datetime-local" value={editing.starts_at} onChange={(event) => setEditing({ ...editing, starts_at: event.target.value })} className={`${inputClass} mt-1`} /></label><label className="text-xs font-bold text-slate-600">Ends at<input type="datetime-local" value={editing.ends_at} onChange={(event) => setEditing({ ...editing, ends_at: event.target.value })} className={`${inputClass} mt-1`} /></label></div><label className="mt-5 flex items-center gap-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={editing.is_active} onChange={(event) => setEditing({ ...editing, is_active: event.target.checked })} className="h-4 w-4 accent-red-600" /> Active promotion</label><div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button><button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white">Save promotion</button></div></form></div>}
    </div>
  );
}
