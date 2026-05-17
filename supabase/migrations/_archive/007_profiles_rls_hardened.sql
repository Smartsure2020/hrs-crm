-- ============================================================
-- 007_profiles_rls_hardened.sql
-- Defense-in-depth: harden the profiles UPDATE RLS policy so
-- authenticated users cannot overwrite their own role or status,
-- even if column-level grants (005) are ever loosened.
-- ============================================================

DROP POLICY IF EXISTS "users_own_profile_update" ON profiles;

CREATE POLICY "users_own_profile_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role   = (SELECT role   FROM profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );
