-- Phase 2: in-app reminder state and derived reminder view.

create table public.reminder_states (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tracked_item_id uuid not null references public.tracked_items(id) on delete cascade,
  event_kind      text not null check (event_kind in ('billing', 'expiry')),
  event_date      date not null check (
    event_date >= date '1900-01-01'
    and event_date <= date '2100-12-31'
  ),
  lead_days       integer not null check (lead_days >= 0 and lead_days <= 365),
  read_at         timestamptz,
  dismissed_at    timestamptz,
  snoozed_until   date check (
    snoozed_until is null
    or (snoozed_until >= date '1900-01-01' and snoozed_until <= date '2100-12-31')
  ),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint reminder_states_unique_instance
    unique (user_id, tracked_item_id, event_kind, event_date, lead_days),
  constraint reminder_states_snooze_not_dismissed
    check (dismissed_at is null or snoozed_until is null)
);

create index reminder_states_user_id_idx
  on public.reminder_states (user_id);

-- The unique constraint already creates the covering instance index.
-- Do not add a duplicate index on the same column list.
create index reminder_states_user_snoozed_until_idx
  on public.reminder_states (user_id, snoozed_until)
  where snoozed_until is not null;

create trigger reminder_states_touch_updated_at
  before update on public.reminder_states
  for each row execute function public.touch_updated_at();

revoke all on public.reminder_states from public, anon, authenticated;
grant select, insert, update, delete on public.reminder_states to authenticated;

alter table public.reminder_states enable row level security;

create policy "own_select" on public.reminder_states
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.reminder_states
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own_update" on public.reminder_states
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.reminder_states
  for delete to authenticated using ((select auth.uid()) = user_id);

create view public.tracked_item_reminders_v
  with (security_invoker = true) as
with reminder_defaults(event_kind, lead_days) as (
  values
    ('billing'::text, 7),
    ('billing'::text, 1)
)
select
  e.user_id,
  e.tracked_item_id,
  e.name,
  e.type,
  e.effective_status,
  e.amount,
  e.currency,
  e.category,
  e.provider,
  e.event_kind,
  e.event_date,
  d.lead_days,
  (e.event_date - d.lead_days) as reminder_due_date,
  rs.id as state_id,
  rs.read_at,
  rs.dismissed_at,
  rs.snoozed_until,
  (
    rs.dismissed_at is null
    and e.event_date >= current_date
    and current_date >= coalesce(rs.snoozed_until, e.event_date - d.lead_days)
  ) as is_visible,
  (
    rs.dismissed_at is null
    and rs.read_at is null
    and e.event_date >= current_date
    and current_date >= coalesce(rs.snoozed_until, e.event_date - d.lead_days)
  ) as is_unread
from public.tracked_item_events_v e
join reminder_defaults d
  on d.event_kind = e.event_kind
left join public.reminder_states rs
  on rs.user_id = e.user_id
 and rs.tracked_item_id = e.tracked_item_id
 and rs.event_kind = e.event_kind
 and rs.event_date = e.event_date
 and rs.lead_days = d.lead_days;

revoke all on public.tracked_item_reminders_v from public, anon, authenticated;
grant select on public.tracked_item_reminders_v to authenticated;
