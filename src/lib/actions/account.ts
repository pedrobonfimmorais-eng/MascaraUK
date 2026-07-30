"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import type { Address } from "@/types/database";

export interface AccountActionState {
  error: string | null;
  success?: boolean;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Nome, sobrenome, telefone, data de nascimento (opcional) e preferências de comunicação. */
export async function updateProfile(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar autenticado." };

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const marketingOptIn = formData.get("marketingOptIn") === "on";

  if (!firstName || !lastName) {
    return { error: "Informe seu nome e sobrenome." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      phone: phone || null,
      birth_date: birthDate || null,
      marketing_opt_in: marketingOptIn,
    })
    .eq("id", user.id);

  if (error) return { error: "Não foi possível salvar o perfil." };

  revalidatePath("/minha-conta");
  revalidatePath("/minha-conta/perfil");
  return { error: null, success: true };
}

/**
 * Changing the e-mail always requires a new confirmation (Supabase Auth's
 * "secure email change" sends a confirmation link to the new address before
 * it takes effect) — the address on file never changes just by submitting
 * this form.
 */
export async function requestEmailChange(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar autenticado." };

  const newEmail = String(formData.get("newEmail") ?? "").trim();
  if (!newEmail || !newEmail.includes("@")) {
    return { error: "Digite um e-mail válido." };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${siteUrl}/api/auth/callback?next=/minha-conta/perfil` }
  );

  if (error) return { error: "Não foi possível iniciar a troca de e-mail." };

  return { error: null, success: true };
}

export interface AddressActionState {
  error: string | null;
  success?: boolean;
}

const REQUIRED_ADDRESS_FIELDS = [
  "recipientName",
  "phone",
  "zipCode",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
] as const;

function readAddressPayload(formData: FormData) {
  return {
    recipient_name: String(formData.get("recipientName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    zip_code: digitsOnly(String(formData.get("zipCode") ?? "")),
    street: String(formData.get("street") ?? "").trim(),
    number: String(formData.get("number") ?? "").trim(),
    complement: String(formData.get("complement") ?? "").trim() || null,
    neighborhood: String(formData.get("neighborhood") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    country: String(formData.get("country") ?? "BR").trim() || "BR",
    reference: String(formData.get("reference") ?? "").trim() || null,
    label: String(formData.get("label") ?? "").trim() || null,
  };
}

/** Never invents missing address data — every required field must be present and non-empty. */
function validateAddressPayload(formData: FormData): string | null {
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    if (!String(formData.get(field) ?? "").trim()) {
      return "Preencha todos os campos obrigatórios do endereço.";
    }
  }

  const zipCode = digitsOnly(String(formData.get("zipCode") ?? ""));
  if (zipCode.length !== 8) {
    return "Digite um CEP válido com 8 dígitos.";
  }

  return null;
}

export async function createAddress(
  _prevState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar autenticado." };

  const validationError = validateAddressPayload(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { count } = await supabase
    .from("addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isFirstAddress = !count || count === 0;

  const { error } = await supabase.from("addresses").insert({
    user_id: user.id,
    ...readAddressPayload(formData),
    is_default: isFirstAddress,
    is_shipping_default: isFirstAddress,
    is_billing_default: isFirstAddress,
  });

  if (error) return { error: "Não foi possível salvar o endereço." };

  revalidatePath("/minha-conta/enderecos");
  return { error: null, success: true };
}

export async function updateAddress(
  addressId: string,
  _prevState: AddressActionState,
  formData: FormData
): Promise<AddressActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Você precisa estar autenticado." };

  const validationError = validateAddressPayload(formData);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .update(readAddressPayload(formData))
    .eq("id", addressId)
    .eq("user_id", user.id);

  if (error) return { error: "Não foi possível atualizar o endereço." };

  revalidatePath("/minha-conta/enderecos");
  return { error: null, success: true };
}

export async function deleteAddress(addressId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("addresses").delete().eq("id", addressId).eq("user_id", user.id);
  revalidatePath("/minha-conta/enderecos");
}

export async function setDefaultAddress(
  addressId: string,
  kind: "main" | "shipping" | "billing"
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const supabase = await createClient();

  const columnUpdates: Record<"main" | "shipping" | "billing", Partial<Address>> = {
    main: { is_default: false },
    shipping: { is_shipping_default: false },
    billing: { is_billing_default: false },
  };
  const columnUpdatesTrue: Record<"main" | "shipping" | "billing", Partial<Address>> = {
    main: { is_default: true },
    shipping: { is_shipping_default: true },
    billing: { is_billing_default: true },
  };

  await supabase.from("addresses").update(columnUpdates[kind]).eq("user_id", user.id);
  await supabase.from("addresses").update(columnUpdatesTrue[kind]).eq("id", addressId).eq("user_id", user.id);

  revalidatePath("/minha-conta/enderecos");
}
