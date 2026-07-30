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
  /** CNPJ/CPF, entirely optional — blank until the owner fills it in, never invented. */
  taxId: string;
  businessAddress: string;
  allowGuestCheckout: boolean;
  emailFromName: string;
  /** Store-level switch for the marketing e-mail feature. Never defaults to true — each customer's own opt-in (profiles.marketing_opt_in) still applies on top of this. */
  marketingEmailsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEstimatedReturn: string;
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
    taxId: "",
    businessAddress: "",
    allowGuestCheckout: true,
    emailFromName: siteConfig.name,
    marketingEmailsEnabled: false,
    maintenanceMode: false,
    maintenanceMessage: "",
    maintenanceEstimatedReturn: "",
  };
}

/**
 * Currency used for checkout/Stripe. Reads store_settings.store_currency so
 * switching it later is a database/admin-panel change, never a code change.
 */
export async function getStoreCurrency(): Promise<string> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "BRL";
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("store_settings")
      .select("value")
      .eq("key", "store_currency")
      .maybeSingle();

    return (data?.value as string) ?? "BRL";
  } catch {
    return "BRL";
  }
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
      taxId: (map.get("tax_id") as string) ?? fallback.taxId,
      businessAddress: (map.get("business_address") as string) ?? fallback.businessAddress,
      allowGuestCheckout: (map.get("allow_guest_checkout") as boolean | undefined) ?? fallback.allowGuestCheckout,
      emailFromName: (map.get("email_from_name") as string) ?? fallback.emailFromName,
      marketingEmailsEnabled: (map.get("marketing_emails_enabled") as boolean | undefined) ?? fallback.marketingEmailsEnabled,
      maintenanceMode: (map.get("maintenance_mode") as boolean | undefined) ?? fallback.maintenanceMode,
      maintenanceMessage: (map.get("maintenance_message") as string) ?? fallback.maintenanceMessage,
      maintenanceEstimatedReturn: (map.get("maintenance_estimated_return") as string) ?? fallback.maintenanceEstimatedReturn,
    };
  } catch {
    return fallback;
  }
}
