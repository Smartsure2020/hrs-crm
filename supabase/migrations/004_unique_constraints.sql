-- ============================================================
-- 004_unique_constraints.sql
-- Deduplication constraints for clients and policies
-- ============================================================

-- SA ID numbers are nationally unique per person.
-- Partial index so NULL / empty values don't conflict.
CREATE UNIQUE INDEX idx_clients_id_number_unique
  ON clients (id_number)
  WHERE id_number IS NOT NULL AND id_number <> '';

-- SA company registration numbers are nationally unique.
CREATE UNIQUE INDEX idx_clients_company_reg_unique
  ON clients (company_reg)
  WHERE company_reg IS NOT NULL AND company_reg <> '';

-- Policy numbers are unique per insurer.
ALTER TABLE policies
  ADD CONSTRAINT uq_policies_number_insurer UNIQUE (policy_number, insurer);
