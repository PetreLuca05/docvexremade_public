-- Alerts: the log of what the `alerts` function has sent (so each alert goes
-- out once), and the schedule that runs it every 10 minutes.
--
-- The schedule reads two Vault secrets, created once by hand (SQL editor):
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/alerts', 'alerts_url');
--   select vault.create_secret('<the ALERTS_SECRET function secret>', 'alerts_secret');
-- Safe to run twice.

create table if not exists public.alerts_log (
  key text primary key,
  kind text not null,
  title text not null,
  body text,
  sent_at timestamptz not null default now()
);

create index if not exists alerts_log_sent on public.alerts_log (sent_at desc);

alter table public.alerts_log enable row level security;

drop policy if exists "Admins read alerts" on public.alerts_log;
create policy "Admins read alerts" on public.alerts_log
  for select to authenticated using (public.is_admin());

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('docvex-alerts')
where exists (select 1 from cron.job where jobname = 'docvex-alerts');

select cron.schedule(
  'docvex-alerts',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'alerts_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alerts-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'alerts_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
