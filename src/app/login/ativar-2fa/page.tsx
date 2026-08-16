import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta } from "@/i18n";
import { requireStaffSession } from "@/lib/auth";
import { getAssuranceLevel } from "@/lib/mfa";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { MfaEnrollment } from "@/components/auth/MfaEnrollment";

export const metadata: Metadata = { title: ta("auth.mfa.setupTitle") };

interface ActivateMfaPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

/**
 * Mandatory first-time TOTP setup for staff accounts. Reached automatically
 * by src/proxy.ts whenever a staff session's nextLevel isn't 'aal2' (no
 * verified factor yet) -- there is no way to "skip" and still get into
 * /admin, by design (the middleware will just send them back here).
 */
export default async function ActivateMfaPage({ searchParams }: ActivateMfaPageProps) {
  const user = await requireStaffSession();
  if (!user) redirect("/login");

  const { redirect: redirectParam } = await searchParams;
  const redirectTo = safeRedirectPath(redirectParam, "/admin");

  const { currentLevel } = await getAssuranceLevel();
  if (currentLevel === "aal2") redirect(redirectTo);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-bold text-brand-secondary">{ta("auth.mfa.setupTitle")}</h1>
        <p className="mt-2 text-sm text-gray-600">{ta("auth.mfa.setupExplanation")}</p>
      </div>
      <MfaEnrollment redirectTo={redirectTo} />
    </div>
  );
}
