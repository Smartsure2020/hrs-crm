import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Invite a new user by creating a Supabase auth account and a profiles row.
// The user receives a magic-link / password-reset email to set their password.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, role = 'broker' } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    // Create the auth user — Supabase sends them an invite email automatically
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role },
    });
    if (error) throw error;

    // Upsert the profile row with the requested role
    // (the handle_new_user trigger may have already created it)
    await supabase.from('profiles').upsert(
      { id: data.user.id, email, role, status: 'pending' },
      { onConflict: 'id' }
    );

    return res.status(200).json({ id: data.user.id, email });
  } catch (err) {
    console.error('invite-user error:', err);
    return res.status(500).json({ error: err.message });
  }
}
