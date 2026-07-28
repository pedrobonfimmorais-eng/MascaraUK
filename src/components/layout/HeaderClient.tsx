"use client";

import Link from "next/link";
import { useState } from "react";
import { t } from "@/i18n";
import { Container } from "@/components/ui/Container";
import type { CurrentUser } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
}

export function HeaderClient({
  storeName,
  logoUrl,
  nav,
  user,
}: {
  storeName: string;
  logoUrl: string | null;
  nav: NavItem[];
  user: CurrentUser | null;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-secondary">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={storeName} className="h-8 w-auto" />
          ) : (
            <span>{storeName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-gray-700 hover:text-brand-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 max-w-xs md:block">
          <input
            type="search"
            placeholder={t("common.searchPlaceholder")}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            aria-label={t("nav.cart")}
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100"
          >
            <CartIcon />
          </Link>

          <Link
            href={user ? "/minha-conta" : "/login"}
            className="hidden text-sm font-medium text-gray-700 hover:text-brand-primary sm:block"
          >
            {user ? t("nav.account") : t("nav.login")}
          </Link>

          <button
            type="button"
            className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            aria-label={isMenuOpen ? t("nav.menuClose") : t("nav.menuOpen")}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
        </div>
      </Container>

      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={user ? "/minha-conta" : "/login"}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setIsMenuOpen(false)}
            >
              {user ? t("nav.account") : t("nav.login")}
            </Link>
          </Container>
        </div>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3h1.5l1.9 10.6a2 2 0 0 0 2 1.65h8.2a2 2 0 0 0 2-1.65L20 7H6"
      />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
