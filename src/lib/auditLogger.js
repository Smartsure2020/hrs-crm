import { supabase } from '@/lib/supabaseClient';

/**
 * Appends an audit entry to audit_logs.
 * Fails silently — audit failures must never break the user flow.
 *
 * @param {object} user   - Current user from AuthContext
 * @param {string} action - Action enum value
 * @param {object} [opts] - { record_type, record_id, record_name, details }
 */
export async function logAudit(user, action, opts = {}) {
  if (!user) return;
  const { error } = await supabase.from('audit_logs').insert({
    user_name:   user.full_name || user.email,
    user_email:  user.email,
    user_role:   user.role || 'user',
    action,
    record_type: opts.record_type  ?? null,
    record_id:   opts.record_id    ?? null,
    record_name: opts.record_name  ?? null,
    details:     opts.details      ?? null,
  });
  if (error) console.warn('Audit log failed:', error.message);
}
