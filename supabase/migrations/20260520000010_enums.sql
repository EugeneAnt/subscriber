-- supabase/migrations/20260520000010_enums.sql
create type public.tracked_item_type   as enum ('subscription', 'expiry', 'hybrid');
create type public.billing_cycle       as enum ('weekly', 'monthly', 'quarterly', 'yearly', 'custom_days');
create type public.tracked_item_status as enum ('active', 'paused', 'cancelled');
