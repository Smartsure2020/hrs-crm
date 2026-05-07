import { createClient } from '@supabase/supabase-js';

// Server-only admin client — uses service role key, bypasses RLS
// NEVER import this from frontend (src/) code
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabaseAdmin;
