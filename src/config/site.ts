import { t } from "@/i18n";

/**
 * Fallback store configuration, used until the administrator customizes
 * everything through the `store_settings` table in Supabase (see
 * src/lib/store-settings.ts). Nothing here is hardcoded into pages —
 * pages should call `getStoreSettings()` and fall back to these defaults
 * only when the database has no value yet or is unreachable.
 */
export const siteConfig = {
  name: "MascaraUK",
  description: t("meta.defaultDescription"),
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  logoUrl: null as string | null,
  faviconUrl: null as string | null,
  theme: {
    primaryColor: "#7c3aed",
    secondaryColor: "#111827",
    fontFamily: "Geist",
  },
  contact: {
    email: "contato@mascarauk.example",
    phone: "+55 11 90000-0000",
  },
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
  },
  footerText: t("footer.aboutText"),
};

/** Fallback primary navigation, editable later via the `menu_tabs` table. */
export const mainNav = [
  { label: t("nav.home"), href: "/" },
  { label: t("nav.products"), href: "/produtos" },
  { label: t("nav.about"), href: "/sobre" },
  { label: t("nav.contact"), href: "/contato" },
];

/** Fallback footer legal links, mirrored by the `custom_pages` table. */
export const legalNav = [
  { label: t("legalLinks.faq"), href: "/perguntas-frequentes" },
  { label: t("legalLinks.privacyPolicy"), href: "/politica-de-privacidade" },
  { label: t("legalLinks.cookiePolicy"), href: "/politica-de-cookies" },
  { label: t("legalLinks.termsOfUse"), href: "/termos-de-uso" },
  { label: t("legalLinks.deliveryPolicy"), href: "/politica-de-entrega" },
  { label: t("legalLinks.returnsPolicy"), href: "/trocas-e-devolucoes" },
];

export type SiteConfig = typeof siteConfig;
