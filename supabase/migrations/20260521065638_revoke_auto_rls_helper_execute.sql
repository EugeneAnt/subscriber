-- Hosted Supabase's "automatic RLS" project setting creates this helper in the
-- exposed public schema as SECURITY DEFINER. It is meant for the database event
-- trigger, not for API callers via /rest/v1/rpc/rls_auto_enable.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
