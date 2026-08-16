"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Visual-only favorites toggle. Not persisted anywhere yet — this is the
 * UI slot prepared for a future favorites/wishlist feature (its own table
 * and account page), per the current project scope.
 */
export function FavoriteButton({ className, insideLink }: { className?: string; insideLink?: boolean }) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      title="Favoritos (em breve)"
      onClick={(event) => {
        if (insideLink) {
          event.preventDefault();
          event.stopPropagation();
        }
        setIsFavorite((current) => !current);
      }}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-500 shadow-sm transition-colors hover:text-brand-primary",
        isFavorite && "text-red-500",
        className
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 20.5s-7.5-4.6-10-9.3C.6 8 2 4.5 5.4 4c2-.3 3.9.6 5 2.3a5.6 5.6 0 0 1 5-2.3c3.4.5 4.8 4 3.4 7.2-2.5 4.7-10 9.3-10 9.3Z"
        />
      </svg>
    </button>
  );
}
