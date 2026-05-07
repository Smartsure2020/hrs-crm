-- ============================================================
-- 001_initial_schema.sql
-- HRS Insurance CRM — 10 entity tables
-- Column names match Base44 field names (all snake_case)
-- ============================================================

-- Auto-update updated_at trigger function (shared by all tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- deals
-- ────────────────────────────────────────────────────────────
CREATE TABLE deals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          text,
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
  client_id             text,
  client_name           text NOT NULL,
  deal_id               text,
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

CREATE TRIGGER policies_updated_at BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ────────────────────────────────────────────────────────────
-- claims
-- ────────────────────────────────────────────────────────────
CREATE TABLE claims (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        text NOT NULL,
  client_name      text NOT NULL,
  policy_id        text,
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
-- ────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  file_url      text NOT NULL,
  client_id     text,
  client_name   text,
  deal_id       text,
  policy_id     text,
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
-- ────────────────────────────────────────────────────────────
CREATE TABLE tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  client_id     text,
  client_name   text,
  deal_id       text,
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
-- audit_logs
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
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_audit_logs_user_email ON audit_logs (user_email);
CREATE INDEX idx_audit_logs_action     ON audit_logs (action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE TRIGGER audit_logs_updated_at BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
