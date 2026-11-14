-- Alerts off the top of the hour: docvex-alerts runs at minute 7, 17, … 57
-- instead of every 10 minutes from :00.
--
-- At :00 the app's cron jobs (monitor-cases, ops-heartbeat) start together
-- with this one, and this one probes every Edge Function at once. On
-- 2026-11-13 at 01:00 and 02:00 UTC the gateway gave up on cold functions
-- after 10 s (503/504) and the alerts reported them down; at :07 nothing
-- else starts (notify-email runs at :05 and :35, ops-heartbeat every 15 min).
--
-- Only the schedule changes: the job's command (005_alerts.sql) is kept.
-- Safe to run twice.

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'docvex-alerts'),
  schedule := '7,17,27,37,47,57 * * * *'
)
where exists (select 1 from cron.job where jobname = 'docvex-alerts');
