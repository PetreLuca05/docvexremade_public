-- Ask DocVex (website assistant): daily question allowances. A row per key
-- ("visitor:<salted hash of IP and day>" or "site:<day>"), its count and day.
-- Only the ask-docvex function (service role) touches it; rows older than a
-- day are removed as new ones are taken.
create table if not exists public.ask_usage (
  key text primary key,
  count integer not null default 0,
  day date not null default current_date
);

alter table public.ask_usage enable row level security;

-- Takes one from key's allowance of p_limit: the number left, or -1 when
-- none is left. Atomic, so parallel requests cannot go over.
create or replace function public.ask_take(p_key text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
begin
  delete from ask_usage where day < current_date - 1;
  insert into ask_usage as u (key, count, day)
  values (p_key, 1, current_date)
  on conflict (key) do update set count = u.count + 1
  where u.count < p_limit
  returning u.count into used;
  if used is null then
    return -1;
  end if;
  return p_limit - used;
end;
$$;

revoke all on function public.ask_take(text, integer) from public, anon, authenticated;
grant execute on function public.ask_take(text, integer) to service_role;

-- Gives one back to key, when the answer failed on our side.
create or replace function public.ask_give(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update ask_usage set count = greatest(count - 1, 0) where key = p_key;
$$;

revoke all on function public.ask_give(text) from public, anon, authenticated;
grant execute on function public.ask_give(text) to service_role;
