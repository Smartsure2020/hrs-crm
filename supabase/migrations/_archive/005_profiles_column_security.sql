-- ============================================================
-- 005_profiles_column_security.sql
-- Prevent privilege escalation via self-service profile updates.
-- Authenticated users may only update the three cosmetic fields;
-- role and status remain admin/service_role territory.
-- ============================================================

-- Drop the broad column-level UPDATE grant inherited from Supabase
-- defaults, then re-grant only the safe subset.
-- service_role and supabase_admin bypass RLS/grants entirely, so
-- admin operations via the API layer are unaffected.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT  UPDATE (full_name, phone, avatar_url) ON profiles TO authenticated;
