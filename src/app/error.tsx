"use client";

import { useEffect, useState } from "react";
import { t } from "@/i18n";
import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [errorId] = useState(() => error.digest ?? `ERR-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    // Client-side console only — the server-side render/action that threw
    // this already logged full details via src/lib/logger.ts. Never surface
    // error.message/stack to the user: it can contain internal paths or
    // query fragments.
    console.error(`[client-error ${errorId}]`, error);
  }, [error, errorId]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-brand-secondary">{t("pages.error.title")}</h1>
      <p className="text-gray-600">{t("pages.error.message")}</p>
      <p className="text-xs text-gray-400">
        {t("pages.error.errorId")}: {errorId}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => reset()}>
          {t("pages.error.tryAgain")}
        </Button>
        <Button href="/">{t("pages.error.backHome")}</Button>
      </div>
    </div>
  );
}
