import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Single write path for the /admin/atividades activity log. Never pass
 * passwords, private keys, tokens, or full card numbers in `details` — this
 * table is shown verbatim in the admin panel and is intentionally
 * append-only (no update/delete policy exists on admin_logs).
 */
export async function logAdminAction(params: {
  adminId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("admin_logs").insert({
      admin_id: params.adminId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      details: params.details ?? null,
    });
  } catch (error) {
    // Logging must never block the action it's recording.
    console.error("[activity-log] failed to record action", params.action, error);
  }
}
