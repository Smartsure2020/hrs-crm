import { base44 } from "@/api/client";

/**
 * Logs an audit event to the AuditLog entity.
 * Call this for any tracked user action.
 *
 * @param {object} user - The current user object (from base44.auth.me())
 * @param {string} action - The action enum value (see AuditLog entity)
 * @param {object} [opts] - Optional metadata
 * @param {string} [opts.record_type] - Entity type affected
 * @param {string} [opts.record_id] - ID of the affected record
 * @param {string} [opts.record_name] - Display name of record/page
 * @param {string} [opts.details] - Extra context
 */
export async function logAudit(user, action, opts = {}) {
  if (!user) return;
  try {
    await base44.entities.AuditLog.create({
      user_name: user.full_name || user.email,
      user_email: user.email,
      user_role: user.role || "user",
      action,
      record_type: opts.record_type || "",
      record_id: opts.record_id || "",
      record_name: opts.record_name || "",
      details: opts.details || "",
    });
  } catch (e) {
    // Audit failures should never break the app
    console.warn("Audit log failed:", e);
  }
}