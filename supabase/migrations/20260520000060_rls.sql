-- supabase/migrations/20260520000060_rls.sql

-- ===== tracked_items =====
-- Privilege revocation lives in 030_tracked_items.sql; this file only
-- enables RLS and defines the ownership policies.
alter table public.tracked_items enable row level security;

create policy "own_select" on public.tracked_items
  for select using (auth.uid() = user_id);
create policy "own_insert" on public.tracked_items
  for insert with check (auth.uid() = user_id);
create policy "own_update" on public.tracked_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_delete" on public.tracked_items
  for delete using (auth.uid() = user_id);

-- ===== currency_codes =====
alter table public.currency_codes enable row level security;

create policy "currency_codes_read" on public.currency_codes
  for select using (true);
-- no insert/update/delete policies — writes are blocked
