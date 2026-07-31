"use client";

import { useActionState, useState } from "react";
import { ta, type TranslationKey } from "@/i18n";
import { createAdminInvite, type AdminActionResult } from "@/lib/actions/admins";
import { listGrantablePermissions } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/types/database";

const INVITABLE_ROLES: UserRole[] = ["estoque", "atendimento", "gerente", "administrador"];
const GRANTABLE = listGrantablePermissions();

const initialState: AdminActionResult = { ok: false, message: "" };

export function AdminInviteForm() {
  const [state, formAction, isPending] = useActionState(createAdminInvite, initialState);
  const [role, setRole] = useState<UserRole>("atendimento");

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4">
      <h2 className="font-semibold text-brand-secondary">{ta("admin.administrators.inviteNew")}</h2>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {ta("admin.administrators.email")}
        <input required name="email" type="email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </label>

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        {ta("admin.administrators.role")}
        <select name="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ta(`roles.${r}` as TranslationKey)}
            </option>
          ))}
        </select>
      </label>

      {role === "administrador" && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {GRANTABLE.map((cap) => (
            <label key={cap} className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" name={`perm_${cap}`} />
              {cap}
            </label>
          ))}
        </div>
      )}

      {state.message && (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"}>{state.message}</p>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {ta("admin.administrators.sendInvite")}
      </Button>
    </form>
  );
}
