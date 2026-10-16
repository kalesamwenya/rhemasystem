"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useStore } from "@/components/store/StoreContext";
import { assetUrl } from "@/lib/api";

export default function CartPage() {
  const { cart, cartCount, cartTotal, removeFromCart, updateQuantity } = useStore();

  return (
    <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end">
        <div>
          <Link href="/store" className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 transition hover:text-red-500">
            <ArrowLeft size={16} /> Continue shopping
          </Link>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Your selection</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Shopping cart</h1>
          <p className="mt-2 text-sm text-slate-500">Review your items, variants, and quantities before checkout.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
          <ShoppingCart size={16} className="text-red-600" /> {cartCount} item{cartCount === 1 ? "" : "s"}
        </span>
      </div>

      {!cart.length ? (
        <div className="mt-10 rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600"><ShoppingCart size={26} /></div>
          <h2 className="mt-5 text-2xl font-black text-slate-900">Your cart is empty</h2>
          <p className="mt-2 text-sm text-slate-500">Add a school essential to begin your order.</p>
          <Link href="/store#shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500">Browse products <ChevronRight size={16} /></Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <section className="space-y-4" aria-label="Cart items">
            {cart.map((item) => (
              <article key={item.variantId} className="flex flex-col gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
                <img src={assetUrl(item.image)} alt={item.name} className="h-28 w-full rounded-2xl object-cover sm:h-24 sm:w-24" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">{item.category}</p>
                  <h2 className="mt-1 text-lg font-black text-slate-900">{item.name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{item.selectedColor ? `Colour: ${item.selectedColor}` : "Standard colour"}{item.selectedSize ? ` • Size: ${item.selectedSize}` : ""}</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">GHS {item.priceValue} each</p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 px-2 py-1">
                    <button type="button" onClick={() => updateQuantity(item.variantId, -1)} className="rounded-full p-1.5 text-slate-700 transition hover:bg-slate-100" aria-label={`Decrease ${item.name} quantity`}><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
                    <button type="button" onClick={() => updateQuantity(item.variantId, 1)} className="rounded-full p-1.5 text-slate-700 transition hover:bg-slate-100" aria-label={`Increase ${item.name} quantity`}><Plus size={14} /></button>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-sm font-black text-slate-900">GHS {item.priceValue * item.quantity}</span><button type="button" onClick={() => removeFromCart(item.variantId)} className="rounded-full bg-red-50 p-2 text-red-600 transition hover:bg-red-100" aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div>
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-28">
            <h2 className="text-xl font-black text-slate-900">Order summary</h2>
            <div className="mt-5 space-y-3 border-b border-slate-200 pb-5 text-sm text-slate-600">
              <div className="flex justify-between gap-4"><span>Items</span><span>{cartCount}</span></div>
              <div className="flex justify-between gap-4"><span>Delivery</span><span className="font-semibold text-emerald-700">Calculated at checkout</span></div>
            </div>
            <div className="mt-5 flex items-center justify-between text-lg font-black text-slate-900"><span>Subtotal</span><span>GHS {cartTotal}</span></div>
            <Link href="/store?checkout=1" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500">Proceed to checkout <ChevronRight size={16} /></Link>
            <p className="mt-4 text-center text-xs leading-5 text-slate-500">You can review delivery and payment details before placing the order.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
