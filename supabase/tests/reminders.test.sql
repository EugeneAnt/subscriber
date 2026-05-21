-- supabase/tests/reminders.test.sql
begin;
select plan(18);

insert into auth.users (id, email)
  values
    ('00000000-0000-0000-0000-000000000101', 'reminder-a@test.local'),
    ('00000000-0000-0000-0000-000000000102', 'reminder-b@test.local')
  on conflict (id) do nothing;

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}';
set local role authenticated;

insert into public.tracked_items (id, user_id, name, type, billing_cycle, billing_anchor_date, amount, currency)
  values (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'Billing reminder target',
    'subscription',
    'monthly',
    current_date + 7,
    10,
    'USD'
  );

insert into public.tracked_items (id, user_id, name, type, expiry_date)
  values (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000101',
    'Expiry target',
    'expiry',
    current_date + 7
  );

insert into public.tracked_items (id, user_id, name, type, billing_cycle, billing_anchor_date)
  values (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000101',
    'Snooze target',
    'subscription',
    'monthly',
    current_date + 1
  );

select cmp_ok(
  (select count(*) from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001'),
  '=',
  2::bigint,
  'billing event emits 7-day and 1-day reminders'
);

select results_eq(
  $$ select lead_days from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' order by lead_days $$,
  $$ values (1), (7) $$,
  'billing reminders use lead days 1 and 7'
);

select is(
  (select reminder_due_date from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  current_date,
  '7-day reminder is due today when event is 7 days away'
);

select cmp_ok(
  (select count(*) from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000002'),
  '=',
  0::bigint,
  'expiry events do not emit reminders in Phase 2 defaults'
);

select is(
  (select is_visible from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  true,
  'due unread reminder is visible'
);

select is(
  (select is_unread from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  true,
  'due reminder is unread without state'
);

insert into public.reminder_states (user_id, tracked_item_id, event_kind, event_date, lead_days, read_at)
  values (
    '00000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000001',
    'billing',
    current_date + 7,
    7,
    now()
  );

select is(
  (select is_visible from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  true,
  'read reminder remains visible'
);

select is(
  (select is_unread from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  false,
  'read reminder no longer counts as unread'
);

update public.reminder_states
  set dismissed_at = now(), snoozed_until = null
  where tracked_item_id = '10000000-0000-0000-0000-000000000001'
    and lead_days = 7;

select is(
  (select is_visible from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000001' and lead_days = 7),
  false,
  'dismissed reminder is hidden'
);

insert into public.reminder_states (user_id, tracked_item_id, event_kind, event_date, lead_days, read_at, snoozed_until)
  values (
    '00000000-0000-0000-0000-000000000101',
    '10000000-0000-0000-0000-000000000003',
    'billing',
    current_date + 1,
    1,
    now(),
    current_date + 1
  );

select is(
  (select is_visible from public.tracked_item_reminders_v where tracked_item_id = '10000000-0000-0000-0000-000000000003' and lead_days = 1),
  false,
  'due reminder snoozed until a future date is hidden'
);

select throws_ok(
  $$ insert into public.reminder_states (user_id, tracked_item_id, event_kind, event_date, lead_days, dismissed_at, snoozed_until)
     values ('00000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', 'billing', current_date + 8, 7, now(), current_date + 1) $$,
  '23514',
  null,
  'dismissed and snoozed cannot both be set'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}';
set local role authenticated;

select cmp_ok(
  (select count(*) from public.tracked_item_reminders_v),
  '=',
  0::bigint,
  'other user sees no reminder rows through security_invoker view'
);

select cmp_ok(
  (select count(*) from public.reminder_states),
  '=',
  0::bigint,
  'other user sees no reminder state rows'
);

select throws_ok(
  $$ insert into public.reminder_states (user_id, tracked_item_id, event_kind, event_date, lead_days)
     values ('00000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', 'billing', current_date + 7, 7) $$,
  '42501',
  null,
  'cross-user reminder state insert raises RLS violation'
);

with res as (
  update public.reminder_states
    set read_at = now()
    where user_id = '00000000-0000-0000-0000-000000000101'
    returning 1
)
select cmp_ok((select count(*) from res), '=', 0::bigint, 'cross-user update is no-op');

with res as (
  delete from public.reminder_states
    where user_id = '00000000-0000-0000-0000-000000000101'
    returning 1
)
select cmp_ok((select count(*) from res), '=', 0::bigint, 'cross-user delete is no-op');

set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

select throws_ok(
  $$ select count(*) from public.reminder_states $$,
  '42501',
  null,
  'anon cannot select reminder_states'
);

select throws_ok(
  $$ select count(*) from public.tracked_item_reminders_v $$,
  '42501',
  null,
  'anon cannot select tracked_item_reminders_v'
);

reset role;
select * from finish();
rollback;
