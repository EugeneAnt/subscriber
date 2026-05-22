-- Phase 3: normalized provider cost snapshots.

create table public.provider_cost_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_connection_id uuid not null
    references public.provider_connections(id) on delete cascade,
  period_start date not null,
  period_end_exclusive date not null,
  period_kind text not null default 'month_to_date_utc'
    check (period_kind in ('month_to_date_utc', 'custom_utc')),
  total_amount numeric(14,6) not null check (total_amount >= 0),
  currency text not null references public.currency_codes(code),
  provider_observed_at timestamptz,
  fetched_at timestamptz not null default now(),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint provider_cost_snapshots_valid_period
    check (period_end_exclusive > period_start)
);

create index provider_cost_snapshots_connection_period_idx
  on public.provider_cost_snapshots (
    provider_connection_id,
    period_start,
    period_end_exclusive,
    fetched_at desc
  );

create index provider_cost_snapshots_user_fetched_idx
  on public.provider_cost_snapshots (user_id, fetched_at desc);

create index provider_cost_snapshots_currency_idx
  on public.provider_cost_snapshots (currency);

revoke all on public.provider_cost_snapshots from public, anon, authenticated;
grant select, insert on public.provider_cost_snapshots to authenticated;

alter table public.provider_cost_snapshots enable row level security;

create policy "own_select" on public.provider_cost_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.provider_cost_snapshots
  for insert to authenticated with check ((select auth.uid()) = user_id);
