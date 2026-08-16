import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta } from "@/i18n";
import { requireAdmin } from "@/lib/auth";
import { listMyTotpFactors } from "@/lib/mfa";
import { MfaEnrollment } from "@/components/auth/MfaEnrollment";
import { MfaFactorManager } from "@/components/admin/MfaFactorManager";

export const metadata: Metadata = { title: ta("admin.sidebar.mfa") };

/**
 * Self-service MFA management, reachable by any staff role (not gated by
 * a specific capability) — every admin account, regardless of what it can
 * do inside /admin, owns managing its own second factor. Reaching this
 * page at all already proves aal2 (requireAdmin() enforces it, and so does
 * src/proxy.ts before this route even renders).
 */
export default async function AdminMfaPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/acesso-negado");

  const factors = await listMyTotpFactors();

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-bold text-brand-secondary">{ta("admin.sidebar.mfa")}</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-brand-secondary">{ta("auth.mfa.factorsTitle")}</h2>
        <MfaFactorManager factors={factors} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-brand-secondary">{ta("auth.mfa.setupTitle")}</h2>
        <MfaEnrollment redirectTo="/admin/2fa" />
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <h2 className="mb-1 font-semibold">{ta("auth.mfa.lostDeviceTitle")}</h2>
        <p>{ta("auth.mfa.lostDeviceExplanation")}</p>
      </section>
    </div>
  );
}
