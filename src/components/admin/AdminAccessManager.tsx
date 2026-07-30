"use client";

import { useState, useTransition } from "react";
import { ta, type TranslationKey } from "@/i18n";
import { updateAdminAccess, revokeAdminAccess, revokeAdminInvite } from "@/lib/actions/admins";
import { listGrantablePermissions, type Capability } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { StaffMember } from "@/lib/admin-directory";
import type { AdminInvite, UserRole } from "@/types/database";

const EDITABLE_ROLES: UserRole[] = ["estoque", "atendimento", "gerente", "administrador"];
const GRANTABLE = listGrantablePermissions();

function StaffRow({ member, currentUserId }: { member: StaffMember; currentUserId: string }) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<UserRole>(member.role === "administrador_principal" ? "administrador" : member.role);
  const [permissions, setPermissions] = useState<Record<string, boolean>>(member.permissions);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSelf = member.id === currentUserId;
  const isPrincipal = member.role === "administrador_principal";

  function togglePermission(cap: Capability) {
    setPermissions((prev) => ({ ...prev, [cap]: !prev[cap] }));
  }

  function save() {
    startTransition(async () => {
      const result = await updateAdminAccess(member.id, role, permissions);
      setMessage(result.message);
      if (result.ok) setEditing(false);
    });
  }

  function remove() {
    if (!confirm(ta("admin.administrators.confirmRemove"))) return;
    startTransition(async () => {
      const result = await revokeAdminAccess(member.id);
      setMessage(result.message);
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-brand-secondary">{member.fullName ?? member.email}</p>
          <p className="text-sm text-gray-500">{member.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{ta(`roles.${member.role}` as TranslationKey)}</Badge>
          <Badge tone={member.twoFactorEnabled ? "success" : "neutral"}>
            {member.twoFactorEnabled ? ta("admin.administrators.twoFactorOn") : ta("admin.administrators.twoFactorOff")}
          </Badge>
        </div>
      </div>

      {isPrincipal ? (
        <p className="mt-2 text-xs text-gray-500">{ta("admin.administrators.principalNote")}</p>
      ) : isSelf ? null : (
        <div className="mt-3 flex flex-col gap-3">
          {editing ? (
            <>
              <label className="flex flex-col gap-1 text-sm text-gray-700">
                {ta("admin.administrators.role")}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {EDITABLE_ROLES.map((r) => (
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
                      <input type="checkbox" checked={Boolean(permissions[cap])} onChange={() => togglePermission(cap)} />
                      {cap}
                    </label>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" disabled={isPending} onClick={save}>
                  {ta("common.save")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  {ta("common.cancel")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                {ta("admin.administrators.changeAccess")}
              </Button>
              <Button size="sm" variant="ghost" disabled={isPending} onClick={remove}>
                {ta("admin.administrators.removeAccess")}
              </Button>
            </div>
          )}
        </div>
      )}

      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
    </div>
  );
}

function InviteRow({ invite }: { invite: AdminInvite }) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function revoke() {
    startTransition(async () => {
      const result = await revokeAdminInvite(invite.id);
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3 text-sm">
      <div>
        <p className="font-medium text-brand-secondary">{invite.email}</p>
        <p className="text-gray-500">
          {ta(`roles.${invite.role}` as TranslationKey)} · {ta("admin.administrators.expiresAt")}{" "}
          {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={isPending} onClick={revoke}>
          {ta("admin.administrators.revoke")}
        </Button>
        {message && <span className="text-emerald-700">{message}</span>}
      </div>
    </div>
  );
}

export function AdminAccessManager({
  staff,
  pendingInvites,
  currentUserId,
}: {
  staff: StaffMember[];
  pendingInvites: AdminInvite[];
  currentUserId: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-brand-secondary">{ta("admin.administrators.currentStaff")}</h2>
        {staff.map((member) => (
          <StaffRow key={member.id} member={member} currentUserId={currentUserId} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-brand-secondary">{ta("admin.administrators.pendingInvites")}</h2>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-gray-500">{ta("admin.administrators.noPendingInvites")}</p>
        ) : (
          pendingInvites.map((invite) => <InviteRow key={invite.id} invite={invite} />)
        )}
      </section>
    </div>
  );
}
