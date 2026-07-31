"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";

const STORAGE_KEY = "mascarauk_recently_viewed";
const MAX_ITEMS = 8;

interface RecentItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

function readStoredItems(): RecentItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Records the current product into localStorage on mount and renders the
 * other products the visitor looked at before this one. Client-only by
 * nature (no server storage), so it renders nothing during SSR/first paint
 * to avoid a hydration mismatch, then fills in after mount.
 */
export function RecentlyViewed({ current }: { current: RecentItem }) {
  const [others, setOthers] = useState<RecentItem[] | null>(null);

  useEffect(() => {
    const stored = readStoredItems();
    const withoutCurrent = stored.filter((item) => item.slug !== current.slug);
    // localStorage only exists client-side; syncing it into state here (rather
    // than during render) is what avoids a server/client hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOthers(withoutCurrent);

    const updated = [current, ...withoutCurrent].slice(0, MAX_ITEMS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // localStorage unavailable (private mode, storage full) — safe to ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.slug]);

  if (!others || others.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-brand-secondary">{t("product.recentlyViewed")}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {others.map((item) => (
          <Link
            key={item.slug}
            href={`/produto/${item.slug}`}
            className="flex w-32 shrink-0 flex-col gap-1 rounded-lg border border-gray-200 p-2 hover:border-brand-primary"
          >
            <div className="relative aspect-square w-full overflow-hidden rounded bg-gray-100">
              {item.imageUrl && (
                <Image src={item.imageUrl} alt={item.name} fill sizes="128px" className="object-cover" />
              )}
            </div>
            <span className="line-clamp-2 text-xs text-gray-700">{item.name}</span>
            <span className="text-xs font-medium text-brand-secondary">{formatCurrency(item.price)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
