# Rebuilding the HRS CRM database from baseline

Use these steps when you need to build the schema on a fresh Supabase project, or to wipe and rebuild the current cloud database.

> **Note on data loss:** Step 1 destroys all existing data, including the two current user profiles. Users will need to re-register through the app after the schema is restored, and the admin user must be re-promoted manually (Step 3).

---

## Steps

### 1. Wipe the existing schema

In the Supabase dashboard, open the **SQL Editor** and run:

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

This removes all tables, functions, triggers, policies, and indexes. It does **not** affect `auth.users` — existing auth accounts survive. However, since `profiles` is linked to `auth.users` via a foreign key, the profiles rows are gone; users will get a fresh profile row when they next sign in (via the `on_auth_user_created` trigger that `000_baseline.sql` recreates).

### 2. Apply the baseline

In the SQL Editor, paste and run the full contents of `000_baseline.sql`. This creates all ten tables, functions, triggers, indexes, RLS policies, and column grants in a single transaction.

Alternatively, if you have the Supabase CLI configured with a local project:

```bash
supabase db push
```

### 3. Re-promote the admin user

After the baseline is applied, any user who signs in will receive `role = 'broker'` and `status = 'pending'` (the defaults in `handle_new_user()`). The admin user must sign in first, then be promoted via the SQL Editor:

```sql
UPDATE profiles
SET role = 'admin', status = 'active'
WHERE email = 'juan-paul@hrsinsurance.co.za';
```

The user must exist in `auth.users` (i.e. must have signed in at least once) before this UPDATE will find a row to update.

### 4. Verify

Spot-check a few things in the SQL Editor:

```sql
-- Confirm no updated_at on audit_logs
SELECT column_name FROM information_schema.columns
WHERE table_name = 'audit_logs' AND column_name = 'updated_at';
-- Should return 0 rows

-- Confirm admin was promoted
SELECT email, role, status FROM profiles WHERE email = 'juan-paul@hrsinsurance.co.za';

-- Confirm RLS is enabled on all tables
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' ORDER BY tablename;
-- All rows should show rowsecurity = true
```
