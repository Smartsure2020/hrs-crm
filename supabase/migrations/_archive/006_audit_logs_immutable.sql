-- ============================================================
-- 006_audit_logs_immutable.sql
-- Make audit_logs append-only for FAIS compliance.
--
-- Problems fixed:
--   1. updated_at column + trigger allowed records to be modified.
--   2. No INSERT policy for authenticated users meant frontend
--      logAudit() calls were silently failing post-Base44 migration.
-- ============================================================

-- 1. Remove mutability
DROP TRIGGER IF EXISTS audit_logs_updated_at ON audit_logs;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS updated_at;

-- 2. Allow authenticated users to append their own entries.
--    No UPDATE or DELETE policy means those operations are blocked
--    for the authenticated role.  service_role bypasses RLS by
--    default and retains full access for admin tooling.
CREATE POLICY "authenticated_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_email = auth.jwt()->>'email');
