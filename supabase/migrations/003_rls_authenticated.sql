-- ============================================================
-- 003_rls_authenticated.sql
-- Broker-scoped RLS policies for all business tables
-- Brokers see only records assigned to them; admins see all
-- SECURITY DEFINER on is_admin() prevents infinite recursion
-- when profiles itself is queried from within other policies
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Helper: true when the current user is admin or admin_staff
-- SECURITY DEFINER so this runs as the function owner and
-- bypasses RLS on profiles (avoids recursion if profiles
-- ever gets admin policies added later)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'admin_staff')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ────────────────────────────────────────────────────────────
-- clients
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_clients" ON clients
  FOR ALL TO authenticated
  USING (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  )
  WITH CHECK (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- deals
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_deals" ON deals
  FOR ALL TO authenticated
  USING (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  )
  WITH CHECK (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- policies
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_policies" ON policies
  FOR ALL TO authenticated
  USING (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  )
  WITH CHECK (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- claims
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_claims" ON claims
  FOR ALL TO authenticated
  USING (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  )
  WITH CHECK (
    assigned_broker = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- documents
-- No assigned_broker column; scope by uploaded_by for writes.
-- Reads: also visible if the linked client belongs to broker.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_documents" ON documents
  FOR ALL TO authenticated
  USING (
    uploaded_by = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = documents.client_id
        AND c.assigned_broker = auth.jwt()->>'email'
    )
    OR is_admin()
  )
  WITH CHECK (
    uploaded_by = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- tasks
-- No assigned_broker column; scope by assigned_to for writes.
-- Reads: also visible if the linked client belongs to broker.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_tasks" ON tasks
  FOR ALL TO authenticated
  USING (
    assigned_to = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id::text = tasks.client_id
        AND c.assigned_broker = auth.jwt()->>'email'
    )
    OR is_admin()
  )
  WITH CHECK (
    assigned_to = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- activity_logs
-- Brokers see their own log entries; admins see all.
-- Service_role handles all writes (API layer).
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_activity_logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    user_email = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- audit_logs
-- Admin read-only. Writes go exclusively through service_role.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

-- ────────────────────────────────────────────────────────────
-- commission_splits
-- Brokers read their own split; admins manage all.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_read_own_commission_split" ON commission_splits
  FOR SELECT TO authenticated
  USING (
    broker_email = auth.jwt()->>'email'
    OR is_admin()
  );

CREATE POLICY "admins_manage_commission_splits" ON commission_splits
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
