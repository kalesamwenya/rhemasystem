"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useEffect } from "react";
import type { InventoryVariant } from "@/lib/store-inventory";
import type { StorePromotion } from "@/lib/store-promotions";

export type StoreProduct = {
  id: string;
  name: string;
  category: string;
  price: string;
  priceValue: number;
  badge: string;
  image: string;
  images?: string[];
  colors?: string[];
  sizes?: string[];
  variants: InventoryVariant[];
};

export type CartItem = StoreProduct & {
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  variantId: string;
  inventoryVariantId: string;
  batchCode: string;
};

type StoreContextValue = {
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartDiscount: number;
  cartTotal: number;
  claimedPromotion: StorePromotion | null;
  claimPromotion: (promotion: StorePromotion) => void;
  clearClaimedPromotion: () => void;
  addToCart: (product: StoreProduct, selectedColor?: string, selectedSize?: string) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, delta: number) => void;
  clearCart: () => void;
  searchOpen: boolean;
  setSearchOpen: Dispatch<SetStateAction<boolean>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const claimedPromotionStorageKey = "rhema-store-claimed-promotion";

const createVariantId = (productId: string, selectedColor?: string, selectedSize?: string) => {
  return [productId, selectedColor ?? "default", selectedSize ?? "default"].join("-");
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [claimedPromotion, setClaimedPromotion] = useState<StorePromotion | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: number | undefined;
    try {
      const stored = window.localStorage.getItem(claimedPromotionStorageKey);
      if (stored) {
        const promotion = JSON.parse(stored) as StorePromotion;
        timer = window.setTimeout(() => setClaimedPromotion(promotion), 0);
      }
    } catch {
      window.localStorage.removeItem(claimedPromotionStorageKey);
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => total + item.priceValue * item.quantity, 0),
    [cart]
  );

  const cartDiscount = useMemo(() => {
    if (!claimedPromotion?.product_id) return 0;
    const percent = Number(claimedPromotion.discount_percent ?? 0);
    if (percent <= 0) return 0;
    return cart.reduce((total, item) => item.id === claimedPromotion.product_id
      ? total + item.priceValue * item.quantity * percent / 100
      : total, 0);
  }, [cart, claimedPromotion]);

  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  const claimPromotion = (promotion: StorePromotion) => {
    setClaimedPromotion(promotion);
    window.localStorage.setItem(claimedPromotionStorageKey, JSON.stringify(promotion));
  };

  const clearClaimedPromotion = () => {
    setClaimedPromotion(null);
    window.localStorage.removeItem(claimedPromotionStorageKey);
  };

  const addToCart = (product: StoreProduct, selectedColor?: string, selectedSize?: string) => {
    const selectedVariant = product.variants.find((item) => item.color === selectedColor && item.size === selectedSize)
      ?? product.variants.find((item) => !item.color && !item.size);
    if (!selectedVariant || selectedVariant.quantity < 1) return;

    const variantId = createVariantId(product.id, selectedColor, selectedSize);

    setCart((current) => {
      const existingIndex = current.findIndex((item) => item.variantId === variantId);

      if (existingIndex >= 0) {
        if (current[existingIndex].quantity >= selectedVariant.quantity) return current;
        return current.map((item) =>
          item.variantId === variantId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          ...product,
          quantity: 1,
          selectedColor,
          selectedSize,
          variantId,
          inventoryVariantId: selectedVariant.id,
          batchCode: selectedVariant.batchCode,
          priceValue: selectedVariant.priceValue,
          price: `GHS ${selectedVariant.priceValue}`,
        },
      ];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart((current) => current.filter((item) => item.variantId !== variantId));
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.variantId === variantId
            ? { ...item, quantity: Math.min(item.variants.find((variant) => variant.color === item.selectedColor && variant.size === item.selectedSize)?.quantity ?? item.quantity + delta, Math.max(0, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => setCart([]);

  return (
    <StoreContext.Provider
      value={{
        cart,
        cartCount,
        cartSubtotal,
        cartDiscount,
        cartTotal,
        claimedPromotion,
        claimPromotion,
        clearClaimedPromotion,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        searchOpen,
        setSearchOpen,
        query,
        setQuery,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used inside StoreProvider");
  }

  return context;
}
