"use client";

import { useState, type FormEvent } from "react";
import { t } from "@/i18n";

export function NewsletterForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return <p className="text-sm font-medium text-emerald-700">{t("home.newsletterSuccess")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        {t("footer.newsletterPlaceholder")}
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        placeholder={t("footer.newsletterPlaceholder")}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        {t("footer.newsletterButton")}
      </button>
    </form>
  );
}
