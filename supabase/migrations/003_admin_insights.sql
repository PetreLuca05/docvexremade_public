-- The admin dashboard's Insights: retention by start week, each account's
-- first app launch and first AI request, and AI usage per account and model.
-- They read the desktop app's tables (app_installs, app_events, ai_usage, from
-- the app's own migrations) and answer admins only (public.is_admin(), from
-- 002). Days and weeks are counted in Bucharest time, as the app's views are.
-- Safe to run twice.

-- Installs grouped by the week they first appeared, and how many of each
-- group used the app again in each week after.
create or replace function public.admin_retention_weekly(p_weeks int default 8)
returns table (cohort date, size bigint, week int, active bigint)
language sql
stable
security definer
set search_path = public
as $$
  with installs as (
    select
      install_id,
      date_trunc('week', first_seen at time zone 'Europe/Bucharest')::date as cohort
    from app_installs
    where public.is_admin()
      and first_seen >= date_trunc('week', now() at time zone 'Europe/Bucharest')
        - make_interval(weeks => greatest(p_weeks, 1) - 1)
  ),
  sizes as (
    select cohort, count(*) as size from installs group by cohort
  ),
  activity as (
    select distinct
      e.install_id,
      date_trunc('week', e.occurred_at at time zone 'Europe/Bucharest')::date as wk
    from app_events e
    join installs i using (install_id)
  )
  select s.cohort, s.size, ((a.wk - s.cohort) / 7)::int as week, count(*) as active
  from installs i
  join sizes s using (cohort)
  join activity a on a.install_id = i.install_id and a.wk >= i.cohort
  group by s.cohort, s.size, a.wk
  order by 1, 3;
$$;

-- Each account's first app launch (signed in) and first AI request.
create or replace function public.admin_user_firsts()
returns table (user_id uuid, first_install timestamptz, first_ai timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select user_id, i.first_install, a.first_ai
  from (
    select user_id, min(first_seen) as first_install
    from app_installs
    where user_id is not null
    group by user_id
  ) i
  full join (
    select user_id, min(at) as first_ai from ai_usage group by user_id
  ) a using (user_id)
  where public.is_admin();
$$;

-- AI usage per account and model, between two Bucharest days (inclusive).
create or replace function public.admin_ai_usage_by_user(p_from date, p_to date)
returns table (user_id uuid, model text, requests bigint, input_tokens bigint, output_tokens bigint)
language sql
stable
security definer
set search_path = public
as $$
  select user_id, model, count(*), sum(input_tokens)::bigint, sum(output_tokens)::bigint
  from ai_usage
  where public.is_admin()
    and (at at time zone 'Europe/Bucharest')::date between p_from and p_to
  group by user_id, model;
$$;

revoke all on function public.admin_retention_weekly(int) from public, anon;
revoke all on function public.admin_user_firsts() from public, anon;
revoke all on function public.admin_ai_usage_by_user(date, date) from public, anon;
grant execute on function public.admin_retention_weekly(int) to authenticated;
grant execute on function public.admin_user_firsts() to authenticated;
grant execute on function public.admin_ai_usage_by_user(date, date) to authenticated;
