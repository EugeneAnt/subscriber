-- Resolve Supabase advisor 0003: evaluate auth.uid() once per statement
-- instead of once per row, and scope policies explicitly to authenticated.
drop policy if exists "own_select" on public.tracked_items;
drop policy if exists "own_insert" on public.tracked_items;
drop policy if exists "own_update" on public.tracked_items;
drop policy if exists "own_delete" on public.tracked_items;

create policy "own_select" on public.tracked_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own_insert" on public.tracked_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own_update" on public.tracked_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own_delete" on public.tracked_items
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Resolve Supabase advisor 0001 for the currency foreign key. User-scoped
-- indexes remain unchanged; unused-index INFOs on a fresh database are noise.
create index tracked_items_currency_idx on public.tracked_items (currency);
