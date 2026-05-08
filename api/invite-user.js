import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getAppUrl(req) {
  const envUrl =
    process.env.APP_URL ||
    process.env.SITE_URL ||
    process.env.VITE_APP_URL;

  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';

  if (host) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  return 'https://crm.hrsinsurance.co.za';
}

// Invite a new user by creating a Supabase auth account and a profiles row.
// The user receives a Supabase invite email and is redirected to the live CRM.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, role = 'broker' } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const appUrl = getAppUrl(req);

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { role },
      redirectTo: `${appUrl}/auth/callback`,
    });

    if (error) throw error;

    await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        email,
        role,
        status: 'pending',
      },
      { onConflict: 'id' }
    );

    return res.status(200).json({
      id: data.user.id,
      email,
      redirectTo: `${appUrl}/auth/callback`,
    });
  } catch (err) {
    console.error('invite-user error:', err);
    return res.status(500).json({ error: err.message });
  }
}