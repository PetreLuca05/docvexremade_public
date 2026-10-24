-- The admin dashboard's reliability views, from the desktop app's events
-- (app_events, from the app's own migrations): how each release behaves, and
-- how the legal sources the AI searches respond. Admins only
-- (public.is_admin(), from 002); days in Bucharest time. Safe to run twice.

-- Per app version, between two Bucharest days: sessions, sessions with an
-- error, the installs that ran it, and when it was first seen.
create or replace function public.admin_release_health(p_from date, p_to date)
returns table (
  app_version text,
  sessions bigint,
  error_sessions bigint,
  crash_sessions bigint,
  installs bigint,
  first_seen timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select app_version, session_id, install_id, event, occurred_at
    from app_events
    where public.is_admin()
      and (occurred_at at time zone 'Europe/Bucharest')::date between p_from and p_to
  ),
  per_session as (
    select
      app_version,
      session_id,
      bool_or(event like 'error.%') as had_error,
      bool_or(event = 'error.render_gone') as crashed
    from e
    group by app_version, session_id
  ),
  firsts as (
    select app_version, min(occurred_at) as first_seen
    from app_events
    where public.is_admin()
    group by app_version
  )
  select
    s.app_version,
    count(*) as sessions,
    count(*) filter (where s.had_error) as error_sessions,
    count(*) filter (where s.crashed) as crash_sessions,
    (select count(distinct install_id) from e where e.app_version = s.app_version) as installs,
    f.first_seen
  from per_session s
  left join firsts f using (app_version)
  group by s.app_version, f.first_seen
  order by f.first_seen desc nulls last;
$$;

-- The AI's searches of the legal sources (law.tool events) per day and tool:
-- calls, failures, and calls slower than 30 s.
create or replace function public.admin_law_tools_daily(p_from date, p_to date)
returns table (day date, tool text, calls bigint, failures bigint, slow bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (occurred_at at time zone 'Europe/Bucharest')::date as day,
    props ->> 'tool' as tool,
    count(*) as calls,
    count(*) filter (where (props ->> 'ok')::boolean is false) as failures,
    count(*) filter (where props ->> 'ms_bucket' in ('30s-2m', '>2m')) as slow
  from app_events
  where public.is_admin()
    and event = 'law.tool'
    and (occurred_at at time zone 'Europe/Bucharest')::date between p_from and p_to
  group by 1, 2
  order by 1, 2;
$$;

-- Failed AI requests by kind (law.error), between two Bucharest days.
create or replace function public.admin_law_errors(p_from date, p_to date)
returns table (kind text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select props ->> 'kind', count(*)
  from app_events
  where public.is_admin()
    and event = 'law.error'
    and (occurred_at at time zone 'Europe/Bucharest')::date between p_from and p_to
  group by 1
  order by 2 desc;
$$;

revoke all on function public.admin_release_health(date, date) from public, anon;
revoke all on function public.admin_law_tools_daily(date, date) from public, anon;
revoke all on function public.admin_law_errors(date, date) from public, anon;
grant execute on function public.admin_release_health(date, date) to authenticated;
grant execute on function public.admin_law_tools_daily(date, date) to authenticated;
grant execute on function public.admin_law_errors(date, date) to authenticated;
