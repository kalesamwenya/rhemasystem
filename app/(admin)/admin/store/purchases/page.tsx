'use client';

import Link from 'next/link';
import { ArrowLeft, Download, Printer, Receipt, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type PurchaseItem = {
  product_name: string;
  variant_label?: string;
  batch_code?: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
};

type Purchase = {
  id: number;
  purchase_reference: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_address?: string;
  delivery_method: string;
  payment_method: string;
  subtotal: number | string;
  total_amount: number | string;
  currency: string;
  payment_status: string;
  created_at: string;
  items: PurchaseItem[];
};

const money = (value: number | string, currency = 'GHS') => `${currency} ${Number(value).toFixed(2)}`;

export default function StorePurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedReference, setSelectedReference] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.purchases.list()
      .then((body: { data?: Purchase[] }) => {
        const next = body.data ?? [];
        setPurchases(next);
        setSelectedReference(next[0]?.purchase_reference ?? '');
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load store receipts.'));
  }, []);

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return purchases;
    return purchases.filter((purchase) => `${purchase.purchase_reference} ${purchase.customer_name} ${purchase.customer_phone}`.toLowerCase().includes(term));
  }, [purchases, search]);
  const selected = purchases.find((purchase) => purchase.purchase_reference === selectedReference) ?? filteredPurchases[0];

  const printReceipt = () => window.print();
  const downloadReceipt = () => {
    if (!selected) return;
    const itemRows = selected.items.map((item) => `<tr><td>${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''}</td><td>${item.quantity}</td><td>${money(item.unit_price, selected.currency)}</td><td>${money(item.line_total, selected.currency)}</td></tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${selected.purchase_reference} - Rhema receipt</title><style>body{font-family:Arial,sans-serif;color:#14213d;padding:40px}header{border-bottom:4px solid #d9272e;padding-bottom:18px}h1{margin:0;font-size:26px}p{color:#526079}table{width:100%;border-collapse:collapse;margin-top:30px}th,td{text-align:left;border-bottom:1px solid #dce2eb;padding:12px 8px}th{color:#d9272e;text-transform:uppercase;font-size:11px}.total{text-align:right;font-size:20px;font-weight:bold;margin-top:24px}</style></head><body><header><h1>RHEMA CLASS REGISTER</h1><p>Official Store Receipt</p></header><p><strong>Receipt:</strong> ${selected.purchase_reference}<br><strong>Customer:</strong> ${selected.customer_name}<br><strong>Phone:</strong> ${selected.customer_phone}<br><strong>Date:</strong> ${new Date(selected.created_at).toLocaleString()}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table><p class="total">Total: ${money(selected.total_amount, selected.currency)}</p><p>Payment: ${selected.payment_method}<br>Delivery: ${selected.delivery_method}</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected.purchase_reference}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 print:bg-white">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <Link href="/admin/store" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400"><ArrowLeft size={14} /> Store management</Link>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Commerce archive</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Store receipts</h1>
          <p className="mt-1 text-sm text-slate-500">Review, print, and download customer purchase records.</p>
        </div>
        {selected && <div className="flex gap-2"><button onClick={printReceipt} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><Printer size={15} /> Print</button><button onClick={downloadReceipt} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"><Download size={15} /> Download</button></div>}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-3 print:hidden">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipts" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-red-400" /></div>
          {filteredPurchases.map((purchase) => <button key={purchase.purchase_reference} onClick={() => setSelectedReference(purchase.purchase_reference)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.purchase_reference === purchase.purchase_reference ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}><p className="font-mono text-[10px] font-black uppercase tracking-wider text-red-600">{purchase.purchase_reference}</p><p className="mt-2 text-sm font-black text-slate-900">{purchase.customer_name}</p><p className="mt-1 text-xs text-slate-500">{new Date(purchase.created_at).toLocaleDateString()} · {money(purchase.total_amount, purchase.currency)}</p></button>)}
          {!filteredPurchases.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No receipts found.</div>}
        </aside>

        {selected ? <article className="receipt-sheet rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none"><div className="flex flex-col justify-between gap-6 border-b-4 border-red-600 pb-6 sm:flex-row sm:items-start"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Rhema Class Register</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Official Store Receipt</h2><p className="mt-2 text-sm text-slate-500">A record of your school essentials purchase.</p></div><div className="text-left sm:text-right"><Receipt className="mb-3 text-red-600 sm:ml-auto" size={28} /><p className="font-mono text-sm font-black text-slate-900">{selected.purchase_reference}</p><p className="mt-1 text-xs text-slate-500">{new Date(selected.created_at).toLocaleString()}</p></div></div><div className="grid gap-6 border-b border-slate-200 py-6 text-sm sm:grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Billed to</p><p className="mt-2 font-black text-slate-900">{selected.customer_name}</p><p className="text-slate-500">{selected.customer_phone}</p>{selected.customer_email && <p className="text-slate-500">{selected.customer_email}</p>}</div><div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fulfilment</p><p className="mt-2 font-bold text-slate-900">{selected.delivery_method}</p><p className="text-slate-500">Payment: {selected.payment_method}</p><p className="text-slate-500">Status: {selected.payment_status}</p></div></div><table className="mt-6 w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Item</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Unit</th><th className="pb-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.items.map((item) => <tr key={`${item.product_name}-${item.variant_label}`}><td className="py-4 font-bold text-slate-900">{item.product_name}<span className="block text-xs font-normal text-slate-500">{item.variant_label || 'Standard variant'}{item.batch_code ? ` · ${item.batch_code}` : ''}</span></td><td className="py-4 text-center text-slate-600">{item.quantity}</td><td className="py-4 text-right text-slate-600">{money(item.unit_price, selected.currency)}</td><td className="py-4 text-right font-bold text-slate-900">{money(item.line_total, selected.currency)}</td></tr>)}</tbody></table><div className="ml-auto mt-6 max-w-xs space-y-3 border-t border-slate-200 pt-5 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(selected.subtotal, selected.currency)}</span></div><div className="flex justify-between text-xl font-black text-slate-900"><span>Total</span><span>{money(selected.total_amount, selected.currency)}</span></div></div><p className="mt-10 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">Thank you for supporting Rhema Class Register.</p></article> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Receipts will appear here after the first store purchase.</div>}
      </div>
      <style jsx global>{`@media print { body { background: white !important; } .receipt-sheet { width: 100%; } }`}</style>
    </div>
  );
}
