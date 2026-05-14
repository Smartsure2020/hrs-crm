import { createClient } from '@supabase/supabase-js';
import { ADMIN_ROLES } from './_permissions.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function requireAuth(req, res) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', user.id)
    .single();
  if (!profile || (profile.status !== 'active' && !ADMIN_ROLES.includes(profile.role))) {
    res.status(403).json({ error: 'Account not active' });
    return null;
  }
  user._profile = profile;
  return user;
}

export async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  if (!ADMIN_ROLES.includes(user._profile?.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
}
