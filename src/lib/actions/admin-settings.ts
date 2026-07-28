"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface SettingsActionState {
  error: string | null;
  success?: boolean;
}

const TEXT_KEYS = [
  "store_name",
  "logo_url",
  "favicon_url",
  "primary_color",
  "secondary_color",
  "font_family",
  "contact_email",
  "contact_phone",
  "footer_text",
  "home_hero_title",
  "home_hero_subtitle",
] as const;

const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube"] as const;

/**
 * Lets an administrator update store-wide branding/contact settings
 * (name, logo, colors, fonts, social links, footer/home texts) without
 * touching any code — everything is stored in `store_settings` and read by
 * every public page via getStoreSettings().
 */
export async function updateStoreSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requireAdmin();
  if (!admin) {
    return { error: "Apenas administradores podem alterar as configurações." };
  }

  const supabase = await createClient();

  const rows: { key: string; value: string }[] = TEXT_KEYS.map((key) => ({
    key,
    value: JSON.stringify(String(formData.get(key) ?? "")),
  }));

  const socialLinks = Object.fromEntries(
    SOCIAL_KEYS.map((platform) => [platform, String(formData.get(`social_${platform}`) ?? "")])
  );
  rows.push({ key: "social_links", value: JSON.stringify(socialLinks) });

  const { error } = await supabase.from("store_settings").upsert(rows, { onConflict: "key" });

  if (error) {
    return { error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracoes");

  return { error: null, success: true };
}
