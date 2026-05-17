-- Fix deals.stage default to match the Zod enum values.
-- The old default 'lead' is not in the enum; 'lead_received' is the correct equivalent.
ALTER TABLE deals ALTER COLUMN stage SET DEFAULT 'lead_received';
