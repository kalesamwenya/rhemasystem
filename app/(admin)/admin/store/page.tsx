'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Image as ImageIcon,
  Package,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useInventory, type InventoryProduct, type InventoryVariant } from '@/lib/store-inventory';
import { api, assetUrl } from '@/lib/api';

type StoreOrder = { id: string; customer: string; item: string; amount: string; status: string };
const initialOrders: StoreOrder[] = [];

type VariantDraft = Omit<InventoryVariant, 'id'>;
const emptyVariant = (): VariantDraft => ({ color: '', size: '', quantity: 0, priceValue: 0, batchCode: '' });
const productCategories = ['Stationery', 'Caps', 'Shirt', 'Bottles', 'Bags'];

const generateBatchCode = (productName: string, index: number) => {
  const seed = (productName || 'PRODUCT').trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase() || 'PRODUCT';
  const suffix = String(index + 1).padStart(2, '0');
  return `${seed}-${new Date().getFullYear()}-${suffix}`;
};

export default function StoreManagementPage() {
  const { inventory, setInventory, totals } = useInventory();
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  
  // Search, Filter, Sort & Pagination States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'units' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Editing State
  const [editing, setEditing] = useState<(Omit<InventoryProduct, 'image'> & { images: string[]; primaryImage: string }) | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>([]);
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    api.purchases
      .list()
      .then((body: { data?: Array<{ id: number; purchase_reference: string; customer_name: string; total_amount: number; currency: string; payment_status: string; items?: Array<{ product_name: string; quantity: number }> }> }) => {
        if (body.data?.length) {
          setOrders(
            body.data.map((order) => ({
              id: order.purchase_reference,
              customer: order.customer_name,
              item: order.items?.map((item) => `${item.product_name} x${item.quantity}`).join(', ') || 'Store purchase',
              amount: `${order.currency} ${order.total_amount}`,
              status: order.payment_status,
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  // Categories list extraction
  const categories = useMemo(() => ['ALL', ...Array.from(new Set(inventory.map((p) => p.category)))], [inventory]);

  // Filtered & Sorted Products
  const processedProducts = useMemo(() => {
    return inventory
      .filter((product) => {
        const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter;
        const totalUnits = product.variants.reduce((sum, v) => sum + v.quantity, 0);
        
        let matchesStock = true;
        if (stockFilter === 'LOW') matchesStock = totalUnits > 0 && totalUnits < 5;
        if (stockFilter === 'OUT') matchesStock = totalUnits === 0;
        if (stockFilter === 'IN') matchesStock = totalUnits >= 5;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        let valA: string | number = a.name;
        let valB: string | number = b.name;

        if (sortBy === 'units') {
          valA = a.variants.reduce((sum, item) => sum + item.quantity, 0);
          valB = b.variants.reduce((sum, item) => sum + item.quantity, 0);
        } else if (sortBy === 'price') {
          valA = Math.min(...a.variants.map((v) => v.priceValue), 0);
          valB = Math.min(...b.variants.map((v) => v.priceValue), 0);
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [inventory, search, categoryFilter, stockFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(start, start + itemsPerPage);
  }, [processedProducts, currentPage]);

  const startEdit = (product?: InventoryProduct) => {
    const existingImages = product?.images?.length ? product.images : product?.image ? [product.image] : [];
    setEditing({
      id: product?.id ?? `product-${Date.now()}`,
      name: product?.name ?? '',
      category: product?.category ?? '',
      badge: product?.badge ?? 'New',
      images: existingImages,
      primaryImage: product?.image ?? '',
      variants: product?.variants ?? [],
    });
    setVariantDrafts(product?.variants.map(({ color, size, quantity, priceValue, batchCode }) => ({ color, size, quantity, priceValue, batchCode })) ?? [emptyVariant()]);
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files?.length || !editing) return;
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    Promise.all(selectedFiles.map((file) => api.uploads.image(file, 'store').then((body: { data?: { path?: string } }) => body.data?.path || ''))).then((uploadedImages) => {
      const newImages = uploadedImages.filter(Boolean);
      if (!newImages.length) return;
      setEditing((current) => {
        if (!current) return current;
        const updatedImages = [...current.images, ...newImages];
        return { ...current, images: updatedImages, primaryImage: current.primaryImage || newImages[0] };
      });
    });
  };

  const handleRemoveImage = (url: string) => {
    if (!editing) return;
    const updatedImages = editing.images.filter((img) => img !== url);
    setEditing({
      ...editing,
      images: updatedImages,
      primaryImage: editing.primaryImage === url ? updatedImages[0] || '' : editing.primaryImage,
    });
  };

  const saveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing || !editing.name.trim() || !editing.category.trim() || !variantDrafts.length) return;

    const product: InventoryProduct = {
      id: editing.id,
      name: editing.name,
      category: editing.category,
      badge: editing.badge,
      image: editing.primaryImage || editing.images[0] || '',
      images: editing.images,
      variants: variantDrafts.map((item, index) => ({
        ...item,
        batchCode: item.batchCode?.trim() || generateBatchCode(editing.name || 'PRODUCT', index),
        id: editing.variants[index]?.id ?? `${editing.id}-variant-${Date.now()}-${index}`,
      })),
    };

    try {
      await api.store.save(product);
      setInventory((current) => (current.some((item) => item.id === product.id) ? current.map((item) => (item.id === product.id ? product : item)) : [...current, product]));
      setEditing(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save this product.');
    }
  };

  const removeProduct = async (id: string) => {
    if (!(await confirmWithApp('Delete this product and its variants?', { title: 'Delete product?', confirmText: 'Delete', tone: 'danger' }))) return;
    try {
      await api.store.remove(id);
      setInventory((current) => current.filter((product) => product.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete this product.');
    }
  };

  return (
    <div className="mx-auto max-w-8xl space-y-6 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Commerce Hub</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Store Management</h1>
        </div>
        <button
          onClick={() => startEdit()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-md transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Inventory" value={totals.units.toString()} icon={<Package className="h-5 w-5 text-slate-500" />} />
        <Metric label="Inventory Value" value={`GHS ${totals.value.toLocaleString()}`} icon={<DollarSign className="h-5 w-5 text-emerald-600" />} />
        <Metric label="Orders This Month" value={orders.length.toString()} icon={<ShoppingCart className="h-5 w-5 text-blue-600" />} />
        <Metric label="Paid Orders" value={orders.filter((order) => order.status.toLowerCase() === 'paid').length.toString()} icon={<TrendingUp className="h-5 w-5 text-violet-600" />} />
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'inventory' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Inventory Catalog ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-colors ${
            activeTab === 'orders' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Recent Transactions ({orders.length})
        </button>
      </div>

      {/* TAB 1: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="rounded-[2rem] bg-white p-5 space-y-4">
          {/* Filters, Search & Sort Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search products or categories..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>

              {/* Stock Status Filter */}
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="ALL">All Stock Status</option>
                <option value="IN">In Stock (&ge;5)</option>
                <option value="LOW">Low Stock (&lt;5)</option>
                <option value="OUT">Out of Stock (0)</option>
              </select>

              {/* Sort By */}
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder.toUpperCase()}
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'units' | 'price')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="name">Sort by Name</option>
                <option value="units">Sort by Stock</option>
                <option value="price">Sort by Price</option>
              </select>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Variants</th>
                  <th className="px-4 py-3">Total Units</th>
                  <th className="px-4 py-3">Price Range</th>
                  <th className="px-4 py-3">Batch Codes</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-xs text-slate-500">
                      No products found matching your active filters.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((product) => {
                    const units = product.variants.reduce((sum, item) => sum + item.quantity, 0);
                    const prices = product.variants.map((item) => item.priceValue);
                    const minPrice = prices.length ? Math.min(...prices) : 0;
                    const maxPrice = prices.length ? Math.max(...prices) : 0;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.image ? (
                              <img src={assetUrl(product.image)} alt={product.name} className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                                <ImageIcon className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-slate-900">{product.name}</p>
                              <p className="text-xs text-slate-500">{product.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {product.variants.map((item) => [item.color, item.size].filter(Boolean).join(' / ') || 'Standard').join(', ')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{units}</span>
                            {units === 0 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-red-700">Out</span>}
                            {units > 0 && units < 5 && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700">Low</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {minPrice === maxPrice ? `GHS ${minPrice}` : `GHS ${minPrice} - ${maxPrice}`}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700">
                          {[...new Set(product.variants.map((item) => item.batchCode))].filter(Boolean).join(', ') || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              aria-label={`Edit ${product.name}`}
                              onClick={() => startEdit(product)}
                              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              aria-label={`Delete ${product.name}`}
                              onClick={() => removeProduct(product.id)}
                              className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500">
            <p>
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="inline-flex items-center rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Orders Log</p>
              <h2 className="text-xl font-black text-slate-900">Recent Transactions</h2>
            </div>
            <Link href="/admin/store/purchases" className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-700">View receipts</Link>
          </div>

          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{order.id}</p>
                  <p className="mt-0.5 text-sm font-black text-slate-900">{order.customer}</p>
                  <p className="text-xs text-slate-500">{order.item}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900">{order.amount}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${
                      order.status.toLowerCase() === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT/ADD PRODUCT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <form onSubmit={saveProduct} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Inventory Record</p>
                <h2 className="mt-0.5 text-2xl font-black text-slate-900">{editing.name ? 'Edit Product' : 'Add New Product'}</h2>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product Name">
                <input
                  required
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Official Shirt"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-slate-400"
                />
              </Field>

              <Field label="Category">
                <select
                  required
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-slate-400"
                >
                  <option value="" disabled>Select a category</option>
                  {editing.category && !productCategories.includes(editing.category) && <option value={editing.category}>{editing.category}</option>}
                  {productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </Field>

              <Field label="Badge Tag">
                <input
                  value={editing.badge}
                  onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
                  placeholder="e.g. New, Popular"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs outline-none focus:border-slate-400"
                />
              </Field>
            </div>

            {/* Image Upload & Management Section */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <h3 className="font-black text-slate-900 text-sm">Product Gallery & Media</h3>
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center transition hover:border-slate-500 hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    handleImageFiles(event.target.files);
                    event.target.value = '';
                  }}
                  className="sr-only"
                />
                <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-700"><ImageIcon className="h-4 w-4" /> Choose image files</span>
              </label>
              <p className="text-[11px] text-slate-500">Select multiple images at once. The first image becomes the main thumbnail.</p>

              {/* Thumbnails Preview Grid */}
              {editing.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 pt-2 sm:grid-cols-6">
                  {editing.images.map((url, idx) => {
                    const isPrimary = editing.primaryImage === url;
                    return (
                      <div key={idx} className="relative group aspect-square rounded-xl border border-slate-200 bg-white overflow-hidden">
                        <img src={assetUrl(url)} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, primaryImage: url })}
                            className={`p-1.5 rounded-full ${isPrimary ? 'bg-amber-400 text-white' : 'bg-white text-slate-700'}`}
                            title="Set as main thumbnail"
                          >
                            <Star className="h-3 w-3 fill-current" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(url)}
                            className="p-1.5 rounded-full bg-red-600 text-white"
                            title="Remove image"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {isPrimary && (
                          <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1 py-0.5 text-[8px] font-bold text-white uppercase">
                            Main
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Product Variants Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900">Stock Variants</h3>
                  <p className="text-xs text-slate-500">Provide attribute variations, initial quantities, and price tags.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setVariantDrafts([...variantDrafts, emptyVariant()])}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              <div className="space-y-3">
                {variantDrafts.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-5 items-center">
                    <input
                      placeholder="Color"
                      value={item.color}
                      onChange={(e) => updateVariant(index, 'color', e.target.value, variantDrafts, setVariantDrafts)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                    />
                    <input
                      placeholder="Size"
                      value={item.size}
                      onChange={(e) => updateVariant(index, 'size', e.target.value, variantDrafts, setVariantDrafts)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateVariant(index, 'quantity', Number(e.target.value), variantDrafts, setVariantDrafts)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Price"
                      value={item.priceValue}
                      onChange={(e) => updateVariant(index, 'priceValue', Number(e.target.value), variantDrafts, setVariantDrafts)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                    />
                    <div className="flex justify-end">
                      {variantDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setVariantDrafts(variantDrafts.filter((_, itemIndex) => itemIndex !== index))}
                          className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          aria-label="Remove variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white shadow-md transition hover:bg-slate-800"
            >
              Save Product Record
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-black text-slate-900">{value}</p>
        {icon}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold text-slate-600 block">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

function updateVariant(
  index: number,
  key: keyof VariantDraft,
  value: string | number,
  variants: VariantDraft[],
  setVariants: React.Dispatch<React.SetStateAction<VariantDraft[]>>
) {
  setVariants(variants.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
}