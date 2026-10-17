"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
  ShieldCheck,
  CreditCard,
} from "lucide-react";
import StoreProductCard from "@/components/store/StoreProductCard";
import { useStore, type StoreProduct } from "@/components/store/StoreContext";
import { consumeInventory, useInventory } from "@/lib/store-inventory";
import { useStorePromotions } from "@/lib/store-promotions";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/api";
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from "@/lib/flutterwave-inline";

const deliveryOptions = ["School pickup", "Home delivery within city", "Regional delivery", "Courier dispatch"];
const paymentMethods = [
  { name: "Card payment", mark: "CARD", className: "bg-blue-900 text-white" },
  { name: "Mobile money", mark: "MOMO", className: "bg-emerald-600 text-white" },
];
const paymentOptions = [
  { value: "Flutterwave", label: "Flutterwave · card or mobile money" },
  { value: "Bank transfer", label: "Bank transfer · manual confirmation" },
  { value: "Cash on delivery", label: "Cash on delivery" },
];

function StorePageContent() {
  const searchParams = useSearchParams();
  const { addToCart, cart, cartTotal, clearCart, query, removeFromCart, setQuery, updateQuantity } = useStore();
  const { inventory, setInventory, hydrated } = useInventory();
  const { promotions, loading: promotionsLoading } = useStorePromotions();
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [detailSlide, setDetailSlide] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [purchaseReference, setPurchaseReference] = useState("");
  const [cartOpen, setCartOpen] = useState(true);
  const [itemsConfirmed, setItemsConfirmed] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    delivery: "School pickup",
    payment: "Flutterwave",
  });
  const products: StoreProduct[] = inventory.map((product) => ({
    ...product,
    price: `ZMW ${product.variants[0]?.priceValue ?? 0}`,
    priceValue: product.variants[0]?.priceValue ?? 0,
    colors: [...new Set(product.variants.map((item) => item.color).filter(Boolean))] as string[],
    sizes: [...new Set(product.variants.map((item) => item.size).filter(Boolean))] as string[],
  }));

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) return products;

    return products.filter((product) => {
      const matchesName = product.name.toLowerCase().includes(term);
      const matchesCategory = product.category.toLowerCase().includes(term);
      return matchesName || matchesCategory;
    });
  }, [products, query]);

  const heroSlides = useMemo(() => {
    if (promotions.length) return promotions.map((promotion) => {
      const product = products.find((item) => item.id === promotion.product_id);
      return {
        id: String(promotion.id),
        type: "promotion",
        eyebrow: promotion.eyebrow,
        title: promotion.title,
        copy: promotion.copy,
        image: assetUrl(promotion.image || product?.images?.[0] || product?.image || ""),
        badge: promotion.badge || product?.price || "Shop now",
        product,
      };
    });

    return products.slice(0, 3).map((product) => ({
      id: product.id,
      type: "item",
      eyebrow: product.category,
      title: product.name,
      copy: "Available now from the Rhema Class Register store.",
      image: assetUrl(product.images?.[0] ?? product.image),
      badge: product.price,
      product,
    }));
  }, [products, promotions]);

  useEffect(() => {
    const category = searchParams.get("category");
    if (category === "audio") {
      setQuery("audio");
    }
    if (searchParams.get("checkout") === "1" && cart.length) {
      const checkoutTimer = window.setTimeout(() => setCheckoutOpen(true), 0);
      return () => window.clearTimeout(checkoutTimer);
    }
  }, [searchParams, setQuery, cart.length]);

  useEffect(() => {
    if (!heroSlides.length) return;

    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const heroSlide = heroSlides[activeSlide % heroSlides.length];

  if (!hydrated || promotionsLoading) {
    return <main className="flex min-h-[60vh] items-center justify-center bg-slate-50"><p className="text-sm font-semibold text-slate-500">Loading store catalogue...</p></main>;
  }

  if (!inventory.length) {
    return <main className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-6 text-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Store catalogue</p><h1 className="mt-3 text-3xl font-black text-slate-900">No products are available yet</h1><p className="mt-3 text-sm text-slate-500">The store is connected to the database, but no products have been added.</p></div></main>;
  }

  const openQuickAdd = (product: StoreProduct) => {
    setSelectedProduct(product);
    setSelectedColor(product.colors?.[0] ?? "");
    setSelectedSize(product.sizes?.[0] ?? "");
    setDetailSlide(0);
  };

  const addSelectedVariant = () => {
    if (!selectedProduct) return;

    addToCart(
      selectedProduct,
      selectedProduct.colors && selectedProduct.colors.length > 0 ? selectedColor : undefined,
      selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedSize : undefined
    );

    setCartOpen(true);
    setSelectedProduct(null);
  };

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!itemsConfirmed || !cart.length || checkoutSubmitting) return;
    setCheckoutSubmitting(true);
    setCheckoutError("");
    let pendingOnlineReference = "";
    try {
      const result: { data?: FlutterwaveInlineCheckout & { purchase_reference: string } } = await api.purchases.create({
        customer: {
          name: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          delivery: formData.delivery,
          payment: formData.payment,
        },
        items: cart.map((item) => ({ product_id: item.id, variant_id: item.inventoryVariantId, quantity: item.quantity })),
      });
      if (!result.data?.purchase_reference) throw new Error("The store did not return a valid purchase reference.");
      const purchaseReference = result.data.purchase_reference;
      const completeOrder = () => {
        setInventory((current) => consumeInventory(current, cart.map((item) => ({ productId: item.id, color: item.selectedColor, size: item.selectedSize, quantity: item.quantity }))));
        setPurchaseReference(purchaseReference);
        clearCart();
        setCheckoutComplete(true);
        setCheckoutOpen(false);
        setCheckoutSubmitting(false);
      };

      if (formData.payment !== "Flutterwave") {
        completeOrder();
        return;
      }
      pendingOnlineReference = purchaseReference;
      if (!Number.isFinite(result.data.amount) || result.data.amount <= 0) {
        throw new Error("The online purchase total must be greater than zero.");
      }

      await openFlutterwaveInlineCheckout(result.data, async (transaction) => {
        if (transaction.status !== "successful") {
          try {
            await api.purchases.cancelPending(purchaseReference);
          } catch {
            setCheckoutError(`Payment was not completed. Your order ${purchaseReference} may still be pending; contact the school office if stock remains reserved.`);
            setCheckoutSubmitting(false);
            return;
          }
          setCheckoutError("Payment was not completed. No payment was taken and the reserved items have been released.");
          setCheckoutSubmitting(false);
          return;
        }
        const transactionId = String(transaction.transaction_id ?? "");
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== purchaseReference) {
          setCheckoutError(`Flutterwave returned invalid payment details. Keep reference ${purchaseReference} and contact the school office; the order has not been marked paid.`);
          setCheckoutSubmitting(false);
          return;
        }
        try {
          await api.purchases.verifyPayment(transactionId, purchaseReference);
          completeOrder();
        } catch (error) {
          setCheckoutError(error instanceof Error
            ? `${error.message} Keep your purchase reference ${purchaseReference}; do not pay again until the order status is checked.`
            : `We could not confirm payment. Keep reference ${purchaseReference} and contact the school office before retrying.`);
          setCheckoutSubmitting(false);
        }
      }, async () => {
        try {
          await api.purchases.cancelPending(purchaseReference);
          setCheckoutError("Checkout closed. No payment was confirmed and reserved items have been released.");
          setCheckoutSubmitting(false);
        } catch (error) {
          setCheckoutError(error instanceof Error
            ? `Checkout closed, but the order could not be cancelled: ${error.message} Contact the school office with reference ${purchaseReference}.`
            : `Checkout closed, but the order may still be pending. Contact the school office with reference ${purchaseReference}.`);
          setCheckoutSubmitting(false);
        }
      });
    } catch (error) {
      if (pendingOnlineReference) {
        try {
          await api.purchases.cancelPending(pendingOnlineReference);
        } catch (cancellationError) {
          setCheckoutError(cancellationError instanceof Error
            ? `Unable to open Flutterwave checkout. The pending order could not be cancelled: ${cancellationError.message} Contact the school office with reference ${pendingOnlineReference}.`
            : `Unable to open Flutterwave checkout. Contact the school office with reference ${pendingOnlineReference}.`);
          setCheckoutSubmitting(false);
          return;
        }
      }
      setCheckoutError(error instanceof Error ? error.message : "Unable to place this order.");
      setCheckoutSubmitting(false);
    }
  };

  const resetCheckout = () => {
    setCheckoutComplete(false);
    setCheckoutError("");
    setPurchaseReference("");
    setItemsConfirmed(false);
    setCheckoutSubmitting(false);
    setFormData({
      fullName: "",
      phone: "",
      email: "",
      address: "",
      delivery: "School pickup",
      payment: "Flutterwave",
    });
  };

  return (
    <main>
      <section className="relative min-h-[560px] overflow-hidden bg-[#0b1737] text-white">
        <img src={heroSlide.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1737] via-[#0b1737]/85 to-[#0b1737]/30" />
        <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-end px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full border border-red-300/40 bg-red-600/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">{heroSlide.eyebrow}</span>
            <h1 className="mt-6 text-4xl font-black tracking-tight md:text-6xl">{heroSlide.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">{heroSlide.copy}</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => heroSlide.product && openQuickAdd(heroSlide.product)} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500">{heroSlide.type === "item" ? "View item" : "Shop offer"}<ArrowRight size={16} /></button>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-bold text-white">{heroSlide.badge}</span>
            </div>
            <div className="mt-10 flex items-center gap-2">
              {heroSlides.map((slide, index) => <button key={slide.id} type="button" aria-label={`Show ${slide.eyebrow}`} onClick={() => setActiveSlide(index)} className={`h-2.5 rounded-full transition ${activeSlide % heroSlides.length === index ? "w-10 bg-red-500" : "w-2.5 bg-white/45"}`} />)}
              <span className="ml-2 text-xs font-bold text-slate-300">{activeSlide % heroSlides.length + 1} / {heroSlides.length}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Featured products</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">School essentials</h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} available
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <StoreProductCard key={product.id} product={product} onAddToCart={openQuickAdd} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Search size={18} />
            </div>
            <h3 className="mt-4 text-xl font-bold text-slate-900">No matching items found</h3>
            <p className="mt-2 text-sm text-slate-600">Try another search term to find a branded item.</p>
          </div>
        )}
      </section>

      <section className="border-y border-slate-200 bg-white py-14">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck size={24} /></div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-red-600">Secured payment options</p>
          <h3 className="mt-2 text-3xl font-black text-slate-900">Pay your way, securely</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Your payment details are handled securely at checkout through trusted mobile money and card providers.</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {paymentMethods.map((method) => (
              <div key={method.name} className="inline-flex min-w-[9.5rem] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm">
                <span className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-[10px] font-black tracking-tight ${method.className}`}>{method.mark === "VISA" ? <CreditCard size={19} /> : method.mark}</span>
                <span className="text-sm font-bold text-slate-800">{method.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {cart.length && !cartOpen ? (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl shadow-red-900/25 transition hover:bg-red-500"
          aria-label={`Open cart with ${cart.reduce((sum, item) => sum + item.quantity, 0)} items`}
        >
          <ShoppingCart size={18} />
          Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
        </button>
      ) : null}

      {cart.length && cartOpen ? (
        <aside className="fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-300/70">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-red-600" />
              <h3 className="text-lg font-black text-slate-900">Cart</h3>
            </div>
            <button type="button" onClick={() => setCartOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Minimize cart">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.variantId} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-2">
                <img src={assetUrl(item.image)} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {item.selectedColor ? `${item.selectedColor} • ` : ""}
                    {item.selectedSize ?? "Standard"}
                  </p>
                  <p className="text-xs text-slate-500">GHS {item.priceValue * item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQuantity(item.variantId, -1)} className="rounded-full bg-slate-100 p-1.5 text-slate-700">
                    <Minus size={12} />
                  </button>
                  <span className="w-4 text-center text-xs font-semibold text-slate-900">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.variantId, 1)} className="rounded-full bg-slate-100 p-1.5 text-slate-700">
                    <Plus size={12} />
                  </button>
                </div>
                <button type="button" onClick={() => removeFromCart(item.variantId)} className="rounded-full bg-red-50 p-1.5 text-red-600">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">GHS {cartTotal}</span>
            </div>
            <button
              type="button"
              onClick={() => { setItemsConfirmed(false); setCheckoutOpen(true); }}
              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Proceed to checkout
            </button>
          </div>
        </aside>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-4 md:items-center">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">Product details</p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">{selectedProduct.name}</h3>
              </div>
              <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="relative mt-5">
                <img src={assetUrl((selectedProduct.images?.length ? selectedProduct.images : [selectedProduct.image])[detailSlide])} alt={`${selectedProduct.name} view ${detailSlide + 1}`} className="h-56 w-full rounded-2xl object-cover" />
              {(selectedProduct.images?.length ?? 0) > 1 ? <>
                <button type="button" aria-label="Previous product image" onClick={() => setDetailSlide((current) => (current - 1 + (selectedProduct.images?.length ?? 1)) % (selectedProduct.images?.length ?? 1))} className="absolute left-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow"><ChevronLeft size={16} /></button>
                <button type="button" aria-label="Next product image" onClick={() => setDetailSlide((current) => (current + 1) % (selectedProduct.images?.length ?? 1))} className="absolute right-3 top-1/2 rounded-full bg-white/90 p-2 text-slate-800 shadow"><ChevronRight size={16} /></button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-white">{detailSlide + 1} / {selectedProduct.images?.length}</span>
              </> : null}
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-slate-700">Colour</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedProduct.colors?.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedColor === color
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {selectedProduct.sizes ? (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-700">Size</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        selectedSize === size
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Price</span>
              <span className="text-right text-xl font-black text-slate-900">GHS {selectedProduct.variants.find((item) => item.color === selectedColor && item.size === selectedSize)?.priceValue ?? selectedProduct.priceValue}<small className="block text-xs font-medium text-slate-500">{selectedProduct.variants.find((item) => item.color === selectedColor && item.size === selectedSize)?.quantity ?? 0} in stock</small></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Batch: {selectedProduct.variants.find((item) => item.color === selectedColor && item.size === selectedSize)?.batchCode ?? "-"}</p>

            <button
              type="button"
              onClick={addSelectedVariant}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Add to cart
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {checkoutOpen ? (
        <div className="fixed inset-0 z-[70] bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-12 max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-600">Checkout</p>
                <h3 className="mt-2 text-3xl font-black text-slate-900">Complete your order</h3>
              </div>
              <button type="button" onClick={() => setCheckoutOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                <input
                  value={formData.fullName}
                  onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                  placeholder="+233 20 000 0000"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                  placeholder="name@example.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Delivery address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={(event) => setFormData((prev) => ({ ...prev, address: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                  placeholder="Street, area, city"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Delivery type</label>
                <select
                  value={formData.delivery}
                  onChange={(event) => setFormData((prev) => ({ ...prev, delivery: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                >
                  {deliveryOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
                <select
                  value={formData.payment}
                  onChange={(event) => setFormData((prev) => ({ ...prev, payment: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:bg-white"
                >
                  {paymentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Items</span>
                <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                {cart.map((item) => (
                  <div key={item.variantId} className="flex items-start justify-between gap-3 text-xs text-slate-600">
                    <span className="min-w-0"><span className="font-semibold text-slate-800">{item.name}</span><span className="block">Qty {item.quantity}{item.selectedColor ? ` • ${item.selectedColor}` : ""}{item.selectedSize ? ` • ${item.selectedSize}` : ""}</span></span>
                    <span className="shrink-0 font-bold text-slate-900">GHS {item.priceValue * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">GHS {cartTotal}</span>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <input type="checkbox" checked={itemsConfirmed} onChange={(event) => setItemsConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />
              <span>I confirm that these items, quantities, variants, and the total are correct.</span>
            </label>

            <form onSubmit={handleCheckout} className="mt-6">
              {checkoutError && <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{checkoutError}</p>}
              <button
                type="submit"
                disabled={!itemsConfirmed || checkoutSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {checkoutSubmitting ? "Opening secure checkout..." : formData.payment === "Flutterwave" ? "Pay securely with Flutterwave" : "Place order"}
                <ChevronRight size={16} />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {checkoutComplete ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl shadow-slate-900/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} />
            </div>
            <h3 className="mt-5 text-2xl font-black text-slate-900">Order placed successfully</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Thank you, {formData.fullName || "student"}. Your Godfrey Academy merchandise order has been confirmed and will be processed shortly.
            </p>
            {purchaseReference && <p className="mt-4 font-mono text-xs font-bold uppercase tracking-wider text-slate-500">Receipt {purchaseReference}</p>}
            <button
              type="button"
              onClick={() => {
                resetCheckout();
                setCheckoutComplete(false);
              }}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              Continue shopping
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <StorePageContent />
    </Suspense>
  );
}
