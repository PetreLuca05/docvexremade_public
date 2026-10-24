-- Web Push for the admin dashboard (dev.html, installed as an app): one row
-- per device an admin enabled notifications on. Written by the `admin`
-- function's push.* actions with the admin's own token, and read by the
-- functions that send pushes (`alerts`, later the app's `report-dossier`)
-- with the service role. Safe to run twice.

create table if not exists public.admin_push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  failures int not null default 0
);

create index if not exists admin_push_subscriptions_user on public.admin_push_subscriptions (user_id);

alter table public.admin_push_subscriptions enable row level security;

-- An admin manages only their own devices.
drop policy if exists "Admins manage their devices" on public.admin_push_subscriptions;
create policy "Admins manage their devices" on public.admin_push_subscriptions
  for all to authenticated
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);
