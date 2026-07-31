import type { UserRole } from "@/types/database";

/**
 * Granular capabilities checked by server actions/routes before any
 * privileged read/write. UI elements (buttons, nav links) may also hide
 * based on these, but hiding a button is never the real gate — every
 * capability here must also be re-checked on the server before the action
 * that depends on it runs.
 */
export type Capability =
  | "products.manage"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "orders.refund"
  | "customers.view"
  | "customers.manage"
  | "promotions.manage"
  | "messages.manage"
  | "analytics.view"
  | "reports.export"
  | "settings.manage"
  | "security.manage"
  | "admins.manage"
  | "activities.view"
  | "maintenance.manage";

/** Capabilities that only ADMINISTRADOR_PRINCIPAL may ever hold, regardless of granted permissions. */
const PRINCIPAL_ONLY: ReadonlySet<Capability> = new Set([
  "orders.refund",
  "security.manage",
  "admins.manage",
]);

const STAFF_ROLES: ReadonlySet<UserRole> = new Set([
  "estoque",
  "atendimento",
  "gerente",
  "administrador",
  "administrador_principal",
]);

export function isStaffRole(role: UserRole): boolean {
  return STAFF_ROLES.has(role);
}

/** Fixed capability set per role. "administrador" has none fixed here — its capabilities come entirely from granted permissions (see hasPermission). */
const ROLE_MATRIX: Record<UserRole, ReadonlySet<Capability>> = {
  cliente: new Set(),
  estoque: new Set(["products.manage", "inventory.manage", "orders.view"]),
  atendimento: new Set(["orders.view", "orders.manage", "customers.view", "customers.manage", "messages.manage"]),
  gerente: new Set(["products.manage", "inventory.manage", "orders.view", "orders.manage", "promotions.manage", "analytics.view", "reports.export", "messages.manage", "activities.view"]),
  administrador: new Set(),
  administrador_principal: new Set([
    "products.manage",
    "inventory.manage",
    "orders.view",
    "orders.manage",
    "orders.refund",
    "customers.view",
    "customers.manage",
    "promotions.manage",
    "messages.manage",
    "analytics.view",
    "reports.export",
    "settings.manage",
    "security.manage",
    "admins.manage",
    "activities.view",
    "maintenance.manage",
  ]),
};

export interface PermissionCheckable {
  role: UserRole;
  /** Extra capabilities granted specifically to an "administrador" account. Ignored for every other role. */
  permissions?: Record<string, boolean> | null;
}

export function hasPermission(user: PermissionCheckable, capability: Capability): boolean {
  if (user.role === "administrador_principal") return true;
  if (PRINCIPAL_ONLY.has(capability)) return false;

  if (user.role === "administrador") {
    return Boolean(user.permissions?.[capability]);
  }

  return ROLE_MATRIX[user.role]?.has(capability) ?? false;
}

export function listGrantablePermissions(): Capability[] {
  return [
    "products.manage",
    "inventory.manage",
    "orders.view",
    "orders.manage",
    "customers.view",
    "customers.manage",
    "promotions.manage",
    "messages.manage",
    "analytics.view",
    "reports.export",
    "settings.manage",
    "activities.view",
  ];
}
