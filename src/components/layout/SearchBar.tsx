"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { t } from "@/i18n";
import { formatCurrency } from "@/lib/utils";

interface Suggestion {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
}

export function SearchBar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();
  const showDropdown = isOpen && trimmedQuery.length >= 2;

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        setSuggestions(data.items ?? []);
        setIsOpen(true);
      } catch {
        // request aborted or failed — silently keep previous suggestions
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults() {
    if (!query.trim()) return;
    setIsOpen(false);
    onNavigate?.();
    router.push(`/produtos?busca=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <label htmlFor="site-search" className="sr-only">
          {t("common.search")}
        </label>
        <input
          id="site-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={t("common.searchPlaceholder")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          autoComplete="off"
        />
      </form>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg">
          {isLoading && <p className="px-3 py-2 text-sm text-gray-500">{t("search.searching")}</p>}

          {!isLoading && suggestions.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">{t("search.suggestionsEmpty")}</p>
          )}

          {!isLoading &&
            suggestions.map((item) => (
              <Link
                key={item.slug}
                href={`/produto/${item.slug}`}
                onClick={() => {
                  setIsOpen(false);
                  onNavigate?.();
                }}
                className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.imageUrl && (
                    <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                  )}
                </div>
                <span className="flex-1 truncate">{item.name}</span>
                <span className="shrink-0 font-medium text-brand-secondary">
                  {formatCurrency(item.price)}
                </span>
              </Link>
            ))}

          {!isLoading && suggestions.length > 0 && (
            <button
              type="button"
              onClick={goToResults}
              className="w-full border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-primary hover:bg-gray-50"
            >
              {t("search.viewAllResults")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
