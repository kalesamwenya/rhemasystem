'use client';

import Link from 'next/link';
import { ArrowLeft, Download, Printer, Receipt, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api, uploadPdfDocument } from '@/lib/api';
import { createOrderPaymentReceiptPdf, openPaymentReceiptBlob } from '@/lib/payment-receipt';

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
  gateway_transaction_id?: string | null;
  subtotal: number | string;
  discount_amount?: number | string;
  total_amount: number | string;
  currency: string;
  payment_status: string;
  created_at: string;
  items: PurchaseItem[];
};

const money = (value: number | string, currency = 'GHS') => `${currency} ${Number(value).toFixed(2)}`;

const orderReceiptData = (purchase: Purchase) => ({
  category: 'Store purchase',
  payer_name: purchase.customer_name,
  payer_email: purchase.customer_email || '',
  payer_phone: purchase.customer_phone,
  paid_for: 'School store order',
  amount: Number(purchase.total_amount),
  currency: purchase.currency,
  reference: purchase.purchase_reference,
  gateway: purchase.payment_method,
  gateway_transaction_id: purchase.gateway_transaction_id || null,
  created_at: purchase.created_at,
  items: [
    ...purchase.items.map((item) => ({
      description: `${item.product_name}${item.variant_label ? ` (${item.variant_label})` : ''}${item.batch_code ? ` · ${item.batch_code}` : ''}`,
      quantity: Number(item.quantity),
      amount: Number(item.line_total),
    })),
    ...(Number(purchase.discount_amount || 0) > 0
      ? [{ description: 'Promotion discount', amount: -Number(purchase.discount_amount) }]
      : []),
  ],
});

export default function StorePurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedReference, setSelectedReference] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(false);

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
  const updateOfflinePayment = async (status: 'paid' | 'failed') => {
    if (!selected || updatingPayment) return;
    setUpdatingPayment(true);
    setError('');
    try {
      await api.purchases.updatePaymentStatus(selected.purchase_reference, status);
      setPurchases((current) => current.map((purchase) => purchase.purchase_reference === selected.purchase_reference
        ? { ...purchase, payment_status: status }
        : purchase));
      if (status === 'paid') {
        try {
          const pdf = await createOrderPaymentReceiptPdf(orderReceiptData({ ...selected, payment_status: 'paid' }));
          await uploadPdfDocument(
            pdf,
            'receipts',
            `Rhema-Store-Receipt-${selected.purchase_reference}.pdf`,
            selected.purchase_reference,
            'receipt',
            selected.gateway_transaction_id || '',
            'store',
          );
        } catch (receiptError) {
          setError(`Payment was marked received, but its receipt could not be saved: ${receiptError instanceof Error ? receiptError.message : 'Please try again.'}`);
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update this store payment.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const downloadReceipt = async () => {
    if (!selected || selected.payment_status !== 'paid') return;
    setError('');
    try {
      const pdf = await createOrderPaymentReceiptPdf(orderReceiptData(selected));
      openPaymentReceiptBlob(pdf, 'download', selected.purchase_reference);
      await uploadPdfDocument(
        pdf,
        'receipts',
        `Rhema-Store-Receipt-${selected.purchase_reference}.pdf`,
        selected.purchase_reference,
        'receipt',
        selected.gateway_transaction_id || '',
        'store',
      );
    } catch (reason) {
      setError(reason instanceof Error ? `Receipt download or upload failed: ${reason.message}` : 'Receipt download or upload failed.');
    }
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
        {selected && <div className="flex flex-wrap gap-2">
          {selected.payment_method !== 'Flutterwave' && selected.payment_status === 'pending' && <>
            <button type="button" disabled={updatingPayment} onClick={() => void updateOfflinePayment('paid')} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{updatingPayment ? 'Saving...' : 'Mark payment received'}</button>
            <button type="button" disabled={updatingPayment} onClick={() => void updateOfflinePayment('failed')} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-700 disabled:opacity-50">Cancel unpaid order</button>
          </>}
          {selected.payment_status === 'paid' && <>
            <button type="button" onClick={printReceipt} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"><Printer size={15} /> Print</button>
            <button type="button" onClick={downloadReceipt} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white"><Download size={15} /> Download</button>
          </>}
        </div>}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</div>}
      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="space-y-3 print:hidden">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipts" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-red-400" /></div>
          {filteredPurchases.map((purchase) => <button key={purchase.purchase_reference} onClick={() => setSelectedReference(purchase.purchase_reference)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.purchase_reference === purchase.purchase_reference ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-400'}`}><p className="font-mono text-[10px] font-black uppercase tracking-wider text-red-600">{purchase.purchase_reference}</p><p className="mt-2 text-sm font-black text-slate-900">{purchase.customer_name}</p><p className="mt-1 text-xs text-slate-500">{new Date(purchase.created_at).toLocaleDateString()} · {money(purchase.total_amount, purchase.currency)}</p></button>)}
          {!filteredPurchases.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No receipts found.</div>}
        </aside>

        {selected ? <article className="receipt-sheet rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:border-0 print:p-0 print:shadow-none"><div className="flex flex-col justify-between gap-6 border-b-4 border-red-600 pb-6 sm:flex-row sm:items-start"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-red-600">Rhema Class Register</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Official Store Receipt</h2><p className="mt-2 text-sm text-slate-500">A record of your school essentials purchase.</p></div><div className="text-left sm:text-right"><Receipt className="mb-3 text-red-600 sm:ml-auto" size={28} /><p className="font-mono text-sm font-black text-slate-900">{selected.purchase_reference}</p><p className="mt-1 text-xs text-slate-500">{new Date(selected.created_at).toLocaleString()}</p></div></div><div className="grid gap-6 border-b border-slate-200 py-6 text-sm sm:grid-cols-2"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Billed to</p><p className="mt-2 font-black text-slate-900">{selected.customer_name}</p><p className="text-slate-500">{selected.customer_phone}</p>{selected.customer_email && <p className="text-slate-500">{selected.customer_email}</p>}</div><div className="sm:text-right"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fulfilment</p><p className="mt-2 font-bold text-slate-900">{selected.delivery_method}</p><p className="text-slate-500">Payment: {selected.payment_method}</p><p className="text-slate-500">Status: {selected.payment_status}</p></div></div><table className="mt-6 w-full text-left text-sm"><thead className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Item</th><th className="pb-3 text-center">Qty</th><th className="pb-3 text-right">Unit</th><th className="pb-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{selected.items.map((item) => <tr key={`${item.product_name}-${item.variant_label}`}><td className="py-4 font-bold text-slate-900">{item.product_name}<span className="block text-xs font-normal text-slate-500">{item.variant_label || 'Standard variant'}{item.batch_code ? ` · ${item.batch_code}` : ''}</span></td><td className="py-4 text-center text-slate-600">{item.quantity}</td><td className="py-4 text-right text-slate-600">{money(item.unit_price, selected.currency)}</td><td className="py-4 text-right font-bold text-slate-900">{money(item.line_total, selected.currency)}</td></tr>)}</tbody></table><div className="ml-auto mt-6 max-w-xs space-y-3 border-t border-slate-200 pt-5 text-sm"><div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{money(selected.subtotal, selected.currency)}</span></div>{Number(selected.discount_amount || 0) > 0 && <div className="flex justify-between text-emerald-700"><span>Promotion discount</span><span>− {money(selected.discount_amount || 0, selected.currency)}</span></div>}<div className="flex justify-between text-xl font-black text-slate-900"><span>Total</span><span>{money(selected.total_amount, selected.currency)}</span></div></div><p className="mt-10 border-t border-slate-100 pt-5 text-center text-xs text-slate-400">Thank you for supporting Rhema Class Register.</p></article> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">Receipts will appear here after the first store purchase.</div>}
      </div>
      <style jsx global>{`@media print { body { background: white !important; } .receipt-sheet { width: 100%; } }`}</style>
    </div>
  );
}
