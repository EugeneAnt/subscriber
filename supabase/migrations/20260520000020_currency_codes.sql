create table public.currency_codes (
  code text primary key check (code ~ '^[A-Z]{3}$')
);

insert into public.currency_codes (code) values
  ('USD'), ('EUR'), ('KZT'), ('GBP'), ('RUB');

-- Privileges (RLS policies added in 060_rls.sql).
-- The app is server-only: SvelteKit always calls Supabase with the user's
-- authenticated JWT; anon never reads this table. Revoke Postgres defaults
-- (which grant SELECT to PUBLIC and to anon implicitly) and grant SELECT
-- only to authenticated. Closes Supabase linter 0026 (anon GraphQL exposure).
revoke all on public.currency_codes from public, anon, authenticated;
grant select on public.currency_codes to authenticated;
