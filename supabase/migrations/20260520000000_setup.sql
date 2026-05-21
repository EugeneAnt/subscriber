-- supabase/migrations/20260520000000_setup.sql
-- Phase 1 setup: extensions and helper function.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- Trigger function used by tracked_items (and any future table).
-- search_path is set to '' to defend against search_path injection
-- (Supabase linter 0011). Postgres always searches pg_catalog implicitly,
-- so built-ins like now() resolve without an explicit pg_catalog entry.
create or replace function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
