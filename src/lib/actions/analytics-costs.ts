"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdditionalCost } from "@/types/database";

export interface CostActionResult {
  ok: boolean;
  message: string;
}

const COST_TYPES: AdditionalCost["cost_type"][] = ["taxa_pagamento", "embalagem", "frete_medio", "operacional", "outro"];
const AMOUNT_TYPES: AdditionalCost["amount_type"][] = ["percentual", "valor_fixo"];

function toCostType(value: string): AdditionalCost["cost_type"] {
  return (COST_TYPES as string[]).includes(value) ? (value as AdditionalCost["cost_type"]) : "outro";
}

function toAmountType(value: string): AdditionalCost["amount_type"] {
  return (AMOUNT_TYPES as string[]).includes(value) ? (value as AdditionalCost["amount_type"]) : "valor_fixo";
}

export async function createAdditionalCost(
  _prevState: CostActionResult,
  formData: FormData
): Promise<CostActionResult> {
  const admin = await requirePermission("analytics.view");
  if (!admin) return { ok: false, message: "Acesso não autorizado." };

  const name = String(formData.get("name") ?? "").trim();
  const costType = toCostType(String(formData.get("costType") ?? "outro"));
  const amountType = toAmountType(String(formData.get("amountType") ?? "valor_fixo"));
  const value = parseFloat(String(formData.get("value") ?? "0"));
  const startsAt = String(formData.get("startsAt") ?? "") || null;
  const endsAt = String(formData.get("endsAt") ?? "") || null;
  const isActive = formData.get("isActive") === "on";

  if (!name || Number.isNaN(value) || value < 0) {
    return { ok: false, message: "Preencha nome e valor corretamente." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("additional_costs").insert({
    name,
    cost_type: costType,
    amount_type: amountType,
    value,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: isActive,
  });

  if (error) return { ok: false, message: "Não foi possível salvar o custo." };

  revalidatePath("/admin/analytics/vendas");
  return { ok: true, message: "Custo adicionado." };
}

export async function updateAdditionalCost(
  costId: string,
  _prevState: CostActionResult,
  formData: FormData
): Promise<CostActionResult> {
  const admin = await requirePermission("analytics.view");
  if (!admin) return { ok: false, message: "Acesso não autorizado." };

  const name = String(formData.get("name") ?? "").trim();
  const costType = toCostType(String(formData.get("costType") ?? "outro"));
  const amountType = toAmountType(String(formData.get("amountType") ?? "valor_fixo"));
  const value = parseFloat(String(formData.get("value") ?? "0"));
  const startsAt = String(formData.get("startsAt") ?? "") || null;
  const endsAt = String(formData.get("endsAt") ?? "") || null;
  const isActive = formData.get("isActive") === "on";

  if (!name || Number.isNaN(value) || value < 0) {
    return { ok: false, message: "Preencha nome e valor corretamente." };
  }

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin
    .from("additional_costs")
    .update({
      name,
      cost_type: costType,
      amount_type: amountType,
      value,
      starts_at: startsAt,
      ends_at: endsAt,
      is_active: isActive,
    })
    .eq("id", costId);

  if (error) return { ok: false, message: "Não foi possível atualizar o custo." };

  revalidatePath("/admin/analytics/vendas");
  return { ok: true, message: "Custo atualizado." };
}

export async function deleteAdditionalCost(costId: string): Promise<void> {
  const admin = await requirePermission("analytics.view");
  if (!admin) return;

  const supabaseAdmin = createAdminClient();
  await supabaseAdmin.from("additional_costs").delete().eq("id", costId);
  revalidatePath("/admin/analytics/vendas");
}

export async function updateProductCostPrice(productId: string, costPrice: number | null): Promise<CostActionResult> {
  const admin = await requirePermission("analytics.view");
  if (!admin) return { ok: false, message: "Acesso não autorizado." };

  if (costPrice != null && costPrice < 0) return { ok: false, message: "Valor inválido." };

  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("products").update({ cost_price: costPrice }).eq("id", productId);
  if (error) return { ok: false, message: "Não foi possível salvar o custo do produto." };

  revalidatePath("/admin/analytics/vendas");
  revalidatePath("/admin/analytics/produtos");
  revalidatePath("/admin/produtos");
  return { ok: true, message: "Custo do produto salvo." };
}
