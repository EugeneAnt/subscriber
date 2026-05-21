-- supabase/migrations/20260520000040_roll_forward.sql
-- search_path is set to '' to defend against search_path injection
-- (Supabase linter 0011). All public references inside the body are
-- already fully qualified (e.g., public.roll_forward_at, public.billing_cycle).
create or replace function public.roll_forward_at(
  anchor      date,
  cycle       public.billing_cycle,
  custom_days int,
  today       date
) returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  next_date         date;
  step              interval;
  anchor_day        int;
  months_step       int;
  tgt_year          int;
  tgt_month         int;
  last_day_in_tgt   int;
begin
  if anchor is null or cycle is null then
    return null;
  end if;
  if anchor >= today then
    return anchor;
  end if;

  if cycle in ('weekly', 'custom_days') then
    if cycle = 'custom_days' and custom_days is null then
      return null;
    end if;
    step := case cycle
      when 'weekly'      then interval '1 week'
      when 'custom_days' then make_interval(days => custom_days)
    end;
    next_date := anchor;
    while next_date < today loop
      next_date := (next_date + step)::date;
    end loop;
    return next_date;
  end if;

  months_step := case cycle
    when 'monthly'   then 1
    when 'quarterly' then 3
    when 'yearly'    then 12
  end;
  anchor_day := extract(day from anchor)::int;

  next_date := anchor;
  while next_date < today loop
    tgt_year  := extract(year  from next_date)::int;
    tgt_month := extract(month from next_date)::int + months_step;
    while tgt_month > 12 loop
      tgt_year  := tgt_year  + 1;
      tgt_month := tgt_month - 12;
    end loop;
    last_day_in_tgt := extract(day from
      (make_date(tgt_year, tgt_month, 1) + interval '1 month - 1 day')::date
    )::int;
    next_date := make_date(tgt_year, tgt_month, least(anchor_day, last_day_in_tgt));
  end loop;
  return next_date;
end;
$$;

create or replace function public.roll_forward(
  anchor      date,
  cycle       public.billing_cycle,
  custom_days int
) returns date
language sql
stable
set search_path = ''
as $$
  select public.roll_forward_at($1, $2, $3, current_date);
$$;
