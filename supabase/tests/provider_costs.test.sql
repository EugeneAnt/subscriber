-- supabase/tests/provider_costs.test.sql
begin;
select plan(21);

insert into auth.users (id, email)
  values
    ('00000000-0000-0000-0000-000000000301', 'provider-a@test.local'),
    ('00000000-0000-0000-0000-000000000302', 'provider-b@test.local')
  on conflict (id) do nothing;

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$ select code, display_name from public.provider_catalog where code = 'openai' $$,
  'authenticated users can read provider catalog'
);

select throws_ok(
  $$ insert into public.provider_catalog (code, display_name) values ('bad_provider', 'Bad Provider') $$,
  '42501',
  null,
  'authenticated users cannot write provider catalog'
);

insert into public.provider_connections (
  id,
  user_id,
  provider_code,
  display_name,
  credential_source,
  credential_name,
  currency,
  monthly_budget,
  warning_remaining_amount,
  critical_remaining_amount
) values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301',
  'openai',
  'OpenAI API',
  'server_env',
  'OPENAI_ADMIN_KEY',
  'USD',
  25,
  5,
  1
);

insert into public.provider_cost_snapshots (
  id,
  user_id,
  provider_connection_id,
  period_start,
  period_end_exclusive,
  total_amount,
  currency,
  raw_summary
) values (
  '31000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000001',
  current_date - 10,
  current_date + 1,
  21,
  'USD',
  '{"source":"test"}'::jsonb
);

insert into public.provider_cost_snapshot_lines (
  id,
  user_id,
  snapshot_id,
  external_project_id,
  line_item,
  amount,
  currency,
  raw_line
) values (
  '32000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000301',
  '31000000-0000-0000-0000-000000000001',
  'proj_test',
  'text',
  21,
  'USD',
  '{"line":"test"}'::jsonb
);

select is(
  (select remaining_budget from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  4::numeric,
  'view computes remaining budget'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  'warning',
  'view computes warning status'
);

insert into public.provider_cost_snapshots (
  id,
  user_id,
  provider_connection_id,
  period_start,
  period_end_exclusive,
  total_amount,
  currency,
  fetched_at
) values (
  '31000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000001',
  current_date - 10,
  current_date + 1,
  24.50,
  'USD',
  now() + interval '1 second'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  'critical',
  'view computes critical status'
);

insert into public.provider_cost_snapshots (
  id,
  user_id,
  provider_connection_id,
  period_start,
  period_end_exclusive,
  total_amount,
  currency,
  fetched_at
) values (
  '31000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000001',
  current_date - 10,
  current_date + 1,
  26,
  'USD',
  now() + interval '2 seconds'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  'over_budget',
  'view computes over budget status'
);

insert into public.provider_cost_snapshots (
  id,
  user_id,
  provider_connection_id,
  period_start,
  period_end_exclusive,
  total_amount,
  currency,
  fetched_at
) values (
  '31000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000001',
  current_date - 10,
  current_date + 1,
  10,
  'USD',
  now() + interval '3 seconds'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  'healthy',
  'view computes healthy status'
);

update public.provider_connections
  set last_sync_status = 'error', last_sync_error = 'redacted provider failure'
  where id = '30000000-0000-0000-0000-000000000001';

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  'sync_error',
  'view computes sync error status'
);

insert into public.provider_connections (
  id,
  user_id,
  provider_code,
  display_name,
  credential_source,
  credential_name,
  currency
) values (
  '30000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000301',
  'openai',
  'OpenAI API no budget',
  'server_env',
  'OPENAI_ADMIN_KEY',
  'USD'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000002'),
  'unknown',
  'view computes unknown when no snapshot exists'
);

insert into public.provider_cost_snapshots (
  id,
  user_id,
  provider_connection_id,
  period_start,
  period_end_exclusive,
  total_amount,
  currency
) values (
  '31000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000301',
  '30000000-0000-0000-0000-000000000002',
  current_date - 10,
  current_date + 1,
  8,
  'USD'
);

select is(
  (select budget_status from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000002'),
  'healthy',
  'view computes healthy for spend without a budget'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.provider_connections where id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'user B cannot select user A provider connection'
);

select is(
  (select count(*) from public.provider_cost_snapshots where id = '31000000-0000-0000-0000-000000000001'),
  0::bigint,
  'user B cannot select user A provider snapshot'
);

select is(
  (select count(*) from public.provider_cost_snapshot_lines where id = '32000000-0000-0000-0000-000000000001'),
  0::bigint,
  'user B cannot select user A provider snapshot line'
);

select is(
  (select count(*) from public.provider_connections_v where id = '30000000-0000-0000-0000-000000000001'),
  0::bigint,
  'view hides user A provider connection from user B'
);

select throws_ok(
  $$ insert into public.provider_connections (user_id, provider_code, display_name)
     values ('00000000-0000-0000-0000-000000000301', 'openai', 'Wrong user') $$,
  '42501',
  null,
  'user B cannot insert provider connection for user A'
);

set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';

select throws_ok(
  $$ select count(*) from public.provider_catalog $$,
  '42501',
  null,
  'anon cannot read provider catalog'
);

select throws_ok(
  $$ insert into public.provider_connections (user_id, provider_code, display_name)
     values ('00000000-0000-0000-0000-000000000302', 'openai', 'Anon write') $$,
  '42501',
  null,
  'anon cannot write provider connections'
);

select throws_ok(
  $$ insert into public.provider_cost_snapshots (
       user_id,
       provider_connection_id,
       period_start,
       period_end_exclusive,
       total_amount,
       currency
     ) values (
       '00000000-0000-0000-0000-000000000302',
       '30000000-0000-0000-0000-000000000001',
       current_date,
       current_date + 1,
       1,
       'USD'
     ) $$,
  '42501',
  null,
  'anon cannot write provider snapshots'
);

select throws_ok(
  $$ insert into public.provider_cost_snapshot_lines (
       user_id,
       snapshot_id,
       amount,
       currency
     ) values (
       '00000000-0000-0000-0000-000000000302',
       '31000000-0000-0000-0000-000000000001',
       1,
       'USD'
     ) $$,
  '42501',
  null,
  'anon cannot write provider snapshot lines'
);

select throws_ok(
  $$ update public.provider_connections_v set display_name = 'mutated' $$,
  '55000',
  null,
  'provider view is read-only to app roles'
);

set local "request.jwt.claims" = '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$ insert into public.provider_connections (
       user_id,
       provider_code,
       display_name,
       currency
     ) values (
       '00000000-0000-0000-0000-000000000301',
       'openai',
       'Bad currency',
       'JPY'
     ) $$,
  '23503',
  null,
  'unsupported currency fails FK'
);

select finish();
rollback;
