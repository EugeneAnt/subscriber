-- supabase/tests/burn_view.test.sql
begin;
select plan(8);

insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000001', 'a@test.local')
  on conflict (id) do nothing;

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- Weekly: 7.00 * 52 / 12 = 30.3333...
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency)
  values ('00000000-0000-0000-0000-000000000001', 'Weekly', 'subscription', 'weekly', '2026-01-01', 7.00, 'USD');

-- Monthly: 9.99
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency)
  values ('00000000-0000-0000-0000-000000000001', 'Monthly', 'subscription', 'monthly', '2026-01-01', 9.99, 'USD');

-- Quarterly: 30.00 / 3 = 10.00
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency)
  values ('00000000-0000-0000-0000-000000000001', 'Quarterly', 'subscription', 'quarterly', '2026-01-01', 30.00, 'EUR');

-- Yearly: 120.00 / 12 = 10.00
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency)
  values ('00000000-0000-0000-0000-000000000001', 'Yearly', 'subscription', 'yearly', '2026-01-01', 120.00, 'EUR');

-- Custom days = 10: amount * 365.2425 / 10
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, custom_cycle_days, amount, currency)
  values ('00000000-0000-0000-0000-000000000001', 'Custom10', 'subscription', 'custom_days', '2026-01-01', 10, 1.00, 'GBP');

-- Paused: must be excluded
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency, status)
  values ('00000000-0000-0000-0000-000000000001', 'Paused', 'subscription', 'monthly', '2026-01-01', 100.00, 'USD', 'paused');

-- Cancelled: must be excluded
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date, amount, currency, status)
  values ('00000000-0000-0000-0000-000000000001', 'Cancelled', 'subscription', 'monthly', '2026-01-01', 100.00, 'USD', 'cancelled');

-- Pure expiry: no billing cycle, must be excluded
insert into public.tracked_items (user_id, name, type, expiry_date)
  values ('00000000-0000-0000-0000-000000000001', 'Domain', 'expiry', '2027-06-01');

-- USD total: 30.3333 + 9.99 = 40.32 (rounded to 2)
select cmp_ok(
  round((select monthly_burn from public.tracked_items_burn_v where currency = 'USD'), 2),
  '=', 40.32::numeric,
  'USD burn = weekly + monthly only'
);

-- EUR total: 10.00 + 10.00 = 20.00
select is(
  round((select monthly_burn from public.tracked_items_burn_v where currency = 'EUR'), 2),
  20.00::numeric,
  'EUR burn = quarterly/3 + yearly/12'
);

-- GBP total: 1.00 * 365.2425 / 10 = 36.52425
select cmp_ok(
  round((select monthly_burn from public.tracked_items_burn_v where currency = 'GBP'), 2),
  '=', 36.52::numeric,
  'GBP burn = custom_days formula'
);

-- Three currency rows total
select cmp_ok(
  (select count(*) from public.tracked_items_burn_v),
  '=', 3::bigint,
  'one row per currency, three total'
);

-- View grants: cannot write to views
reset role;
set local role authenticated;
select throws_ok(
  $$ insert into public.tracked_items_v (user_id, name, type) values ('00000000-0000-0000-0000-000000000001', 'X', 'subscription') $$,
  '42501', null,
  'cannot insert into tracked_items_v'
);

select throws_ok(
  $$ update public.tracked_items_v set name = 'x' $$,
  '42501', null,
  'cannot update tracked_items_v'
);

select throws_ok(
  $$ delete from public.tracked_item_events_v $$,
  '55000', null,
  'cannot delete from tracked_item_events_v'
);

select throws_ok(
  $$ update public.tracked_items_burn_v set monthly_burn = 0 $$,
  '55000', null,
  'cannot update tracked_items_burn_v'
);

reset role;
select * from finish();
rollback;
