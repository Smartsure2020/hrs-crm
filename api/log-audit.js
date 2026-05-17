import './instrument.js';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from './_auth.js';
import { Sentry } from './_sentry.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/log-audit
// Body: { action, record_type?, record_id?, record_name?, details? }
// User identity (user_email, user_role, user_name) is derived from the verified JWT —
// never trusted from the request body. This prevents forged audit entries.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { action, record_type, record_id, record_name, details } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action is required' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const { error } = await supabase.from('audit_logs').insert({
    user_name:   profile?.full_name || user.email,
    user_email:  user.email,
    user_role:   user._profile?.role || 'user',
    action,
    record_type: record_type ?? null,
    record_id:   record_id   ?? null,
    record_name: record_name ?? null,
    details:     details     ?? null,
  });

  if (error) {
    console.warn('Audit log insert failed:', error.message);
    Sentry.captureMessage(`Audit log insert failed: ${error.message}`, 'warning');
    return res.status(500).json({ error: 'Failed to write audit log' });
  }

  return res.status(200).json({ ok: true });
}
