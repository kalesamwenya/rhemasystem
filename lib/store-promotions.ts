"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type StorePromotion = {
  id: number;
  title: string;
  eyebrow: string;
  copy: string;
  image: string;
  badge: string;
  product_id?: string | null;
  promo_code?: string | null;
  discount_percent?: number | string | null;
  sort_order: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: number;
};

export function useStorePromotions(admin = false) {
  const [promotions, setPromotions] = useState<StorePromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.promotions.list(admin)
      .then((body: { data?: StorePromotion[] }) => {
        if (active) setPromotions(Array.isArray(body.data) ? body.data : []);
      })
      .catch(() => {
        if (active) setPromotions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [admin]);

  return { promotions, setPromotions, loading };
}
