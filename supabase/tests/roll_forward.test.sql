-- supabase/tests/roll_forward.test.sql
begin;
select plan(16);

-- 1. weekly, lands on today
select is(
  public.roll_forward_at(date '2026-01-01', 'weekly', null, date '2026-01-15'),
  date '2026-01-15',
  '#1 weekly anchor lands on today'
);

-- 2. weekly, next after today
select is(
  public.roll_forward_at(date '2026-01-01', 'weekly', null, date '2026-01-16'),
  date '2026-01-22',
  '#2 weekly steps past today'
);

-- 3. monthly Jan 31 -> Feb 28 (non-leap)
select is(
  public.roll_forward_at(date '2026-01-31', 'monthly', null, date '2026-02-05'),
  date '2026-02-28',
  '#3 EoM clamp non-leap'
);

-- 4. monthly Jan 31 -> Feb 29 (leap)
select is(
  public.roll_forward_at(date '2024-01-31', 'monthly', null, date '2024-02-05'),
  date '2024-02-29',
  '#4 EoM clamp leap year'
);

-- 5. monthly Jan 31 -> Mar 31 (no drift)
select is(
  public.roll_forward_at(date '2026-01-31', 'monthly', null, date '2026-03-05'),
  date '2026-03-31',
  '#5 day restored after clamp'
);

-- 6. monthly Jan 31 -> Apr 30
select is(
  public.roll_forward_at(date '2026-01-31', 'monthly', null, date '2026-04-05'),
  date '2026-04-30',
  '#6 EoM clamp in April'
);

-- 7. monthly mid-month, no clamping
select is(
  public.roll_forward_at(date '2026-01-15', 'monthly', null, date '2026-03-20'),
  date '2026-04-15',
  '#7 mid-month no clamp'
);

-- 8. quarterly EoM
select is(
  public.roll_forward_at(date '2026-01-31', 'quarterly', null, date '2026-05-01'),
  date '2026-07-31',
  '#8 quarterly EoM'
);

-- 9. yearly Feb 29 -> Feb 28 in non-leap
select is(
  public.roll_forward_at(date '2024-02-29', 'yearly', null, date '2025-03-01'),
  date '2026-02-28',
  '#9 yearly Feb 29 clipped to Feb 28 in 2026'
);

-- 9b. yearly Feb 29 -> Feb 29 on next leap
select is(
  public.roll_forward_at(date '2024-02-29', 'yearly', null, date '2028-01-01'),
  date '2028-02-29',
  '#9b yearly Feb 29 restored on next leap year'
);

-- 10. yearly Feb 29 to Feb 28 non-leap
select is(
  public.roll_forward_at(date '2024-02-29', 'yearly', null, date '2025-02-15'),
  date '2025-02-28',
  '#10 yearly Feb 29 clipped immediately'
);

-- 11. custom_days stepping by 10
select is(
  public.roll_forward_at(date '2026-01-01', 'custom_days', 10, date '2026-01-25'),
  date '2026-01-31',
  '#11 custom_days steps by 10'
);

-- 12. custom_days lands on today
select is(
  public.roll_forward_at(date '2026-01-01', 'custom_days', 10, date '2026-01-11'),
  date '2026-01-11',
  '#12 custom_days lands on today'
);

-- 13. anchor in the future
select is(
  public.roll_forward_at(date '2027-01-01', 'monthly', null, date '2026-05-20'),
  date '2027-01-01',
  '#13 anchor in future returned unchanged'
);

-- 14. null cycle
select is(
  public.roll_forward_at(date '2026-01-01', null::public.billing_cycle, null, date '2026-05-20'),
  null::date,
  '#14 null cycle returns null'
);

-- 15. custom_days with null days
select is(
  public.roll_forward_at(date '2026-01-01', 'custom_days', null, date '2026-05-20'),
  null::date,
  '#15 custom_days with null days returns null'
);

select * from finish();
rollback;
