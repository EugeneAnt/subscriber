-- Phase 3: supported provider catalog. App users can read provider metadata,
-- but providers are managed by migrations.

create table public.provider_catalog (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  display_name text not null check (length(trim(display_name)) > 0),
  supports_cost_sync boolean not null default false,
  supports_balance boolean not null default false,
  supports_thresholds boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.provider_catalog (
  code,
  display_name,
  supports_cost_sync,
  supports_balance,
  supports_thresholds
) values (
  'openai',
  'OpenAI',
  true,
  false,
  false
);

revoke all on public.provider_catalog from public, anon, authenticated;
grant select on public.provider_catalog to authenticated;

alter table public.provider_catalog enable row level security;

create policy "provider_catalog_read" on public.provider_catalog
  for select to authenticated using (true);
