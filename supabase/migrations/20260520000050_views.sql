-- supabase/migrations/20260520000050_views.sql

-- 4.6 effective status + next date
create view public.tracked_items_v
  with (security_invoker = true) as
select
  ti.*,
  case
    when ti.status = 'active'
         and ti.expiry_date is not null
         and ti.expiry_date < current_date
      then 'expired'
    else ti.status::text
  end as effective_status,
  case
    when ti.billing_cycle is null then null
    else public.roll_forward(ti.billing_anchor_date, ti.billing_cycle, ti.custom_cycle_days)
  end as effective_next_date
from public.tracked_items ti;

-- 4.7 per-currency monthly burn
create view public.tracked_items_burn_v
  with (security_invoker = true) as
select
  user_id,
  currency,
  sum(
    case ti.billing_cycle
      when 'weekly'      then amount * 52.0 / 12.0
      when 'monthly'     then amount
      when 'quarterly'   then amount / 3.0
      when 'yearly'      then amount / 12.0
      when 'custom_days' then amount * 365.2425 / custom_cycle_days
    end
  ) as monthly_burn
from public.tracked_items_v ti
where effective_status = 'active'
  and type in ('subscription', 'hybrid')
  and amount is not null
  and currency is not null
  and billing_cycle is not null
group by user_id, currency;

-- 4.8 event projection
create view public.tracked_item_events_v
  with (security_invoker = true) as
select
  ti.id                   as tracked_item_id,
  ti.user_id,
  ti.name,
  ti.type,
  ti.effective_status,
  ti.amount,
  ti.currency,
  ti.category,
  ti.provider,
  'billing'::text         as event_kind,
  ti.effective_next_date  as event_date
from public.tracked_items_v ti
where ti.effective_status = 'active'
  and ti.billing_cycle is not null
  and ti.effective_next_date is not null

union all

select
  ti.id                   as tracked_item_id,
  ti.user_id,
  ti.name,
  ti.type,
  ti.effective_status,
  ti.amount,
  ti.currency,
  ti.category,
  ti.provider,
  'expiry'::text          as event_kind,
  ti.expiry_date          as event_date
from public.tracked_items_v ti
where ti.expiry_date is not null
  and ti.effective_status in ('active', 'expired');

-- 4.9 view privileges (read-only enforcement, server-only app).
-- Revoke Postgres defaults (PUBLIC) and anon entirely; grant SELECT only to
-- authenticated. The app calls Supabase with the user's JWT, never with the
-- anon key — anon must not see these objects via PostgREST or pg_graphql.
-- Closes Supabase linter 0026 (anon GraphQL exposure).
revoke all on
  public.tracked_items_v,
  public.tracked_item_events_v,
  public.tracked_items_burn_v
from public, anon, authenticated;

grant select on
  public.tracked_items_v,
  public.tracked_item_events_v,
  public.tracked_items_burn_v
to authenticated;
