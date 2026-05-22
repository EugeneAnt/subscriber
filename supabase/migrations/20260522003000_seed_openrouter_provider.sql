-- Phase 3 continuation: OpenRouter cost sync support.

insert into public.provider_catalog (
  code,
  display_name,
  supports_cost_sync,
  supports_balance,
  supports_thresholds
) values (
  'openrouter',
  'OpenRouter',
  true,
  false,
  false
)
on conflict (code) do update
  set
    display_name = excluded.display_name,
    supports_cost_sync = excluded.supports_cost_sync,
    supports_balance = excluded.supports_balance,
    supports_thresholds = excluded.supports_thresholds;
