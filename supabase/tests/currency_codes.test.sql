begin;
select plan(5);

-- Table exists with expected shape
select has_table('public', 'currency_codes', 'currency_codes table exists');
select has_pk('public', 'currency_codes', 'currency_codes has primary key');
select col_type_is('public', 'currency_codes', 'code', 'text', 'code is text');

-- Seeded data
select cmp_ok(
  (select count(*) from public.currency_codes),
  '>=', 5::bigint,
  'at least 5 currency codes seeded'
);

-- Format constraint
select throws_ok(
  $$ insert into public.currency_codes (code) values ('usd') $$,
  '23514',
  null,
  'lowercase rejected by check constraint'
);

select * from finish();
rollback;
