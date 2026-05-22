-- Phase 3: UI-ready provider connection view with latest snapshot and budget status.

create view public.provider_connections_v
  with (security_invoker = true) as
select
  pc.*,
  latest.id as latest_snapshot_id,
  latest.period_start,
  latest.period_end_exclusive,
  latest.total_amount as current_period_spend,
  latest.currency as current_period_currency,
  latest.fetched_at as latest_fetched_at,
  case
    when pc.monthly_budget is null or latest.total_amount is null then null
    else pc.monthly_budget - latest.total_amount
  end as remaining_budget,
  case
    when pc.last_sync_status = 'error' then 'sync_error'
    when latest.id is null then 'unknown'
    when pc.monthly_budget is null then 'healthy'
    when latest.total_amount > pc.monthly_budget then 'over_budget'
    when pc.critical_remaining_amount is not null
      and pc.monthly_budget - latest.total_amount <= pc.critical_remaining_amount
      then 'critical'
    when pc.warning_remaining_amount is not null
      and pc.monthly_budget - latest.total_amount <= pc.warning_remaining_amount
      then 'warning'
    else 'healthy'
  end as budget_status
from public.provider_connections pc
left join lateral (
  select *
  from public.provider_cost_snapshots pcs
  where pcs.provider_connection_id = pc.id
  order by pcs.fetched_at desc
  limit 1
) latest on true;

revoke all on public.provider_connections_v from public, anon, authenticated;
grant select on public.provider_connections_v to authenticated;
