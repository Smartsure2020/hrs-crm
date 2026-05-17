# HRS CRM — Supabase Migrations

## Baseline

`000_baseline.sql` is the frozen starting point for the HRS CRM schema. It represents the fully resolved state of migrations 001–007, squashed on 2026-05-17. **Do not edit it.** If you discover a problem with the baseline schema, fix it in a new migration (008+).

The archived originals live in `_archive/` for historical reference only.

## Adding new migrations

- Name files `008_short_description.sql`, `009_...`, etc. — three-digit prefix, lexical ordering.
- Open each file with a header comment block explaining **what** the migration does and **why** (the ticket, the bug, the compliance requirement).
- Prefer idempotent DDL where practical (`CREATE TABLE IF NOT EXISTS`, `DROP INDEX IF EXISTS`, etc.), but it is not required.
- Never edit a migration that has already been applied to any database. Fix forward in a new file.

## Applying migrations

Supabase applies migrations in lexical filename order. There is currently no local dev environment or CI database; migrations are run manually via the Supabase dashboard SQL editor or the Supabase CLI (`supabase db push`) once a local setup is established.

To rebuild from scratch, see `REBUILD.md` in this directory.
