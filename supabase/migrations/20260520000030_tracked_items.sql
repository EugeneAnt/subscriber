-- supabase/migrations/20260520000030_tracked_items.sql
create table public.tracked_items (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null
    check (length(trim(name)) > 0 and length(name) <= 200),
  type                public.tracked_item_type not null,
  billing_cycle       public.billing_cycle,
  custom_cycle_days   integer
    check (custom_cycle_days is null or (custom_cycle_days >= 1 and custom_cycle_days <= 3650)),
  billing_anchor_date date
    check (billing_anchor_date is null or
           (billing_anchor_date >= date '1900-01-01' and billing_anchor_date <= date '2100-12-31')),
  amount              numeric(14,2)
    check (amount is null or (amount >= 0 and amount <= 9999999999.99)),
  currency            text references public.currency_codes(code),
  expiry_date         date
    check (expiry_date is null or
           (expiry_date >= date '1900-01-01' and expiry_date <= date '2100-12-31')),
  status              public.tracked_item_status not null default 'active',
  category            text
    check (category is null or (length(trim(category)) > 0 and length(category) <= 200)),
  provider            text
    check (provider is null or (length(trim(provider)) > 0 and length(provider) <= 200)),
  notes               text
    check (notes is null or length(notes) <= 5000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint subscription_needs_cycle
    check (type = 'expiry' or billing_cycle is not null),
  constraint expiry_needs_date
    check (type = 'subscription' or expiry_date is not null),
  constraint custom_days_needs_value
    check (billing_cycle is distinct from 'custom_days' or custom_cycle_days is not null),
  constraint amount_currency_paired
    check ((amount is null) = (currency is null)),
  constraint anchor_when_cycle
    check (billing_cycle is null or billing_anchor_date is not null)
);

create index tracked_items_user_id_idx        on public.tracked_items (user_id);
create index tracked_items_user_status_idx    on public.tracked_items (user_id, status);
create index tracked_items_user_anchor_idx    on public.tracked_items (user_id, billing_anchor_date);
create index tracked_items_user_expiry_idx    on public.tracked_items (user_id, expiry_date);

create trigger tracked_items_touch_updated_at
  before update on public.tracked_items
  for each row execute function public.touch_updated_at();

-- Privileges (RLS policies added in 060_rls.sql).
-- Revoke Postgres defaults (which grant DML to PUBLIC and anon implicitly)
-- and grant only what authenticated needs. RLS then limits authenticated
-- to their own rows. Closes Supabase linter 0026 (anon GraphQL exposure).
revoke all on public.tracked_items from public, anon, authenticated;
grant select, insert, update, delete on public.tracked_items to authenticated;
