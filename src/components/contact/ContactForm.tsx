"use client";

import { useState, type FormEvent } from "react";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {t("contact.successMessage")}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label={t("contact.name")} />
      <Field label={t("contact.email")} type="email" />
      <Field label={t("contact.subject")} />
      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {t("contact.message")}
        <textarea
          required
          rows={5}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
        />
      </label>
      <Button type="submit" size="lg" className="w-full sm:w-auto">
        {t("contact.send")}
      </Button>
    </form>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      <input
        required
        type={type}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
    </label>
  );
}
