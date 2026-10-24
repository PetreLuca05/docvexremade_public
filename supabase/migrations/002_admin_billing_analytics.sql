-- Admin analytics: who is an admin, the Stripe event log, the current state
-- of every subscription, and the views the dashboard (dev.html, through the
-- admin Edge Function) reads. Only admins can read any of it; only the
-- service role (the stripe-events function) writes.
--
-- The live database also has ai_usage and ai_sessions (from the app's
-- repository); this migration does not touch them.

-- ---- Admins --------------------------------------------------------------

-- True when the signed-in user's token says app_metadata.is_admin = true.
-- Set by hand in Supabase (see supabase/README.md); nothing in the site can
-- grant it, since app_metadata is writable only with the service role.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false)
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ---- Stripe event log ----------------------------------------------------

-- Every Stripe event the stripe-events function receives, once each.
create table if not exists public.billing_events (
  id bigint generated always as identity primary key,
  stripe_event_id text not null unique,
  type text not null,
  created_at timestamptz not null,
  received_at timestamptz default now(),
  customer_id text,
  subscription_id text,
  user_id uuid null references auth.users (id) on delete set null,
  -- 'solo' | 'firm' | null
  plan text,
  status text,
  amount integer,
  currency text,
  period_start timestamptz,
  period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  -- The Stripe event, plus `derived` (lifecycle, plan change, price id).
  payload jsonb not null
);

create index if not exists billing_events_type_created on public.billing_events (type, created_at);
create index if not exists billing_events_created on public.billing_events (created_at);
create index if not exists billing_events_customer on public.billing_events (customer_id);
create index if not exists billing_events_user on public.billing_events (user_id);

alter table public.billing_events enable row level security;

drop policy if exists "Admins read billing events" on public.billing_events;
create policy "Admins read billing events" on public.billing_events
  for select to authenticated using (public.is_admin());

-- ---- Subscriptions (current state) ---------------------------------------

-- One row per Stripe subscription, as it is now (upserted on every
-- customer.subscription.* event).
create table if not exists public.subscriptions (
  subscription_id text primary key,
  customer_id text not null,
  user_id uuid null references auth.users (id) on delete set null,
  plan text,
  status text not null,
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  cancel_at timestamptz,
  canceled_at timestamptz,
  ended_at timestamptz,
  -- Per billing period, in the currency's smallest unit (bani).
  amount integer,
  currency text,
  updated_at timestamptz default now()
);

create index if not exists subscriptions_user on public.subscriptions (user_id);
create index if not exists subscriptions_customer on public.subscriptions (customer_id);

alter table public.subscriptions enable row level security;

drop policy if exists "Admins read subscriptions" on public.subscriptions;
create policy "Admins read subscriptions" on public.subscriptions
  for select to authenticated using (public.is_admin());

-- No insert / update / delete policies: only the service role writes.
revoke insert, update, delete, truncate on public.billing_events, public.subscriptions
  from anon, authenticated;

-- ---- Views (security invoker: the tables' RLS applies) -------------------

-- Per plan: how many subscriptions are active, trialing, past due or set to
-- cancel at period end, and the monthly recurring revenue in bani (every
-- price is monthly today).
create or replace view public.subscriptions_summary
with (security_invoker = true) as
select
  coalesce(plan, 'unknown') as plan,
  count(*) filter (where status = 'active' and not coalesce(cancel_at_period_end, false)) as active,
  count(*) filter (where status = 'trialing') as trialing,
  count(*) filter (where status = 'past_due') as past_due,
  count(*) filter (
    where status in ('active', 'trialing', 'past_due') and coalesce(cancel_at_period_end, false)
  ) as cancel_pending,
  coalesce(sum(amount) filter (where status in ('active', 'trialing', 'past_due')), 0)::bigint as mrr
from public.subscriptions
group by coalesce(plan, 'unknown');

-- Events per day (Bucharest time) and type.
create or replace view public.billing_events_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Europe/Bucharest')::date as day,
  type,
  count(*) as count
from public.billing_events
group by 1, 2;

-- The lifecycle per day: what the stripe-events function derived from each
-- event (payload -> derived -> lifecycle) and the event types themselves.
create or replace view public.subscription_lifecycle_daily
with (security_invoker = true) as
select
  (created_at at time zone 'Europe/Bucharest')::date as day,
  count(*) filter (where type = 'customer.subscription.created') as created,
  count(*) filter (where payload -> 'derived' ->> 'lifecycle' = 'upgraded') as upgraded,
  count(*) filter (where payload -> 'derived' ->> 'lifecycle' = 'downgraded') as downgraded,
  count(*) filter (where payload -> 'derived' ->> 'lifecycle' = 'cancel_requested') as cancel_requested,
  count(*) filter (where type = 'customer.subscription.deleted') as canceled,
  count(*) filter (where payload -> 'derived' ->> 'lifecycle' = 'reactivated') as reactivated,
  count(*) filter (where type = 'invoice.payment_failed') as payment_failed
from public.billing_events
group by 1;

-- Sign-ups per day between two dates. auth.users is not readable through
-- RLS, so this runs as its owner, and checks the caller is an admin first.
create or replace function public.admin_signups_daily(p_from date, p_to date)
returns table (day date, signups bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select (u.created_at at time zone 'Europe/Bucharest')::date as day, count(*) as signups
    from auth.users u
    where (u.created_at at time zone 'Europe/Bucharest')::date between p_from and p_to
    group by 1
    order by 1;
end;
$$;

revoke all on function public.admin_signups_daily(date, date) from public, anon;
grant execute on function public.admin_signups_daily(date, date) to authenticated;
