// Alerts: checks every 10 minutes (pg_cron, migration 005) for things that
// need a person, and pushes each one to the admin's phone through ntfy
// (https://ntfy.sh), to the installed dashboard (Web Push, to every device in
// admin_push_subscriptions), and to Telegram when a bot is configured.
//
//   POST {}   with the header x-alerts-secret: <ALERTS_SECRET>
//
// What it watches:
//   errors    many app errors in the last hour (a bad release)
//   payment   a customer's payment failed
//   stripe    Stripe could not deliver events to the webhooks
//   law       a legal source the AI searches keeps failing
//   limits    many users hit their AI limit today
//   function  an Edge Function answers with a server error
//
// Each alert is sent once: alerts_log keeps its key (an event, or an hour or
// day of a condition), so a condition that lasts is not repeated every run.
//
// Secrets: ALERTS_SECRET, NTFY_TOPIC, VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY /
// VAPID_SUBJECT (dashboard push), optionally NTFY_SERVER (default
// https://ntfy.sh), TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, and the
// thresholds ALERT_ERRORS_PER_HOUR (10), ALERT_LIMIT_USERS (5);
// STRIPE_SECRET_KEY (already set). SUPABASE_URL and the project's secret key
// come with the function (../_shared/keys.ts).
//   supabase functions deploy alerts --no-verify-jwt

import { createClient } from 'npm:@supabase/supabase-js@2';
import { secretKey } from '../_shared/keys.ts';
import { pushToAdmins, vapidFromEnv } from '../_shared/push.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const db = createClient(URL_, secretKey(), {
  auth: { persistSession: false },
});
const DASHBOARD = 'https://docvex.ro/dev.html';
const ERRORS_PER_HOUR = Number(Deno.env.get('ALERT_ERRORS_PER_HOUR') ?? 10);
const LIMIT_USERS = Number(Deno.env.get('ALERT_LIMIT_USERS') ?? 5);
const FUNCTIONS = [
  'ask-docvex',
  'stripe-events',
  'admin',
  'ai',
  'billing',
  'stripe-webhook',
  'events',
  'account',
];

type Alert = {
  key: string;
  kind: string;
  title: string;
  body: string;
  priority?: 'default' | 'high' | 'urgent';
  section?: string;
};

const HOUR = 3_600_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
const bucharestDay = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());
const hourKey = () => new Date().toISOString().slice(0, 13);

// ---- checks -------------------------------------------------------------------

async function appErrors(): Promise<Alert[]> {
  const { count, error } = await db
    .from('app_events')
    .select('id', { count: 'exact', head: true })
    .like('event', 'error.%')
    .gte('occurred_at', ago(HOUR));
  if (error) throw error;
  if ((count ?? 0) < ERRORS_PER_HOUR) return [];
  return [
    {
      key: `errors:${hourKey()}`,
      kind: 'errors',
      title: `${count} app errors in the last hour`,
      body: 'More errors than usual. Check Reliability per release on the dashboard.',
      priority: 'high',
      section: 'insights',
    },
  ];
}

async function failedPayments(): Promise<Alert[]> {
  const { data, error } = await db
    .from('billing_events')
    .select('stripe_event_id, plan, amount, currency, user_id')
    .eq('type', 'invoice.payment_failed')
    .gte('created_at', ago(24 * HOUR));
  if (error) throw error;
  return (data ?? []).map((e) => ({
    key: `payment:${e.stripe_event_id}`,
    kind: 'payment',
    title: 'A payment failed',
    body: `${e.plan ? `Plan ${e.plan}, ` : ''}${
      e.amount ? `${(e.amount / 100).toFixed(2)} ${String(e.currency ?? '').toUpperCase()}` : ''
    }. Stripe will retry; the customer may need to update their card.`,
    section: 'subscriptions',
  }));
}

// Events Stripe could not deliver to an endpoint, older than its first
// retries (30 min).
async function stripeDelivery(): Promise<Alert[]> {
  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return [];
  const since = Math.floor((Date.now() - 6 * HOUR) / 1000);
  const res = await fetch(
    `https://api.stripe.com/v1/events?delivery_success=false&limit=20&created[gte]=${since}`,
    { headers: { Authorization: `Bearer ${key}` } },
  );
  if (!res.ok) throw new Error(`Stripe ${res.status}`);
  const { data } = (await res.json()) as { data: { id: string; created: number; type: string }[] };
  const stuck = data.filter((e) => e.created * 1000 < Date.now() - HOUR / 2);
  if (!stuck.length) return [];
  return [
    {
      key: `stripe:${hourKey()}`,
      kind: 'stripe',
      title: `Stripe could not deliver ${stuck.length} event${stuck.length > 1 ? 's' : ''}`,
      body: `Subscriptions may not be recorded. Latest: ${stuck[0].type}. Check the webhooks in Stripe and Stare on the dashboard.`,
      priority: 'high',
      section: 'health',
    },
  ];
}

const TOOL_NAMES: Record<string, string> = {
  search_legislation: 'Legislation',
  search_eu_law: 'EU law',
  search_court_cases: 'Court cases',
  lookup_company: 'Companies',
  search_lawyers: 'Lawyers',
};

async function legalSources(): Promise<Alert[]> {
  const { data, error } = await db
    .from('app_events')
    .select('props')
    .eq('event', 'law.tool')
    .gte('occurred_at', ago(HOUR));
  if (error) throw error;
  const tools = new Map<string, { calls: number; failed: number }>();
  for (const { props } of data ?? []) {
    const t = tools.get(props?.tool) ?? { calls: 0, failed: 0 };
    t.calls++;
    if (props?.ok === false) t.failed++;
    tools.set(props?.tool, t);
  }
  return [...tools.entries()]
    .filter(([, t]) => t.calls >= 5 && t.failed / t.calls >= 0.5)
    .map(([tool, t]) => ({
      key: `law:${tool}:${hourKey()}`,
      kind: 'law',
      title: `${TOOL_NAMES[tool] ?? tool} is failing`,
      body: `${t.failed} of ${t.calls} searches failed in the last hour. The AI cannot use this source.`,
      priority: 'high',
      section: 'insights',
    }));
}

async function aiLimits(): Promise<Alert[]> {
  const day = bucharestDay();
  const { data, error } = await db
    .from('ai_users_at_limit_daily')
    .select('users')
    .eq('day', day)
    .maybeSingle();
  if (error) throw error;
  const users = Number(data?.users ?? 0);
  if (users < LIMIT_USERS) return [];
  return [
    {
      key: `limits:${day}`,
      kind: 'limits',
      title: `${users} users hit their AI limit today`,
      body: 'Limits may be too tight for how people use the app, or someone may be overusing it.',
      section: 'app',
    },
  ];
}

/** One OPTIONS probe: null when the function answers, else what it answered. */
async function probe(name: string): Promise<string | null> {
  try {
    const res = await fetch(`${URL_}/functions/v1/${name}`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://docvex.ro' },
    });
    await res.body?.cancel();
    return res.status >= 500 ? String(res.status) : null;
  } catch {
    return 'no answer';
  }
}

const RETRY_MS = 5_000;

async function functionsDown(): Promise<Alert[]> {
  // A failure is probed again after RETRY_MS: at the top of the hour every
  // function is cold at once, and the gateway can give up (504 after 10 s)
  // before a worker starts. Only a second failure is an outage.
  const results = await Promise.all(
    FUNCTIONS.map(async (name) => {
      if ((await probe(name)) === null) return null;
      await new Promise((r) => setTimeout(r, RETRY_MS));
      const status = await probe(name);
      return status === null ? null : { name, status };
    }),
  );
  return results.filter(Boolean).map((r) => ({
    key: `function:${r!.name}:${hourKey()}`,
    kind: 'function',
    title: `The ${r!.name} function is down`,
    body: `It answered: ${r!.status}.`,
    priority: 'urgent',
    section: 'health',
  }));
}

// ---- sending ----------------------------------------------------------------

const TAGS: Record<string, string> = {
  errors: 'warning',
  payment: 'credit_card',
  stripe: 'rotating_light',
  law: 'scales',
  limits: 'chart_with_upwards_trend',
  function: 'rotating_light',
  test: 'white_check_mark',
};

type Sent = { delivered: string[]; failed: string[] };

/**
 * Sends one alert on every configured channel. Each channel's outcome is
 * caught as soon as it starts: a channel that fails while another is still
 * sending must not become an unhandled rejection, which kills the worker
 * (the runtime answers 503). Throws only when no channel delivered.
 */
async function send(alert: Alert): Promise<Sent> {
  type Outcome = { channel: string; error?: string; skipped?: boolean };
  const tasks: Promise<Outcome>[] = [];
  // A task resolves false when it had no one to send to (skipped, not failed)
  const run = (channel: string, task: () => Promise<boolean | void>) =>
    tasks.push(
      task().then(
        (done) => ({ channel, skipped: done === false }),
        (err) => ({ channel, error: err instanceof Error ? err.message : String(err) }),
      ),
    );

  const topic = Deno.env.get('NTFY_TOPIC');
  if (topic) {
    const server = Deno.env.get('NTFY_SERVER') ?? 'https://ntfy.sh';
    // Optional: an ntfy access token. Anonymous publishers are rate-limited by
    // IP address, which the Edge Functions share (HTTP 429); see supabase/README.md.
    const token = Deno.env.get('NTFY_TOKEN');
    run('ntfy', async () => {
      const r = await fetch(`${server}/${topic}`, {
        method: 'POST',
        body: alert.body,
        headers: {
          // HTTP headers carry ASCII only; ntfy decodes RFC 2047.
          Title: `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(alert.title)))}?=`,
          Priority: alert.priority ?? 'default',
          Tags: TAGS[alert.kind] ?? 'bell',
          Click: `${DASHBOARD}${alert.section ? `#${alert.section}` : ''}`,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      await r.body?.cancel();
      if (!r.ok) throw new Error(`ntfy ${r.status}`);
    });
  }
  const bot = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const chat = Deno.env.get('TELEGRAM_CHAT_ID');
  if (bot && chat) {
    run('telegram', async () => {
      const r = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: `${alert.title}\n${alert.body}\n${DASHBOARD}`,
          disable_web_page_preview: true,
        }),
      });
      await r.body?.cancel();
      if (!r.ok) throw new Error(`telegram ${r.status}`);
    });
  }
  const vapid = vapidFromEnv((name) => Deno.env.get(name));
  if (vapid) {
    run('push', async () => {
      const pushed = await pushToAdmins(
        db,
        {
          title: alert.title,
          body: alert.body,
          url: `${DASHBOARD}${alert.section ? `#${alert.section}` : ''}`,
          urgent: alert.priority === 'urgent' || alert.priority === 'high',
          tag: alert.kind,
        },
        vapid,
      );
      return pushed.devices > 0;
    });
  }

  const results = await Promise.all(tasks);
  const delivered = results.filter((r) => !r.error && !r.skipped).map((r) => r.channel);
  const failed = results.filter((r) => r.error).map((r) => r.error!);
  if (failed.length) console.error('send', alert.key, failed.join('; '));
  if (!delivered.length) {
    throw new Error(failed.join('; ') || 'No channel configured (NTFY_TOPIC, Telegram or a device)');
  }
  return { delivered, failed };
}

// ---- requests ---------------------------------------------------------------

// A safety net: a stray rejection is logged, not a crashed worker (a 503 for the caller).
addEventListener('unhandledrejection', (e) => {
  console.error('unhandled rejection', e.reason);
  e.preventDefault();
});

Deno.serve(async (req) => {
  const secret = Deno.env.get('ALERTS_SECRET');
  if (req.method !== 'POST' || !secret || req.headers.get('x-alerts-secret') !== secret) {
    return new Response('not found', { status: 404 });
  }
  const body = await req.json().catch(() => ({}));

  // A test from the dashboard: one message, not logged.
  if (body?.test === true) {
    try {
      const { delivered, failed } = await send({
        key: 'test',
        kind: 'test',
        title: 'DocVex alerts work',
        body: 'This is a test. Real alerts arrive the same way.',
      });
      return Response.json({ ok: true, delivered, failed });
    } catch (err) {
      return Response.json({ ok: false, error: String(err) }, { status: 502 });
    }
  }

  // One check failing (a table not there yet, Stripe down) skips only that one.
  const checks = {
    appErrors,
    failedPayments,
    stripeDelivery,
    legalSources,
    aiLimits,
    functionsDown,
  };
  const found: Alert[] = [];
  const failed: string[] = [];
  await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        found.push(...(await check()));
      } catch (err) {
        console.error(name, err);
        failed.push(name);
      }
    }),
  );

  // Only the ones not sent before.
  const keys = found.map((a) => a.key);
  const { data: already } = keys.length
    ? await db.from('alerts_log').select('key').in('key', keys)
    : { data: [] };
  const seen = new Set((already ?? []).map((r) => r.key));
  const fresh = found.filter((a) => !seen.has(a.key));

  let sent = 0;
  for (const alert of fresh) {
    try {
      await send(alert);
      await db.from('alerts_log').insert({
        key: alert.key,
        kind: alert.kind,
        title: alert.title,
        body: alert.body,
      });
      sent++;
    } catch (err) {
      console.error('send', alert.key, err);
    }
  }
  return Response.json({ checked: Object.keys(checks).length, found: found.length, sent, failed });
});
