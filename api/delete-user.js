import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from './_auth.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireAdmin(req, res);
  if (!caller) return;

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  // Prevent an admin from deleting themselves
  if (userId === caller.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  try {
    // Delete profile row first (guards against missing ON DELETE CASCADE)
    await supabase.from('profiles').delete().eq('id', userId);

    // Remove auth identity — prevents the user from logging in with old credentials
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('delete-user error:', err);
    return res.status(500).json({ error: err.message });
  }
}
