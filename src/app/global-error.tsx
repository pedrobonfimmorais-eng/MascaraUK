"use client";

import { useEffect, useState } from "react";

/**
 * Catches errors thrown by the root layout itself (where the normal
 * error.tsx boundary can't help because it renders inside that same
 * layout). Must render its own <html>/<body> and stays framework-plain —
 * no i18n/import from app code that could itself throw.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [errorId] = useState(() => error.digest ?? `ERR-${Date.now().toString(36).toUpperCase()}`);

  useEffect(() => {
    console.error(`[global-error ${errorId}]`, error);
  }, [error, errorId]);

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Algo deu errado</h1>
          <p>Ocorreu um erro inesperado. Nossa equipe já foi notificada.</p>
          <p style={{ fontSize: "0.75rem", color: "#888" }}>Código do erro: {errorId}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: "0.625rem 1.25rem", borderRadius: "0.5rem", background: "#111", color: "#fff", cursor: "pointer" }}
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
