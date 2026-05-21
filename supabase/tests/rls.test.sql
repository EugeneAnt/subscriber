-- supabase/tests/rls.test.sql
begin;
select plan(15);

-- Two synthetic users
insert into auth.users (id, email)
  values
    ('00000000-0000-0000-0000-000000000001', 'a@test.local'),
    ('00000000-0000-0000-0000-000000000002', 'b@test.local')
  on conflict (id) do nothing;

-- As user A, insert a row
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date)
  values ('00000000-0000-0000-0000-000000000001', 'A item', 'subscription', 'monthly', '2026-01-01');

select cmp_ok((select count(*) from public.tracked_items), '=', 1::bigint, 'A sees own row');

-- As user B
set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select cmp_ok((select count(*) from public.tracked_items), '=', 0::bigint, 'B does not see A row');

-- B insert with A's user_id raises (RLS WITH CHECK violation)
select throws_ok(
  $$ insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date)
     values ('00000000-0000-0000-0000-000000000001', 'B impersonates A', 'subscription', 'monthly', '2026-01-01') $$,
  '42501', null,
  'cross-user insert raises RLS violation'
);

-- B update/delete on A's row touches 0 rows (silent filter)
with res as (
  update public.tracked_items set name = 'hacked'
  where user_id = '00000000-0000-0000-0000-000000000001' returning 1
)
select cmp_ok((select count(*) from res), '=', 0::bigint, 'B update on A row is no-op');

with res as (
  delete from public.tracked_items
  where user_id = '00000000-0000-0000-0000-000000000001' returning 1
)
select cmp_ok((select count(*) from res), '=', 0::bigint, 'B delete on A row is no-op');

-- View selects respect RLS via security_invoker
select cmp_ok((select count(*) from public.tracked_items_v),       '=', 0::bigint, 'B sees no rows in tracked_items_v');
select cmp_ok((select count(*) from public.tracked_item_events_v), '=', 0::bigint, 'B sees no rows in tracked_item_events_v');
select cmp_ok((select count(*) from public.tracked_items_burn_v),  '=', 0::bigint, 'B sees no rows in tracked_items_burn_v');

-- anon: every operation raises (server-only app — anon has no privileges
-- on any object in public; see 030_tracked_items.sql, 020_currency_codes.sql,
-- and 050_views.sql for the explicit REVOKE blocks).
set local "request.jwt.claims" = '{"role":"anon"}';
set local role anon;

select throws_ok(
  $$ select count(*) from public.tracked_items $$,
  '42501', null,
  'anon select on tracked_items raises'
);

select throws_ok(
  $$ insert into public.tracked_items (user_id, name, type, billing_cycle, billing_anchor_date)
     values ('00000000-0000-0000-0000-000000000001', 'anon', 'subscription', 'monthly', '2026-01-01') $$,
  '42501', null,
  'anon insert on tracked_items raises'
);

select throws_ok(
  $$ update public.tracked_items set name = 'x' $$,
  '42501', null,
  'anon update on tracked_items raises'
);

select throws_ok(
  $$ delete from public.tracked_items $$,
  '42501', null,
  'anon delete on tracked_items raises'
);

-- currency_codes: anon also has no SELECT.
select throws_ok(
  $$ select count(*) from public.currency_codes $$,
  '42501', null,
  'anon cannot read currency_codes'
);

-- authenticated can read currency_codes but cannot write.
reset role;
set local role authenticated;
select cmp_ok(
  (select count(*) from public.currency_codes),
  '>', 0::bigint,
  'authenticated can read currency_codes'
);
select throws_ok(
  $$ insert into public.currency_codes (code) values ('XYZ') $$,
  '42501', null,
  'authenticated cannot insert into currency_codes'
);

reset role;
select * from finish();
rollback;
