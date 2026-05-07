import { createClient } from '@supabase/supabase-js';

// Browser client — uses anon key, respects RLS
// Used by the frontend for auth session management
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
