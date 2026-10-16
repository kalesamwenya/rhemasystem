import type { StoreProduct } from "@/components/store/StoreContext";
import { assetUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

type StoreProductCardProps = {
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
};

export default function StoreProductCard({ product, onAddToCart }: StoreProductCardProps) {
  const router = useRouter();

  return (
    <article role="link" tabIndex={0} onClick={() => router.push(`/store/${product.id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push(`/store/${product.id}`); }} className="cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500">
      <div className="relative">
        <img src={assetUrl(product.image)} alt={product.name} className="h-64 w-full object-cover" />
        <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
          {product.badge}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            {product.category}
          </span>
          <span className="text-lg font-black text-slate-900">{product.price}</span>
        </div>
        <h3 className="mt-4 text-2xl font-black text-slate-900">{product.name}</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Branded for Godfrey Academy and designed for comfort, school pride, and everyday use.
        </p>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onAddToCart(product); }}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#0b1737] px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
