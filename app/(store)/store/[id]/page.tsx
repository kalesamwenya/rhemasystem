"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import StoreProductCard from "@/components/store/StoreProductCard";
import { useStore, type StoreProduct } from "@/components/store/StoreContext";
import { useInventory } from "@/lib/store-inventory";
import { assetUrl } from "@/lib/api";

export default function StoreProductDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { addToCart } = useStore();
  const { inventory, hydrated } = useInventory();
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");

  const products: StoreProduct[] = useMemo(() => inventory.map((product) => ({
    ...product,
    price: `GHS ${product.variants[0]?.priceValue ?? 0}`,
    priceValue: product.variants[0]?.priceValue ?? 0,
    colors: [...new Set(product.variants.map((item) => item.color).filter(Boolean))] as string[],
    sizes: [...new Set(product.variants.map((item) => item.size).filter(Boolean))] as string[],
  })), [inventory]);
  const product = products.find((item) => item.id === params.id);
  const images = (product?.images?.length ? product.images : product ? [product.image] : []).map(assetUrl);
  const selectedVariant = product?.variants.find((item) => item.color === selectedColor && item.size === selectedSize) ?? product?.variants[0];
  const similarItems = products.filter((item) => item.id !== product?.id && item.category === product?.category).slice(0, 3);
  const promotions = products.filter((item) => ["Popular", "Best value", "New"].includes(item.badge) && item.id !== product?.id).slice(0, 3);
  const newStock = products.filter((item) => item.id !== product?.id).slice(-3);

  if (!hydrated) return <main className="mx-auto max-w-7xl px-4 py-24 text-center"><p className="text-sm font-semibold text-slate-500">Loading product...</p></main>;
  if (!product) return <main className="mx-auto max-w-7xl px-4 py-24 text-center"><h1 className="text-3xl font-black text-slate-900">Product not found</h1><button type="button" onClick={() => router.push("/store")} className="mt-6 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white">Back to store</button></main>;

  const chooseProduct = (item: StoreProduct) => addToCart(item, item.colors?.[0], item.sizes?.[0]);

  return <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-red-600"><ArrowLeft size={16} /> Back to store</button>
    <section className="mt-8 grid gap-10 lg:grid-cols-2">
      <div>
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-100"><img src={images[imageIndex]} alt={`${product.name} view ${imageIndex + 1}`} className="h-[460px] w-full object-cover" />{images.length > 1 ? <><button type="button" aria-label="Previous image" onClick={() => setImageIndex((current) => (current - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 rounded-full bg-white/90 p-3 text-slate-900 shadow"><ChevronLeft size={18} /></button><button type="button" aria-label="Next image" onClick={() => setImageIndex((current) => (current + 1) % images.length)} className="absolute right-4 top-1/2 rounded-full bg-white/90 p-3 text-slate-900 shadow"><ChevronRight size={18} /></button></> : null}</div>
        <div className="mt-3 flex gap-3 overflow-x-auto">{images.map((image, index) => <button key={image} type="button" onClick={() => setImageIndex(index)} className={`shrink-0 overflow-hidden rounded-xl border-2 ${imageIndex === index ? "border-red-600" : "border-transparent"}`}><img src={image} alt={`${product.name} thumbnail ${index + 1}`} className="h-16 w-16 object-cover" /></button>)}</div>
      </div>
      <div className="flex flex-col justify-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">{product.category}</p><h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">{product.name}</h1><p className="mt-5 max-w-xl text-base leading-8 text-slate-600">A considered academy essential designed for everyday student life, dependable use, and school pride.</p><div className="mt-7 flex items-end justify-between border-y border-slate-200 py-5"><span className="text-3xl font-black text-slate-900">GHS {selectedVariant?.priceValue ?? product.priceValue}</span><span className="text-sm font-semibold text-emerald-700">{selectedVariant?.quantity ?? 0} in stock</span></div>
        {product.colors?.length ? <div className="mt-6"><p className="text-sm font-bold text-slate-700">Colour</p><div className="mt-2 flex flex-wrap gap-2">{product.colors.map((color) => <button key={color} type="button" onClick={() => setSelectedColor(color)} className={`rounded-full border px-4 py-2 text-sm font-semibold ${selectedColor === color ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 text-slate-700"}`}>{color}</button>)}</div></div> : null}
        {product.sizes?.length ? <div className="mt-5"><p className="text-sm font-bold text-slate-700">Size</p><div className="mt-2 flex flex-wrap gap-2">{product.sizes.map((size) => <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`rounded-lg border px-4 py-2 text-sm font-semibold ${selectedSize === size ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 text-slate-700"}`}>{size}</button>)}</div></div> : null}
        <p className="mt-5 text-xs text-slate-500">Batch code: {selectedVariant?.batchCode ?? "-"}</p><button type="button" onClick={() => addToCart(product, product.colors?.length ? selectedColor || product.colors[0] : undefined, product.sizes?.length ? selectedSize || product.sizes[0] : undefined)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#0b1737] px-6 py-4 text-sm font-bold text-white transition hover:bg-slate-800"><ShoppingCart size={17} /> Add to cart</button>
      </div>
    </section>
    <ProductShelf title="Similar items" items={similarItems} onAdd={chooseProduct} />
    <ProductShelf title="Promotions" items={promotions} onAdd={chooseProduct} accent />
    <ProductShelf title="New stock" items={newStock} onAdd={chooseProduct} />
  </main>;
}

function ProductShelf({ title, items, onAdd, accent = false }: { title: string; items: StoreProduct[]; onAdd: (product: StoreProduct) => void; accent?: boolean }) { return <section className="mt-20 border-t border-slate-200 pt-10"><div className="flex items-end justify-between gap-4"><div><p className={`text-xs font-black uppercase tracking-[0.22em] ${accent ? "text-red-600" : "text-slate-500"}`}>{accent ? "Limited offers" : "Explore more"}</p><h2 className="mt-2 text-3xl font-black text-slate-900">{title}</h2></div><span className="text-sm font-semibold text-slate-500">{items.length} items</span></div>{items.length ? <div className="mt-7 grid gap-6 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => <StoreProductCard key={item.id} product={item} onAddToCart={onAdd} />)}</div> : <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">No items in this section yet.</p>}</section>; }
