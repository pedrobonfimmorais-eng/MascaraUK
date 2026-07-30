"use client";

import { useActionState } from "react";
import { t, type TranslationKey } from "@/i18n";
import {
  updateStoreInfo,
  updateAppearance,
  updateSalesSettings,
  updateShippingRules,
  updateEmailSettings,
  updateMaintenanceSettings,
  type SettingsActionState,
} from "@/lib/actions/admin-settings";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StoreSettings } from "@/lib/store-settings";
import type { PaymentIntegrationStatus, IntegrationState } from "@/lib/integration-status";
import type { SecurityOverview } from "@/lib/admin-directory";
import type { ShippingRuleOption } from "@/lib/cart/cart-data";

const initialState: SettingsActionState = { error: null };

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input name={name} defaultValue={defaultValue} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none" />
    </label>
  );
}

function SaveBar({ state }: { state: SettingsActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("admin.settings.saveSuccess")}</p>}
    </>
  );
}

export function StoreInfoTab({ settings }: { settings: StoreSettings }) {
  const [state, formAction, isPending] = useActionState(updateStoreInfo, initialState);
  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{t("admin.settings.storeInfo.requiredWarning")}</p>
      <Field name="store_name" label={t("admin.settings.storeName")} defaultValue={settings.storeName} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="contact_email" label={t("admin.settings.contactEmail")} defaultValue={settings.contactEmail} />
        <Field name="contact_phone" label={t("admin.settings.contactPhone")} defaultValue={settings.contactPhone} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="tax_id" label={t("admin.settings.storeInfo.taxId")} defaultValue={settings.taxId} />
        <Field name="business_address" label={t("admin.settings.storeInfo.businessAddress")} defaultValue={settings.businessAddress} />
      </div>
      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}

export function AppearanceTab({ settings }: { settings: StoreSettings }) {
  const [state, formAction, isPending] = useActionState(updateAppearance, initialState);
  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="logo_url" label={t("admin.settings.logo")} defaultValue={settings.logoUrl ?? ""} />
        <Field name="favicon_url" label={t("admin.settings.favicon")} defaultValue={settings.faviconUrl ?? ""} />
        <Field name="font_family" label={t("admin.settings.fontFamily")} defaultValue={settings.fontFamily} />
        <Field name="primary_color" label={t("admin.settings.primaryColor")} defaultValue={settings.primaryColor} />
        <Field name="secondary_color" label={t("admin.settings.secondaryColor")} defaultValue={settings.secondaryColor} />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand-secondary">{t("admin.settings.socialLinks")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field name="social_instagram" label="Instagram" defaultValue={settings.socialLinks.instagram} />
          <Field name="social_facebook" label="Facebook" defaultValue={settings.socialLinks.facebook} />
          <Field name="social_tiktok" label="TikTok" defaultValue={settings.socialLinks.tiktok} />
          <Field name="social_youtube" label="YouTube" defaultValue={settings.socialLinks.youtube} />
        </div>
      </section>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.settings.footerText")}
        <textarea name="footer_text" rows={2} defaultValue={settings.footerText} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <Field name="home_hero_title" label="Título da página inicial" defaultValue={settings.homeHeroTitle} />
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Subtítulo da página inicial
        <textarea name="home_hero_subtitle" rows={2} defaultValue={settings.homeHeroSubtitle} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}

export function SalesTab({ settings, currency, lowStockQuantity }: { settings: StoreSettings; currency: string; lowStockQuantity: number }) {
  const [state, formAction, isPending] = useActionState(updateSalesSettings, initialState);
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <Field name="store_currency" label={t("admin.settings.sales.currency")} defaultValue={currency} />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="allow_guest_checkout" defaultChecked={settings.allowGuestCheckout} />
        {t("admin.settings.sales.allowGuestCheckout")}
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.settings.sales.lowStockQuantity")}
        <input type="number" min={0} name="low_stock_quantity" defaultValue={lowStockQuantity} className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <p className="text-xs text-gray-500">{t("admin.settings.sales.lowStockHint")}</p>
      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}

export function DeliveryTab({ shippingRules }: { shippingRules: { free_shipping_threshold: number; options: ShippingRuleOption[] } }) {
  const [state, formAction, isPending] = useActionState(updateShippingRules, initialState);
  const standard = shippingRules.options.find((o) => o.id === "standard") ?? shippingRules.options[0];
  const express = shippingRules.options.find((o) => o.id === "express") ?? shippingRules.options[1];

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.settings.delivery.freeShippingThreshold")}
        <input type="number" step="0.01" name="free_shipping_threshold" defaultValue={shippingRules.free_shipping_threshold} className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>

      {(["standard", "express"] as const).map((kind) => {
        const option = kind === "standard" ? standard : express;
        const labelKey: TranslationKey = kind === "standard" ? "admin.settings.delivery.standardOption" : "admin.settings.delivery.expressOption";
        return (
          <section key={kind} className="rounded-lg border border-gray-200 p-3">
            <h3 className="mb-2 text-sm font-semibold text-brand-secondary">{t(labelKey)}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field name={`${kind}_label`} label={t("admin.settings.delivery.label")} defaultValue={option?.label ?? ""} />
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                {t("admin.settings.delivery.rate")}
                <input type="number" step="0.01" name={`${kind}_rate`} defaultValue={option?.rate ?? 0} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                {t("admin.settings.delivery.daysMin")}
                <input type="number" name={`${kind}_days_min`} defaultValue={option?.estimate_days_min ?? 0} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                {t("admin.settings.delivery.daysMax")}
                <input type="number" name={`${kind}_days_max`} defaultValue={option?.estimate_days_max ?? 0} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>
          </section>
        );
      })}

      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}

function integrationBadge(state: IntegrationState) {
  const tone = state === "funcionando" ? "success" : state === "modo_teste" ? "brand" : "neutral";
  return <Badge tone={tone}>{t(`admin.settings.integrationStatus.${state}` as TranslationKey)}</Badge>;
}

export function PaymentsTab({ status }: { status: PaymentIntegrationStatus }) {
  return (
    <div className="flex max-w-md flex-col gap-3 text-sm">
      <h2 className="font-semibold text-brand-secondary">{t("admin.settings.payments.title")}</h2>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <span>{t("admin.settings.payments.stripeStatus")}</span>
        {integrationBadge(status.state)}
      </div>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <span>{t("admin.settings.payments.webhookStatus")}</span>
        {integrationBadge(status.webhookConfigured ? "funcionando" : "nao_configurado")}
      </div>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
        <span>{t("admin.settings.payments.publishableKeyStatus")}</span>
        {integrationBadge(status.publishableKeyConfigured ? "funcionando" : "nao_configurado")}
      </div>
      <p className="text-xs text-gray-500">{t("admin.settings.payments.neverShowSecret")}</p>
    </div>
  );
}

export function EmailsTab({ settings, providerState }: { settings: StoreSettings; providerState: IntegrationState }) {
  const [state, formAction, isPending] = useActionState(updateEmailSettings, initialState);
  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
        <span>{t("admin.settings.emails.providerStatus")}</span>
        {integrationBadge(providerState)}
      </div>
      <Field name="email_from_name" label={t("admin.settings.emails.fromName")} defaultValue={settings.emailFromName} />
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="marketing_emails_enabled" defaultChecked={settings.marketingEmailsEnabled} />
        {t("admin.settings.emails.marketingEnabled")}
      </label>
      <p className="text-xs text-gray-500">{t("admin.settings.emails.marketingHint")}</p>
      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}

export function SecurityTab({ overview }: { overview: SecurityOverview | null }) {
  if (!overview) {
    return <p className="text-sm text-gray-500">{t("admin.administrators.principalNote")}</p>;
  }
  return (
    <div className="flex max-w-lg flex-col gap-4 text-sm">
      <h2 className="font-semibold text-brand-secondary">{t("admin.settings.security.title")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">{t("admin.settings.security.totalStaff")}</p>
          <p className="text-lg font-semibold">{overview.totalStaff}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">{t("admin.settings.security.staffWith2fa")}</p>
          <p className="text-lg font-semibold">{overview.staffWith2fa}</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-xs text-gray-500">{t("admin.settings.security.recentFailedAttempts")}</p>
          <p className="text-lg font-semibold">{overview.recentFailedAttempts}</p>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">{t("admin.settings.security.recentLogins")}</h3>
        <ul className="flex flex-col gap-1">
          {overview.recentLoginAttempts.map((attempt, i) => (
            <li key={i} className="flex items-center justify-between rounded border border-gray-100 px-2 py-1">
              <span>{attempt.email}</span>
              <span className="flex items-center gap-2">
                <Badge tone={attempt.success ? "success" : "danger"}>{attempt.success ? "OK" : "Falha"}</Badge>
                <span className="text-xs text-gray-400">{new Date(attempt.createdAt).toLocaleString("pt-BR")}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-gray-500">{t("admin.settings.security.manageAdmins")}</p>
    </div>
  );
}

export function MaintenanceTab({ settings, isPrincipal }: { settings: StoreSettings; isPrincipal: boolean }) {
  const [state, formAction, isPending] = useActionState(updateMaintenanceSettings, initialState);

  if (!isPrincipal) {
    return <p className="text-sm text-gray-500">{t("admin.settings.maintenance.principalOnly")}</p>;
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{t("admin.settings.maintenance.warning")}</p>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" name="maintenance_mode" defaultChecked={settings.maintenanceMode} />
        {t("admin.settings.maintenance.enabled")}
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.settings.maintenance.message")}
        <textarea name="maintenance_message" rows={3} defaultValue={settings.maintenanceMessage} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>
      <Field name="maintenance_estimated_return" label={t("admin.settings.maintenance.estimatedReturn")} defaultValue={settings.maintenanceEstimatedReturn} />
      <SaveBar state={state} />
      <Button type="submit" size="lg" disabled={isPending} className="w-fit">{t("common.save")}</Button>
    </form>
  );
}
