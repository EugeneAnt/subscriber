-- Phase 3: user-owned provider connections and budget settings.

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_code text not null references public.provider_catalog(code),
  display_name text not null check (length(trim(display_name)) > 0),
  status text not null default 'active'
    check (status in ('active', 'paused')),
  credential_source text not null default 'server_env'
    check (credential_source in ('server_env', 'supabase_vault')),
  credential_name text,
  external_account_id text,
  external_project_ids text[] not null default '{}',
  currency text references public.currency_codes(code),
  monthly_budget numeric(14,2)
    check (monthly_budget is null or monthly_budget >= 0),
  warning_remaining_amount numeric(14,2)
    check (warning_remaining_amount is null or warning_remaining_amount >= 0),
  critical_remaining_amount numeric(14,2)
    check (critical_remaining_amount is null or critical_remaining_amount >= 0),
  provider_config jsonb not null default '{}'::jsonb,
  last_sync_started_at timestamptz,
  last_sync_finished_at timestamptz,
  last_sync_status text
    check (last_sync_status is null or last_sync_status in ('success', 'error')),
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint provider_connections_unique_provider
    unique (user_id, provider_code, display_name),
  constraint provider_connections_threshold_order
    check (
      warning_remaining_amount is null
      or critical_remaining_amount is null
      or warning_remaining_amount >= critical_remaining_amount
    )
);

create index provider_connections_user_id_idx
  on public.provider_connections (user_id);

create index provider_connections_provider_code_idx
  on public.provider_connections (provider_code);

create index provider_connections_currency_idx
  on public.provider_connections (currency);

create trigger provider_connections_touch_updated_at
  before update on public.provider_connections
  for each row execute function public.touch_updated_at();

revoke all on public.provider_connections from public, anon, authenticated;
grant select, insert, update, delete on public.provider_connections to authenticated;

alter table public.provider_connections enable row level security;

create policy "own_select" on public.provider_connections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.provider_connections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own_update" on public.provider_connections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.provider_connections
  for delete to authenticated using ((select auth.uid()) = user_id);
