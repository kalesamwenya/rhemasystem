"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

export type InventoryVariant = {
  id: string;
  color?: string;
  size?: string;
  quantity: number;
  priceValue: number;
  batchCode: string;
};

export type InventoryProduct = {
  id: string;
  name: string;
  category: string;
  badge: string;
  image: string;
  images?: string[];
  variants: InventoryVariant[];
};

const variant = (id: string, quantity: number, priceValue: number, batchCode: string, color?: string, size?: string): InventoryVariant => ({
  id,
  color,
  size,
  quantity,
  priceValue,
  batchCode,
});



export function useInventory() {
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    api.store.list()
      .then((body: { data?: InventoryProduct[] }) => {
        if (!active) return;
        setInventory(Array.isArray(body.data) ? body.data : []);
      })
      .catch(() => {
        if (active) setInventory([]);
      })
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => { active = false; };
  }, []);

  const totals = useMemo(() => ({
    units: inventory.reduce((total, product) => total + product.variants.reduce((sum, item) => sum + item.quantity, 0), 0),
    value: inventory.reduce((total, product) => total + product.variants.reduce((sum, item) => sum + item.quantity * item.priceValue, 0), 0),
  }), [inventory]);

  return { inventory, setInventory, totals, hydrated };
}

export function consumeInventory(
  inventory: InventoryProduct[],
  items: { productId: string; color?: string; size?: string; quantity: number }[]
) {
  return inventory.map((product) => ({
    ...product,
    variants: product.variants.map((variant) => {
      const purchased = items.find((item) => item.productId === product.id && item.color === variant.color && item.size === variant.size);
      return purchased ? { ...variant, quantity: Math.max(0, variant.quantity - purchased.quantity) } : variant;
    }),
  }));
}
