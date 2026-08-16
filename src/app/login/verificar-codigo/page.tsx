import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ta } from "@/i18n";
import { requireStaffSession } from "@/lib/auth";
import { getAssuranceLevel, listMyTotpFactors } from "@/lib/mfa";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";

export const metadata: Metadata = { title: ta("auth.mfa.challengeTitle") };

interface VerifyMfaPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

/**
 * Step-up challenge: reached automatically by src/proxy.ts whenever a
 * staff session already has a verified TOTP factor (nextLevel === 'aal2')
 * but THIS session hasn't cleared the challenge yet (currentLevel !== 'aal2')
 * -- e.g. right after a fresh e-mail/password login.
 */
export default async function VerifyMfaPage({ searchParams }: VerifyMfaPageProps) {
  const user = await requireStaffSession();
  if (!user) redirect("/login");

  const { redirect: redirectParam } = await searchParams;
  const redirectTo = safeRedirectPath(redirectParam, "/admin");

  const { currentLevel, nextLevel } = await getAssuranceLevel();
  if (currentLevel === "aal2") redirect(redirectTo);
  if (nextLevel !== "aal2") redirect(`/login/ativar-2fa?redirect=${encodeURIComponent(redirectTo)}`);

  const factors = await listMyTotpFactors();
  const factor = factors.find((f) => f.status === "verified") ?? factors[0];
  if (!factor) redirect(`/login/ativar-2fa?redirect=${encodeURIComponent(redirectTo)}`);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-xl font-bold text-brand-secondary">{ta("auth.mfa.challengeTitle")}</h1>
        <p className="mt-2 text-sm text-gray-600">{ta("auth.mfa.challengeExplanation")}</p>
      </div>
      <MfaChallengeForm factorId={factor.id} redirectTo={redirectTo} />
    </div>
  );
}
