-- Phase 3: normalized provider cost snapshot line details.

create table public.provider_cost_snapshot_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_id uuid not null
    references public.provider_cost_snapshots(id) on delete cascade,
  line_kind text not null default 'cost',
  external_project_id text,
  external_api_key_id text,
  line_item text,
  amount numeric(14,6) not null check (amount >= 0),
  currency text not null references public.currency_codes(code),
  quantity numeric(20,6),
  raw_line jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index provider_cost_snapshot_lines_snapshot_idx
  on public.provider_cost_snapshot_lines (snapshot_id);

create index provider_cost_snapshot_lines_user_idx
  on public.provider_cost_snapshot_lines (user_id);

create index provider_cost_snapshot_lines_currency_idx
  on public.provider_cost_snapshot_lines (currency);

revoke all on public.provider_cost_snapshot_lines from public, anon, authenticated;
grant select, insert on public.provider_cost_snapshot_lines to authenticated;

alter table public.provider_cost_snapshot_lines enable row level security;

create policy "own_select" on public.provider_cost_snapshot_lines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.provider_cost_snapshot_lines
  for insert to authenticated with check ((select auth.uid()) = user_id);
