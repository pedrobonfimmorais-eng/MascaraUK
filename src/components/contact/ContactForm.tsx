"use client";

import { useActionState } from "react";
import { t } from "@/i18n";
import { submitContactMessage, type ContactFormState } from "@/lib/actions/contact";
import { Button } from "@/components/ui/Button";

const initialState: ContactFormState = { error: null };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactMessage, initialState);

  if (state.success) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {t("contact.successMessage")}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Honeypot: hidden from real visitors, simple spam bots fill it in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0"
        style={{ left: "-9999px" }}
      />

      <Field label={t("contact.name")} name="name" />
      <Field label={t("contact.email")} name="email" type="email" />
      <Field label={t("contact.phone")} name="phone" type="tel" required={false} />
      <Field label={t("contact.subject")} name="subject" />
      <Field label={t("contact.orderNumber")} name="orderNumber" required={false} />

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("contact.message")}
        <textarea
          name="message"
          required
          rows={5}
          maxLength={5000}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {t("contact.send")}
      </Button>
    </form>
  );
}

function Field({ label, name, type = "text", required = true }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        name={name}
        required={required}
        type={type}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
    </label>
  );
}
