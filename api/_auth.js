import { createClient } from '@supabase/supabase-js';

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
  return user;
}

const ADMIN_ROLES = ['admin', 'admin_staff'];

export async function requireAdmin(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!ADMIN_ROLES.includes(profile?.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return user;
}
