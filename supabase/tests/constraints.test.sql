-- supabase/tests/constraints.test.sql
begin;
select plan(21);

-- Table shape sanity
select has_table('public', 'tracked_items', 'tracked_items exists');
select has_pk('public', 'tracked_items', 'has pk');
select col_not_null('public', 'tracked_items', 'user_id', 'user_id is not null');

-- We need a user to attach rows to. Use the test database's auth.users.
insert into auth.users (id, email)
  values ('00000000-0000-0000-0000-000000000001', 'a@test.local')
  on conflict (id) do nothing;

-- Helper to attempt an insert with a base of valid columns
create or replace function _ti_insert(overrides jsonb) returns void
language plpgsql as $$
declare
  defaults jsonb := jsonb_build_object(
    'user_id', '00000000-0000-0000-0000-000000000001',
    'name', 'Test',
    'type', 'subscription',
    'billing_cycle', 'monthly',
    'billing_anchor_date', '2026-01-01'
  );
  merged jsonb := defaults || overrides;
begin
  execute format(
    'insert into public.tracked_items (%s) select %s',
    (select string_agg(quote_ident(k), ', ') from jsonb_object_keys(merged) k),
    (select string_agg(format('(%L)::%s',
       merged->>k,
       case k
         when 'user_id' then 'uuid'
         when 'billing_anchor_date' then 'date'
         when 'expiry_date' then 'date'
         when 'amount' then 'numeric'
         when 'custom_cycle_days' then 'int'
         when 'type' then 'tracked_item_type'
         when 'billing_cycle' then 'billing_cycle'
         when 'status' then 'tracked_item_status'
         else 'text' end
     ), ', ')
     from jsonb_object_keys(merged) k)
  );
end;
$$;

-- type='subscription' without billing_cycle should fail
select throws_ok(
  $$ select _ti_insert('{"billing_cycle": null, "billing_anchor_date": null}'::jsonb) $$,
  '23514', null,
  'subscription without billing_cycle rejected'
);

-- type='expiry' without expiry_date should fail
select throws_ok(
  $$ select _ti_insert('{"type": "expiry", "billing_cycle": null, "billing_anchor_date": null}'::jsonb) $$,
  '23514', null,
  'expiry without expiry_date rejected'
);

-- type='hybrid' without expiry_date should fail
select throws_ok(
  $$ select _ti_insert('{"type": "hybrid"}'::jsonb) $$,
  '23514', null,
  'hybrid without expiry_date rejected'
);

-- billing_cycle=custom_days without custom_cycle_days
select throws_ok(
  $$ select _ti_insert('{"billing_cycle": "custom_days"}'::jsonb) $$,
  '23514', null,
  'custom_days without custom_cycle_days rejected'
);

-- amount set, currency null
select throws_ok(
  $$ select _ti_insert('{"amount": "9.99"}'::jsonb) $$,
  '23514', null,
  'amount without currency rejected'
);

-- currency set, amount null
select throws_ok(
  $$ select _ti_insert('{"currency": "USD"}'::jsonb) $$,
  '23514', null,
  'currency without amount rejected'
);

-- amount negative
select throws_ok(
  $$ select _ti_insert('{"amount": "-1", "currency": "USD"}'::jsonb) $$,
  '23514', null,
  'negative amount rejected'
);

-- amount over cap
select throws_ok(
  $$ select _ti_insert('{"amount": "10000000000", "currency": "USD"}'::jsonb) $$,
  '23514', null,
  'amount over 9,999,999,999.99 rejected'
);

-- empty name (whitespace)
select throws_ok(
  $$ select _ti_insert('{"name": "   "}'::jsonb) $$,
  '23514', null,
  'whitespace-only name rejected'
);

-- name too long (>200)
select throws_ok(
  $$ select _ti_insert(jsonb_build_object('name', repeat('a', 201))) $$,
  '23514', null,
  'name over 200 chars rejected'
);

-- notes too long
select throws_ok(
  $$ select _ti_insert(jsonb_build_object('notes', repeat('a', 5001))) $$,
  '23514', null,
  'notes over 5000 chars rejected'
);

-- custom_cycle_days = 0
select throws_ok(
  $$ select _ti_insert('{"billing_cycle": "custom_days", "custom_cycle_days": "0"}'::jsonb) $$,
  '23514', null,
  'custom_cycle_days = 0 rejected'
);

-- custom_cycle_days = 3651
select throws_ok(
  $$ select _ti_insert('{"billing_cycle": "custom_days", "custom_cycle_days": "3651"}'::jsonb) $$,
  '23514', null,
  'custom_cycle_days > 3650 rejected'
);

-- expiry_date before 1900
select throws_ok(
  $$ select _ti_insert('{"type": "expiry", "billing_cycle": null, "billing_anchor_date": null, "expiry_date": "1899-12-31"}'::jsonb) $$,
  '23514', null,
  'expiry_date before 1900 rejected'
);

-- currency not in currency_codes
select throws_ok(
  $$ select _ti_insert('{"amount": "9.99", "currency": "XYZ"}'::jsonb) $$,
  '23503', null,
  'unknown currency rejected by FK'
);

-- Happy path: a valid subscription succeeds
select lives_ok(
  $$ select _ti_insert('{"amount": "9.99", "currency": "USD"}'::jsonb) $$,
  'valid subscription with amount and currency accepted'
);

-- Happy path: pure expiry
select lives_ok(
  $$ select _ti_insert('{"type": "expiry", "billing_cycle": null, "billing_anchor_date": null, "expiry_date": "2027-01-01"}'::jsonb) $$,
  'valid expiry-only item accepted'
);

-- Happy path: hybrid
select lives_ok(
  $$ select _ti_insert('{"type": "hybrid", "expiry_date": "2027-01-01"}'::jsonb) $$,
  'valid hybrid item accepted'
);

drop function _ti_insert(jsonb);

select * from finish();
rollback;
