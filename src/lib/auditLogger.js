import { supabase } from '@/lib/supabaseClient';

/**
 * Appends an audit entry via the API so user identity is derived server-side
 * from the verified JWT, not from client-supplied values.
 * Fails silently — audit failures must never break the user flow.
 *
 * @param {object} user   - Current user from AuthContext (used only as an auth guard)
 * @param {string} action - Action enum value
 * @param {object} [opts] - { record_type, record_id, record_name, details }
 */
export async function logAudit(user, action, opts = {}) {
  if (!user) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch('/api/log-audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action,
        record_type: opts.record_type ?? null,
        record_id:   opts.record_id   ?? null,
        record_name: opts.record_name ?? null,
        details:     opts.details     ?? null,
      }),
    });
  } catch (err) {
    console.warn('Audit log failed:', err.message);
  }
}
