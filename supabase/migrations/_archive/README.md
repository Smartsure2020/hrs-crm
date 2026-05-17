# Archived migrations: 001–007

These seven files were squashed into `../000_baseline.sql` on 2026-05-17. At the time of squashing, the Supabase cloud database contained no business data — only two test user profiles. The database will be rebuilt from `000_baseline.sql` using the steps in `../REBUILD.md`.

**Do not run these files against any database.** They are kept here as a historical record of how the schema evolved, not as runnable migrations. Running them would be incorrect: they contain intermediate states (e.g. a permissive `users_own_profile_update` policy that 007 later hardened; an `audit_logs.updated_at` column and trigger that 006 later removed) that `000_baseline.sql` already resolves into their final intended form.
