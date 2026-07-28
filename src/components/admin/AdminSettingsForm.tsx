"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { updateStoreSettings, type SettingsActionState } from "@/lib/actions/admin-settings";
import { Button } from "@/components/ui/Button";
import type { StoreSettings } from "@/lib/store-settings";

const initialState: SettingsActionState = { error: null };

export function AdminSettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction, isPending] = useActionState(updateStoreSettings, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="store_name" label={t("admin.settings.storeName")} defaultValue={settings.storeName} />
        <Field name="logo_url" label={t("admin.settings.logo")} defaultValue={settings.logoUrl ?? ""} />
        <Field
          name="favicon_url"
          label={t("admin.settings.favicon")}
          defaultValue={settings.faviconUrl ?? ""}
        />
        <Field
          name="font_family"
          label={t("admin.settings.fontFamily")}
          defaultValue={settings.fontFamily}
        />
        <Field
          name="primary_color"
          label={t("admin.settings.primaryColor")}
          defaultValue={settings.primaryColor}
        />
        <Field
          name="secondary_color"
          label={t("admin.settings.secondaryColor")}
          defaultValue={settings.secondaryColor}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          name="contact_email"
          label={t("admin.settings.contactEmail")}
          defaultValue={settings.contactEmail}
        />
        <Field
          name="contact_phone"
          label={t("admin.settings.contactPhone")}
          defaultValue={settings.contactPhone}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-brand-secondary">
          {t("admin.settings.socialLinks")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            name="social_instagram"
            label="Instagram"
            defaultValue={settings.socialLinks.instagram}
          />
          <Field name="social_facebook" label="Facebook" defaultValue={settings.socialLinks.facebook} />
          <Field name="social_tiktok" label="TikTok" defaultValue={settings.socialLinks.tiktok} />
          <Field name="social_youtube" label="YouTube" defaultValue={settings.socialLinks.youtube} />
        </div>
      </section>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("admin.settings.footerText")}
        <textarea
          name="footer_text"
          rows={2}
          defaultValue={settings.footerText}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      <Field name="home_hero_title" label="Título da página inicial" defaultValue={settings.homeHeroTitle} />
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Subtítulo da página inicial
        <textarea
          name="home_hero_subtitle"
          rows={2}
          defaultValue={settings.homeHeroSubtitle}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{t("admin.settings.saveSuccess")}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-fit">
        {t("common.save")}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
    </label>
  );
}
