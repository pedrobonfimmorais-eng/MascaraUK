import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";

export interface StoreSettings {
  storeName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: { instagram: string; facebook: string; tiktok: string; youtube: string };
  footerText: string;
  homeHeroTitle: string;
  homeHeroSubtitle: string;
}

function defaults(): StoreSettings {
  return {
    storeName: siteConfig.name,
    logoUrl: siteConfig.logoUrl,
    faviconUrl: siteConfig.faviconUrl,
    primaryColor: siteConfig.theme.primaryColor,
    secondaryColor: siteConfig.theme.secondaryColor,
    fontFamily: siteConfig.theme.fontFamily,
    contactEmail: siteConfig.contact.email,
    contactPhone: siteConfig.contact.phone,
    socialLinks: siteConfig.social,
    footerText: siteConfig.footerText,
    homeHeroTitle: "",
    homeHeroSubtitle: "",
  };
}

/**
 * Reads store-wide settings the administrator can customize (name, logo,
 * colors, fonts, contact info, social links, footer/home texts) from the
 * `store_settings` key/value table. Falls back to the static defaults in
 * src/config/site.ts whenever Supabase isn't configured yet or a key is
 * missing, so the site always renders even before the admin sets anything.
 */
export async function getStoreSettings(): Promise<StoreSettings> {
  const fallback = defaults();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return fallback;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("store_settings").select("key, value");

    if (error || !data) return fallback;

    const map = new Map(data.map((row) => [row.key, row.value as unknown]));
    const social = (map.get("social_links") as StoreSettings["socialLinks"]) ?? fallback.socialLinks;

    return {
      storeName: (map.get("store_name") as string) ?? fallback.storeName,
      logoUrl: (map.get("logo_url") as string | null) ?? fallback.logoUrl,
      faviconUrl: (map.get("favicon_url") as string | null) ?? fallback.faviconUrl,
      primaryColor: (map.get("primary_color") as string) ?? fallback.primaryColor,
      secondaryColor: (map.get("secondary_color") as string) ?? fallback.secondaryColor,
      fontFamily: (map.get("font_family") as string) ?? fallback.fontFamily,
      contactEmail: (map.get("contact_email") as string) ?? fallback.contactEmail,
      contactPhone: (map.get("contact_phone") as string) ?? fallback.contactPhone,
      socialLinks: social,
      footerText: (map.get("footer_text") as string) ?? fallback.footerText,
      homeHeroTitle: (map.get("home_hero_title") as string) ?? fallback.homeHeroTitle,
      homeHeroSubtitle: (map.get("home_hero_subtitle") as string) ?? fallback.homeHeroSubtitle,
    };
  } catch {
    return fallback;
  }
}
