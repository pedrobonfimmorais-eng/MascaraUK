"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requirePrincipal } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/actions/activity-log";
import { getAnalyticsThresholds, updateAnalyticsThresholds } from "@/lib/analytics/settings";
import type { ShippingRuleOption } from "@/lib/cart/cart-data";

export interface SettingsActionState {
  error: string | null;
  success?: boolean;
}

function revalidateSettings() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/configuracoes");
}

async function upsertSettings(rows: { key: string; value: unknown }[]) {
  const supabase = await createClient();
  const encoded = rows.map((row) => ({ key: row.key, value: row.value }));
  return supabase.from("store_settings").upsert(encoded, { onConflict: "key" });
}

/** Store name, tax ID, business address, and public contact info — the "Informações da loja" tab. */
export async function updateStoreInfo(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requirePermission("settings.manage");
  if (!admin) return { error: "Apenas administradores com permissão podem alterar as configurações." };

  const { error } = await upsertSettings([
    { key: "store_name", value: String(formData.get("store_name") ?? "") },
    { key: "tax_id", value: String(formData.get("tax_id") ?? "") },
    { key: "business_address", value: String(formData.get("business_address") ?? "") },
    { key: "contact_email", value: String(formData.get("contact_email") ?? "") },
    { key: "contact_phone", value: String(formData.get("contact_phone") ?? "") },
  ]);

  if (error) return { error: "Não foi possível salvar as configurações." };

  await logAdminAction({ adminId: admin.id, action: "configuracoes_loja_alteradas", entityType: "store_settings" });
  revalidateSettings();
  return { error: null, success: true };
}

const SOCIAL_KEYS = ["instagram", "facebook", "tiktok", "youtube"] as const;

/** Logo, favicon, colors, fonts, footer/home texts — the "Aparência" tab. */
export async function updateAppearance(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requirePermission("settings.manage");
  if (!admin) return { error: "Apenas administradores com permissão podem alterar as configurações." };

  const socialLinks = Object.fromEntries(
    SOCIAL_KEYS.map((platform) => [platform, String(formData.get(`social_${platform}`) ?? "")])
  );

  const { error } = await upsertSettings([
    { key: "logo_url", value: String(formData.get("logo_url") ?? "") },
    { key: "favicon_url", value: String(formData.get("favicon_url") ?? "") },
    { key: "primary_color", value: String(formData.get("primary_color") ?? "") },
    { key: "secondary_color", value: String(formData.get("secondary_color") ?? "") },
    { key: "font_family", value: String(formData.get("font_family") ?? "") },
    { key: "footer_text", value: String(formData.get("footer_text") ?? "") },
    { key: "home_hero_title", value: String(formData.get("home_hero_title") ?? "") },
    { key: "home_hero_subtitle", value: String(formData.get("home_hero_subtitle") ?? "") },
    { key: "social_links", value: socialLinks },
  ]);

  if (error) return { error: "Não foi possível salvar as configurações." };

  await logAdminAction({ adminId: admin.id, action: "aparencia_alterada", entityType: "store_settings" });
  revalidateSettings();
  return { error: null, success: true };
}

/** Currency, guest checkout, and the low-stock alert threshold — the "Vendas" tab. */
export async function updateSalesSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requirePermission("settings.manage");
  if (!admin) return { error: "Apenas administradores com permissão podem alterar as configurações." };

  const currency = String(formData.get("store_currency") ?? "BRL");
  const allowGuestCheckout = formData.get("allow_guest_checkout") === "on";
  const lowStockQuantity = parseInt(String(formData.get("low_stock_quantity") ?? "5"), 10);

  const { error } = await upsertSettings([
    { key: "store_currency", value: currency },
    { key: "allow_guest_checkout", value: allowGuestCheckout },
  ]);

  if (error) return { error: "Não foi possível salvar as configurações." };

  if (!Number.isNaN(lowStockQuantity) && lowStockQuantity >= 0) {
    const thresholds = await getAnalyticsThresholds();
    await updateAnalyticsThresholds({ ...thresholds, lowStockQuantity });
  }

  await logAdminAction({ adminId: admin.id, action: "configuracoes_vendas_alteradas", entityType: "store_settings" });
  revalidateSettings();
  return { error: null, success: true };
}

/** Free-shipping threshold and the standard/express shipping options — the "Entrega" tab. */
export async function updateShippingRules(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requirePermission("settings.manage");
  if (!admin) return { error: "Apenas administradores com permissão podem alterar as configurações." };

  const num = (name: string, fallback: number) => {
    const parsed = parseFloat(String(formData.get(name) ?? ""));
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const standard: ShippingRuleOption = {
    id: "standard",
    label: String(formData.get("standard_label") ?? "Entrega padrão"),
    rate: num("standard_rate", 19.9),
    estimate_days_min: num("standard_days_min", 5),
    estimate_days_max: num("standard_days_max", 10),
  };
  const express: ShippingRuleOption = {
    id: "express",
    label: String(formData.get("express_label") ?? "Entrega expressa"),
    rate: num("express_rate", 34.9),
    estimate_days_min: num("express_days_min", 2),
    estimate_days_max: num("express_days_max", 4),
  };

  const { error } = await upsertSettings([
    {
      key: "shipping_rules",
      value: {
        free_shipping_threshold: num("free_shipping_threshold", 250),
        default_rate: standard.rate,
        default_estimate_days_min: standard.estimate_days_min,
        default_estimate_days_max: standard.estimate_days_max,
        options: [standard, express],
      },
    },
  ]);

  if (error) return { error: "Não foi possível salvar as regras de entrega." };

  await logAdminAction({ adminId: admin.id, action: "regras_entrega_alteradas", entityType: "store_settings" });
  revalidateSettings();
  return { error: null, success: true };
}

/** Sender name and the store-level marketing e-mail switch — the "E-mails" tab. Never defaults to opted-in. */
export async function updateEmailSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const admin = await requirePermission("settings.manage");
  if (!admin) return { error: "Apenas administradores com permissão podem alterar as configurações." };

  const { error } = await upsertSettings([
    { key: "email_from_name", value: String(formData.get("email_from_name") ?? "") },
    { key: "marketing_emails_enabled", value: formData.get("marketing_emails_enabled") === "on" },
  ]);

  if (error) return { error: "Não foi possível salvar as configurações de e-mail." };

  await logAdminAction({ adminId: admin.id, action: "configuracoes_email_alteradas", entityType: "store_settings" });
  revalidateSettings();
  return { error: null, success: true };
}

/** Maintenance on/off, message, and estimated return — principal-only, the "Manutenção" tab. */
export async function updateMaintenanceSettings(
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const principal = await requirePrincipal();
  if (!principal) return { error: "Apenas o administrador principal pode ativar o modo de manutenção." };

  const maintenanceMode = formData.get("maintenance_mode") === "on";

  const { error } = await upsertSettings([
    { key: "maintenance_mode", value: maintenanceMode },
    { key: "maintenance_message", value: String(formData.get("maintenance_message") ?? "") },
    { key: "maintenance_estimated_return", value: String(formData.get("maintenance_estimated_return") ?? "") },
  ]);

  if (error) return { error: "Não foi possível salvar o modo de manutenção." };

  await logAdminAction({
    adminId: principal.id,
    action: maintenanceMode ? "manutencao_ativada" : "manutencao_desativada",
    entityType: "store_settings",
  });
  revalidateSettings();
  return { error: null, success: true };
}
