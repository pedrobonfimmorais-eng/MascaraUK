import { createClient } from "@/lib/supabase/server";

export interface StoreBanner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string | null;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Active banners for the homepage hero, ordered by display_order. Each
 * banner is fully admin-editable (image, title, description, button text
 * and link, start/end dates, active flag, order) via the `banners` table.
 * Returns an empty array when none are configured — the homepage falls
 * back to the static hero copy in that case.
 */
export async function getActiveBanners(): Promise<StoreBanner[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("banners")
      .select("id, title, subtitle, image_url, link_url, button_text, starts_at, expires_at")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !data) return [];

    return data
      .filter((banner) => (!banner.starts_at || banner.starts_at <= now) && (!banner.expires_at || banner.expires_at >= now))
      .map((banner) => ({
        id: banner.id,
        title: banner.title,
        subtitle: banner.subtitle,
        imageUrl: banner.image_url,
        linkUrl: banner.link_url,
        buttonText: banner.button_text,
      }));
  } catch {
    return [];
  }
}
