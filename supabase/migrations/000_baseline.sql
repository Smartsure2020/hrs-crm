-- ============================================================
-- 000_baseline.sql
-- Baseline schema for HRS CRM.
-- Squashed from migrations 001–007 on 2026-05-17.
-- Treat as frozen history — do not edit.
-- All future schema changes go in 008+.
-- ============================================================


-- ============================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================

-- Shared trigger: keeps updated_at current on every row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Returns true when the calling user has role 'admin' or 'admin_staff'.
-- SECURITY DEFINER so this runs as the function owner and bypasses RLS
-- on profiles, preventing infinite recursion when profiles is queried
-- from within another table's policy.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'admin_staff')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- SECTION 2: TABLES
-- (CREATE TABLE · ENABLE RLS · service_role policy · indexes ·
--  unique constraints · trigger)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- clients
-- ────────────────────────────────────────────────────────────
CREATE TABLE clients (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_type           text DEFAULT 'personal',
  status                text DEFAULT 'prospect',
  surname               text,
  initials              text,
  first_name            text,
  id_number             text,
  client_name           text NOT NULL,
  company_name          text,
  contact_person        text,
  company_reg           text,
  vat_number            text,
  email                 text,
  phone                 text,
  street_address        text,
  complex_number        text,
  suburb                text,
  city                  text,
  province              text,
  postal_code           text,
  address               text,
  current_insurer       text,
  current_policy_no     text,
  proposed_insurer      text,
  referror              text,
  effective_date        date,
  renewal_date          date,
  assigned_broker       text,
  broker_name           text,
  notes                 text,
  broker_commission_pct numeric,
  hrs_commission_pct    numeric,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_clients_status          ON clients (status);
CREATE INDEX idx_clients_assigned_broker ON clients (assigned_broker);
CREATE INDEX idx_clients_created_at      ON clients (created_at DESC);
CREATE INDEX idx_clients_renewal_date    ON clients (renewal_date);

-- SA ID numbers are nationally unique per person; NULL/empty excluded.
CREATE UNIQUE INDEX idx_clients_id_number_unique
  ON clients (id_number)
  WHERE id_number IS NOT NULL AND id_number <> '';

-- SA company registration numbers are nationally unique; NULL/empty excluded.
CREATE UNIQUE INDEX idx_clients_company_reg_unique
  ON clients (company_reg)
  WHERE company_reg IS NOT NULL AND company_reg <> '';

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- deals
-- ────────────────────────────────────────────────────────────
CREATE TABLE deals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name        text NOT NULL,
  contact_phone      text,
  contact_email      text,
  policy_type        text,
  estimated_premium  numeric,
  stage              text DEFAULT 'lead',
  assigned_broker    text,
  broker_name        text,
  notes              text,
  next_action        text,
  reminder_date      date,
  insurer            text,
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON deals FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_deals_stage           ON deals (stage);
CREATE INDEX idx_deals_client_id       ON deals (client_id);
CREATE INDEX idx_deals_assigned_broker ON deals (assigned_broker);
CREATE INDEX idx_deals_created_at      ON deals (created_at DESC);

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- policies
-- ────────────────────────────────────────────────────────────
CREATE TABLE policies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number         text NOT NULL,
  client_id             uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name           text NOT NULL,
  deal_id               uuid REFERENCES deals(id) ON DELETE SET NULL,
  insurer               text NOT NULL,
  policy_type           text NOT NULL,
  monthly_premium       numeric,
  premium               numeric,
  start_date            date,
  renewal_date          date,
  assigned_broker       text,
  broker_name           text,
  status                text DEFAULT 'active',
  notes                 text,
  broker_commission_pct numeric,
  hrs_commission_pct    numeric,
  created_at            timestamptz DEFAULT now() NOT NULL,
  updated_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON policies FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_policies_client_id       ON policies (client_id);
CREATE INDEX idx_policies_status          ON policies (status);
CREATE INDEX idx_policies_assigned_broker ON policies (assigned_broker);
CREATE INDEX idx_policies_renewal_date    ON policies (renewal_date);
CREATE INDEX idx_policies_created_at      ON policies (created_at DESC);

-- Policy numbers are unique per insurer.
ALTER TABLE policies
  ADD CONSTRAINT uq_policies_number_insurer UNIQUE (policy_number, insurer);

CREATE TRIGGER policies_updated_at BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- claims
-- ────────────────────────────────────────────────────────────
CREATE TABLE claims (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  client_name      text NOT NULL,
  policy_id        uuid REFERENCES policies(id) ON DELETE SET NULL,
  policy_number    text,
  claim_number     text,
  claim_type       text DEFAULT 'other',
  status           text DEFAULT 'open',
  date_of_incident date,
  date_submitted   date,
  date_settled     date,
  amount_claimed   numeric,
  amount_settled   numeric,
  insurer          text,
  description      text,
  notes            text,
  assigned_broker  text,
  broker_name      text,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON claims FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_claims_client_id       ON claims (client_id);
CREATE INDEX idx_claims_policy_id       ON claims (policy_id);
CREATE INDEX idx_claims_status          ON claims (status);
CREATE INDEX idx_claims_assigned_broker ON claims (assigned_broker);
CREATE INDEX idx_claims_created_at      ON claims (created_at DESC);

CREATE TRIGGER claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- documents
-- No assigned_broker column; broker scope uses uploaded_by or
-- linked client's assigned_broker (see policies section).
-- ────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  file_url      text NOT NULL,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name   text,
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  policy_id     uuid REFERENCES policies(id) ON DELETE SET NULL,
  folder        text DEFAULT 'general',
  document_type text DEFAULT 'other',
  tags          text[],
  uploaded_by   text,
  version       integer DEFAULT 1,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_documents_client_id    ON documents (client_id);
CREATE INDEX idx_documents_policy_id    ON documents (policy_id);
CREATE INDEX idx_documents_folder       ON documents (folder);
CREATE INDEX idx_documents_uploaded_by  ON documents (uploaded_by);
CREATE INDEX idx_documents_created_at   ON documents (created_at DESC);

CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- tasks
-- No assigned_broker column; broker scope uses assigned_to or
-- linked client's assigned_broker (see policies section).
-- ────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  client_name   text,
  deal_id       uuid REFERENCES deals(id) ON DELETE SET NULL,
  due_date      date NOT NULL,
  assigned_to   text,
  assigned_name text,
  status        text DEFAULT 'pending',
  priority      text DEFAULT 'medium',
  task_type     text DEFAULT 'general',
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_tasks_status      ON tasks (status);
CREATE INDEX idx_tasks_due_date    ON tasks (due_date);
CREATE INDEX idx_tasks_assigned_to ON tasks (assigned_to);
CREATE INDEX idx_tasks_client_id   ON tasks (client_id);
CREATE INDEX idx_tasks_created_at  ON tasks (created_at DESC);

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- profiles (linked to auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email       text,
  full_name   text,
  role        text DEFAULT 'broker',
  status      text DEFAULT 'pending',
  phone       text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_profiles_email  ON profiles (email);
CREATE INDEX idx_profiles_role   ON profiles (role);
CREATE INDEX idx_profiles_status ON profiles (status);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'broker'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ────────────────────────────────────────────────────────────
-- activity_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  entity_name text,
  user_email  text,
  user_name   text,
  details     text,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON activity_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_activity_logs_entity_type ON activity_logs (entity_type);
CREATE INDEX idx_activity_logs_entity_id   ON activity_logs (entity_id);
CREATE INDEX idx_activity_logs_user_email  ON activity_logs (user_email);
CREATE INDEX idx_activity_logs_created_at  ON activity_logs (created_at DESC);

CREATE TRIGGER activity_logs_updated_at BEFORE UPDATE ON activity_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- audit_logs (append-only for FAIS compliance)
-- No updated_at column and no trigger — records are immutable
-- once written. INSERT restricted to the row owner; no UPDATE
-- or DELETE policy exists for any non-service_role principal.
-- ────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name   text,
  user_email  text NOT NULL,
  user_role   text,
  action      text NOT NULL,
  record_type text,
  record_id   text,
  record_name text,
  details     text,
  ip_address  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_audit_logs_user_email ON audit_logs (user_email);
CREATE INDEX idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);


-- ────────────────────────────────────────────────────────────
-- commission_splits
-- ────────────────────────────────────────────────────────────
CREATE TABLE commission_splits (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_email       text NOT NULL,
  broker_name        text NOT NULL,
  broker_percentage  numeric NOT NULL,
  hrs_percentage     numeric NOT NULL,
  notes              text,
  created_at         timestamptz DEFAULT now() NOT NULL,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE commission_splits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON commission_splits FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_commission_splits_broker_email ON commission_splits (broker_email);
CREATE INDEX idx_commission_splits_created_at   ON commission_splits (created_at DESC);

CREATE TRIGGER commission_splits_updated_at BEFORE UPDATE ON commission_splits
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- SECTION 3: CROSS-CUTTING POLICIES
-- (broker-scoped access for business tables, profile policies,
--  audit_logs policies, commission_splits policies)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- clients — broker-scoped
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
-- deals — broker-scoped
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
-- policies — broker-scoped
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
-- claims — broker-scoped
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
-- documents — broker-scoped
-- Reads: visible if uploaded by broker OR linked client belongs
-- to broker. Writes: only the uploader can insert/update.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_documents" ON documents
  FOR ALL TO authenticated
  USING (
    uploaded_by = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = documents.client_id
        AND c.assigned_broker = auth.jwt()->>'email'
    )
    OR is_admin()
  )
  WITH CHECK (
    uploaded_by = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- tasks — broker-scoped
-- Reads: visible if assigned to broker OR linked client belongs
-- to broker. Writes: only the assignee can insert/update.
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_tasks" ON tasks
  FOR ALL TO authenticated
  USING (
    assigned_to = auth.jwt()->>'email'
    OR EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = tasks.client_id
        AND c.assigned_broker = auth.jwt()->>'email'
    )
    OR is_admin()
  )
  WITH CHECK (
    assigned_to = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- activity_logs — broker read own, admins read all
-- Writes go through service_role only (API layer).
-- ────────────────────────────────────────────────────────────
CREATE POLICY "brokers_own_activity_logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    user_email = auth.jwt()->>'email'
    OR is_admin()
  );

-- ────────────────────────────────────────────────────────────
-- audit_logs — admin read; authenticated users may insert their own
-- ────────────────────────────────────────────────────────────
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "authenticated_insert_audit_logs" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_email = auth.jwt()->>'email');

-- ────────────────────────────────────────────────────────────
-- profiles — own read; hardened own update; admins managed via
-- service_role (no separate admin authenticated policy needed,
-- service_role_all covers admin tooling).
-- ────────────────────────────────────────────────────────────
CREATE POLICY "users_own_profile_read" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- role and status are pinned to their current DB values so a
-- broker cannot self-escalate even if column grants are later widened.
CREATE POLICY "users_own_profile_update" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role   = (SELECT role   FROM profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM profiles WHERE id = auth.uid())
  );

-- ────────────────────────────────────────────────────────────
-- commission_splits — brokers read own; admins manage all
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


-- ============================================================
-- SECTION 4: COLUMN-LEVEL GRANTS
-- ============================================================

-- Brokers may only update cosmetic profile fields.
-- role and status stay admin/service_role territory.
REVOKE UPDATE ON profiles FROM authenticated;
GRANT  UPDATE (full_name, phone, avatar_url) ON profiles TO authenticated;
