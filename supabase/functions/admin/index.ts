// The admin dashboard's data (dev.html): one function, a few actions.
//
//   POST { action, range: { from, to }, compare? }   with the admin's token
//     live       visitors now, subscriptions, MRR, sign-ups and downloads today
//     traffic    Plausible: aggregates, timeseries, breakdowns, goals
//     billing    subscriptions and Stripe events (public.subscriptions, ...)
//     accounts   sign-ups, providers, newsletter, plan choices, recency
//     downloads  GitHub Releases download counts
//     app        the desktop app's telemetry (the app's app_* and ai_* views)
//     insights   the path to paying, retention by start week, AI cost per plan,
//                subscription health, release reliability, the legal sources
//     testAlert  sends a test push through the `alerts` function
//     push.subscribe   { subscription, device_label }  this device gets pushes
//     push.unsubscribe { endpoint }
//     push.list        the caller's devices
//     push.test        a test push to the caller's devices (from here)
//     ask        answers a question about the metrics (Claude), from a fresh
//                snapshot of the other actions; { question, history?, lang? }
//     health     the functions, Stripe's mode, the last webhook event
//
// Only accounts with app_metadata.is_admin = true get an answer; anyone else
// gets 404, so the endpoint does not advertise itself. Tables are read with
// the admin's own token (their RLS and is_admin() apply); user listings use
// the service role.
//
// Secrets: PLAUSIBLE_API_KEY, PLAUSIBLE_SITE_ID, optionally PLAUSIBLE_HOST
// (default https://plausible.io); GITHUB_TOKEN (optional, for the rate
// limit); STRIPE_SECRET_KEY (read only for its mode). SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY come with the function.
//   supabase functions deploy admin --no-verify-jwt

import Anthropic from 'npm:@anthropic-ai/sdk';
import { pushToAdmins, vapidFromEnv } from '../_shared/push.ts';
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

const ORIGINS = ['https://docvex.ro', 'https://www.docvex.ro', 'http://localhost:5173'];
const REPO = 'PetreLuca05/docvexremade_public';
const CACHE_MS = 5 * 60 * 1000;
const LIVE_CACHE_MS = 30 * 1000;

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

function cors(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin && ORIGINS.includes(origin) ? origin : ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json' },
  });
}

// ---- cache ----------------------------------------------------------------

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ms: number, make: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const value = await make();
  cache.set(key, { at: Date.now(), value });
  return value;
}

// ---- dates ----------------------------------------------------------------

type Range = { from: string; to: string };
const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
const todayIso = () => isoDay(new Date());
// The app's views count days in Bucharest time.
const bucharestDay = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date());

function cleanRange(input: unknown): Range {
  const r = (input ?? {}) as Partial<Range>;
  const ok = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const to = ok(r.to) ? r.to! : todayIso();
  const from = ok(r.from) ? r.from! : isoDay(new Date(Date.parse(to) - 29 * DAY));
  return from <= to ? { from, to } : { from: to, to: from };
}

// The same number of days just before the range.
function previousRange({ from, to }: Range): Range {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY) + 1;
  return {
    from: isoDay(new Date(Date.parse(from) - days * DAY)),
    to: isoDay(new Date(Date.parse(from) - DAY)),
  };
}

const rangeDays = (r: Range) => Math.round((Date.parse(r.to) - Date.parse(r.from)) / DAY) + 1;

// ---- users ----------------------------------------------------------------

// Every account, a page at a time.
async function allUsers(): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}

// ---- traffic (Plausible) ----------------------------------------------------

const PLAUSIBLE_HOST = (Deno.env.get('PLAUSIBLE_HOST') || 'https://plausible.io').replace(
  /\/$/,
  '',
);
const PLAUSIBLE_KEY = Deno.env.get('PLAUSIBLE_API_KEY');
const PLAUSIBLE_SITE = Deno.env.get('PLAUSIBLE_SITE_ID');

const METRICS = [
  'visitors',
  'visits',
  'pageviews',
  'views_per_visit',
  'visit_duration',
  'bounce_rate',
];

async function plausible(body: Record<string, unknown>) {
  const res = await fetch(`${PLAUSIBLE_HOST}/api/v2/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PLAUSIBLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: PLAUSIBLE_SITE, ...body }),
  });
  if (!res.ok) throw new Error(`Plausible ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as { results: { metrics: number[]; dimensions: string[] }[] };
}

async function realtime(): Promise<number | null> {
  const res = await fetch(
    `${PLAUSIBLE_HOST}/api/v1/stats/realtime/visitors?site_id=${encodeURIComponent(PLAUSIBLE_SITE!)}`,
    { headers: { Authorization: `Bearer ${PLAUSIBLE_KEY}` } },
  );
  return res.ok ? Number(await res.json()) : null;
}

// Aggregates as { visitors: n, ... }.
async function aggregate(range: Range) {
  const { results } = await plausible({ metrics: METRICS, date_range: [range.from, range.to] });
  const values = results[0]?.metrics ?? [];
  return Object.fromEntries(METRICS.map((m, i) => [m, values[i] ?? 0]));
}

// Hours for one day, days up to 90, months beyond.
const bucketOf = (r: Range) =>
  rangeDays(r) <= 1 ? 'time:hour' : rangeDays(r) <= 90 ? 'time:day' : 'time:month';

async function timeseries(range: Range) {
  const { results } = await plausible({
    metrics: ['visitors', 'pageviews'],
    date_range: [range.from, range.to],
    dimensions: [bucketOf(range)],
    order_by: [[bucketOf(range), 'asc']],
  });
  return results.map((r) => ({
    t: r.dimensions[0],
    visitors: r.metrics[0],
    pageviews: r.metrics[1],
  }));
}

// Plausible's dimensions for each breakdown. Screen size is visit:device in
// Plausible (Desktop, Laptop, Tablet, Mobile), so device covers both.
const BREAKDOWNS: Record<string, string> = {
  channel: 'visit:channel',
  source: 'visit:source',
  referrer: 'visit:referrer',
  utm_source: 'visit:utm_source',
  utm_medium: 'visit:utm_medium',
  utm_campaign: 'visit:utm_campaign',
  page: 'event:page',
  entry_page: 'visit:entry_page',
  exit_page: 'visit:exit_page',
  country: 'visit:country',
  city: 'visit:city_name',
  device: 'visit:device',
  browser: 'visit:browser',
  os: 'visit:os',
};

async function breakdown(range: Range, dimension: string, limit = 25) {
  const { results } = await plausible({
    metrics: ['visitors'],
    date_range: [range.from, range.to],
    dimensions: [dimension],
    order_by: [['visitors', 'desc']],
    pagination: { limit },
  });
  return results.map((r) => ({ name: r.dimensions[0], visitors: r.metrics[0] }));
}

// Visitors in Romania by county: its ISO code ("RO-CJ") and Plausible's name.
async function romania(range: Range) {
  const { results } = await plausible({
    metrics: ['visitors'],
    date_range: [range.from, range.to],
    dimensions: ['visit:region', 'visit:region_name'],
    filters: [['is', 'visit:country', ['RO']]],
    order_by: [['visitors', 'desc']],
    pagination: { limit: 60 },
  });
  return results.map((r) => ({
    code: r.dimensions[0],
    name: r.dimensions[1],
    visitors: r.metrics[0],
  }));
}

async function goals(range: Range) {
  const { results } = await plausible({
    metrics: ['visitors', 'events'],
    date_range: [range.from, range.to],
    dimensions: ['event:goal'],
    order_by: [['events', 'desc']],
  });
  return results.map((r) => ({
    name: r.dimensions[0],
    visitors: r.metrics[0],
    events: r.metrics[1],
  }));
}

async function notFoundPaths(range: Range) {
  const { results } = await plausible({
    metrics: ['events'],
    date_range: [range.from, range.to],
    dimensions: ['event:props:path'],
    filters: [['is', 'event:goal', ['404']]],
    order_by: [['events', 'desc']],
    pagination: { limit: 25 },
  });
  return results.map((r) => ({ name: r.dimensions[0], events: r.metrics[0] }));
}

// A breakdown that fails (an unknown dimension on an older Plausible, say)
// comes back empty instead of failing the whole action.
const soft = <T>(p: Promise<T[]>) => p.catch((e) => (console.error(String(e)), [] as T[]));

async function traffic(range: Range, compare: boolean) {
  if (!PLAUSIBLE_KEY || !PLAUSIBLE_SITE) return { configured: false };
  const previous = previousRange(range);
  const entries = await Promise.all(
    Object.entries(BREAKDOWNS).map(async ([key, dim]) => [key, await soft(breakdown(range, dim))]),
  );
  const [totals, series, goalList, notFound, now, prevTotals, prevSeries] = await Promise.all([
    aggregate(range),
    timeseries(range),
    soft(goals(range)),
    soft(notFoundPaths(range)),
    realtime().catch(() => null),
    compare ? aggregate(previous) : Promise.resolve(null),
    compare ? timeseries(previous) : Promise.resolve(null),
  ]);
  return {
    configured: true,
    range,
    previous: compare ? previous : null,
    bucket: bucketOf(range).slice(5),
    realtime: now,
    totals,
    previousTotals: prevTotals,
    timeseries: series,
    previousTimeseries: prevSeries,
    breakdowns: { ...Object.fromEntries(entries), romania: await soft(romania(range)) },
    goals: goalList,
    notFound,
  };
}

// ---- billing ----------------------------------------------------------------

async function billing(db: SupabaseClient, range: Range) {
  const [summary, lifecycle, daily, events, subs] = await Promise.all([
    db.from('subscriptions_summary').select('*'),
    db
      .from('subscription_lifecycle_daily')
      .select('*')
      .gte('day', range.from)
      .lte('day', range.to)
      .order('day'),
    db
      .from('billing_events_daily')
      .select('*')
      .gte('day', range.from)
      .lte('day', range.to)
      .order('day'),
    db
      .from('billing_events')
      .select(
        'id, stripe_event_id, type, created_at, received_at, customer_id, subscription_id, user_id, plan, status, amount, currency, period_start, period_end, cancel_at, canceled_at, derived:payload->derived',
      )
      .order('created_at', { ascending: false })
      .limit(200),
    db.from('subscriptions').select('*').order('updated_at', { ascending: false }),
  ]);
  for (const r of [summary, lifecycle, daily, events, subs]) if (r.error) throw r.error;
  const users = await allUsers();
  const emailOf = new Map(users.map((u) => [u.id, u.email ?? null]));
  return {
    summary: summary.data,
    lifecycle: lifecycle.data,
    eventsDaily: daily.data,
    events: (events.data ?? []).map((e) => ({
      ...e,
      email: e.user_id ? (emailOf.get(e.user_id) ?? null) : null,
    })),
    subscriptions: (subs.data ?? []).map((s) => ({
      ...s,
      email: s.user_id ? (emailOf.get(s.user_id) ?? null) : null,
    })),
  };
}

// ---- accounts -------------------------------------------------------------

// The site's plan choice (user_metadata.plan) in the subscriptions' names.
const CHOSEN: Record<string, string | null> = { start: null, pro: 'solo', cabinet: 'firm' };
const PAYING = new Set(['active', 'trialing', 'past_due']);

async function accounts(db: SupabaseClient, range: Range) {
  const [signups, subs, users] = await Promise.all([
    db.rpc('admin_signups_daily', { p_from: range.from, p_to: range.to }),
    db.from('subscriptions').select('user_id, plan, status'),
    allUsers(),
  ]);
  if (signups.error) throw signups.error;
  if (subs.error) throw subs.error;
  const paidPlan = new Map<string, string>();
  for (const s of subs.data ?? [])
    if (s.user_id && PAYING.has(s.status) && s.plan) paidPlan.set(s.user_id, s.plan);

  const count = (map: Record<string, number>, key: string) => (map[key] = (map[key] ?? 0) + 1);
  const providers: Record<string, number> = {};
  const plans: Record<string, number> = {};
  const versions: Record<string, number> = {};
  const recency: Record<string, number> = { '24h': 0, '7d': 0, '30d': 0, older: 0, never: 0 };
  let newsletter = 0;
  let mismatch = 0;
  const now = Date.now();
  for (const u of users) {
    const list =
      (u.app_metadata?.providers as string[] | undefined) ??
      [u.app_metadata?.provider].filter(Boolean);
    const google = list.includes('google');
    const email = list.includes('email') || u.user_metadata?.has_password === true;
    count(providers, google && email ? 'both' : google ? 'google' : email ? 'email' : 'other');
    if (u.user_metadata?.newsletter === true) newsletter++;
    const chosen = typeof u.user_metadata?.plan === 'string' ? u.user_metadata.plan : 'none';
    count(plans, chosen);
    count(versions, u.user_metadata?.downloaded_version ?? 'none');
    const expected = CHOSEN[chosen] ?? null;
    if ((expected ?? null) !== (paidPlan.get(u.id) ?? null)) mismatch++;
    const last = u.last_sign_in_at ? now - Date.parse(u.last_sign_in_at) : null;
    recency[
      last === null
        ? 'never'
        : last < DAY
          ? '24h'
          : last < 7 * DAY
            ? '7d'
            : last < 30 * DAY
              ? '30d'
              : 'older'
    ]++;
  }
  return {
    total: users.length,
    signupsDaily: signups.data,
    providers,
    newsletter,
    plans,
    planMismatch: mismatch,
    versions,
    recency,
  };
}

// ---- downloads (GitHub) -----------------------------------------------------

type Asset = { name: string; download_count: number; size: number };
type Release = {
  tag_name: string;
  name: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: Asset[];
};

function platformOf(name: string) {
  if (/\.exe$/i.test(name)) return 'windows';
  if (/\.dmg$/i.test(name)) return 'mac';
  return null;
}

async function downloads() {
  const token = Deno.env.get('GITHUB_TOKEN');
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=100`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'docvex-admin',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status}`);
  const list = ((await res.json()) as Release[]).filter((r) => !r.draft);
  const totals: Record<string, number> = { windows: 0, mac: 0 };
  const releases = list.map((r) => {
    const byPlatform: Record<string, number> = { windows: 0, mac: 0 };
    const assets = r.assets
      .filter((a) => platformOf(a.name))
      .map((a) => {
        const platform = platformOf(a.name)!;
        byPlatform[platform] += a.download_count;
        totals[platform] += a.download_count;
        return { name: a.name, platform, downloads: a.download_count };
      });
    return {
      version: r.tag_name.replace(/^v/, ''),
      date: r.published_at,
      prerelease: r.prerelease,
      byPlatform,
      assets,
    };
  });
  return { releases, totals, total: totals.windows + totals.mac };
}

// ---- app (the desktop app's telemetry) -------------------------------------
//
// The views come from the app's repository (its app_telemetry migration).
// They are security_invoker, and read here with the admin's token. Emails
// never enter them: they are joined in from the Admin API.

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

async function rows(query: PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function sumBy(list: Row[], key: string, fields: string[]) {
  const out = new Map<string, Row>();
  for (const r of list) {
    const k = String(r[key] ?? '');
    const acc = out.get(k) ?? { name: k, ...Object.fromEntries(fields.map((f) => [f, 0])) };
    for (const f of fields) acc[f] = num(acc[f]) + num(r[f]);
    out.set(k, acc);
  }
  return [...out.values()].sort((a, b) => num(b[fields[0]]) - num(a[fields[0]]));
}

async function app(db: SupabaseClient, range: Range) {
  // deno-lint-ignore no-explicit-any
  const inRange = (q: any) => q.gte('day', range.from).lte('day', range.to);
  const [active, features, events, aiDaily, limits, versions, funnel, errors, overview, users] =
    await Promise.all([
      rows(inRange(db.from('app_active_users_daily').select('*')).order('day')),
      rows(inRange(db.from('app_feature_usage_daily').select('*'))),
      rows(inRange(db.from('app_events_daily').select('*'))),
      rows(inRange(db.from('ai_usage_daily').select('*')).order('day')),
      rows(inRange(db.from('ai_users_at_limit_daily').select('*'))),
      rows(db.from('app_versions_current').select('*')),
      rows(inRange(db.from('app_update_funnel_daily').select('*'))),
      rows(db.from('app_errors_recent').select('*')),
      rows(
        db
          .from('app_users_overview')
          .select('*')
          .order('last_seen', { ascending: false })
          .limit(50),
      ),
      allUsers(),
    ]);

  const email = new Map(users.map((u) => [u.id, u.email ?? null]));
  const plan = new Map(users.map((u) => [u.id, (u.app_metadata?.plan as string) ?? 'trial']));
  const last = active.at(-1) ?? null;

  // Errors grouped by signature: the same class, message and frame.
  const signatures = new Map<string, Row>();
  for (const e of errors) {
    const k = `${e.event}|${e.name}|${e.message_hash}|${e.stack_top}|${e.reason}`;
    const g = signatures.get(k) ?? {
      event: e.event,
      name: e.name ?? e.reason ?? null,
      stack_top: e.stack_top ?? null,
      window: e.window ?? null,
      count: 0,
      users: new Set<string>(),
      versions: new Set<string>(),
      last: e.occurred_at,
    };
    g.count = num(g.count) + 1;
    (g.users as Set<string>).add(String(e.user_id ?? e.install_id));
    if (e.app_version) (g.versions as Set<string>).add(String(e.app_version));
    if (String(e.occurred_at) > String(g.last)) g.last = e.occurred_at;
    signatures.set(k, g);
  }

  const models = [...new Set(aiDaily.map((r) => String(r.model)))];
  const aiByDay = new Map<string, Row>();
  for (const r of aiDaily) {
    const day = String(r.day);
    const d = aiByDay.get(day) ?? { day };
    d[String(r.model)] = num(d[String(r.model)]) + num(r.input_tokens) + num(r.output_tokens);
    aiByDay.set(day, d);
  }

  return {
    today: last && last.day === bucharestDay() ? num(last.dau) : 0,
    wau: last ? num(last.wau) : 0,
    mau: last ? num(last.mau) : 0,
    medianSession: last ? num(last.median_session_minutes) : null,
    active: active.map((r) => ({
      day: r.day,
      dau: num(r.dau),
      sessions: num(r.sessions),
    })),
    sessions: active.reduce((n, r) => n + num(r.sessions), 0),
    features: sumBy(features, 'feature', ['count']),
    events: sumBy(events, 'event', ['count']).slice(0, 25),
    ai: {
      requests: aiDaily.reduce((n, r) => n + num(r.requests), 0),
      inputTokens: aiDaily.reduce((n, r) => n + num(r.input_tokens), 0),
      outputTokens: aiDaily.reduce((n, r) => n + num(r.output_tokens), 0),
      models,
      byModel: sumBy(aiDaily, 'model', ['requests', 'input_tokens', 'output_tokens']),
      daily: [...aiByDay.values()],
      atLimit: ['session', 'weekly', 'fable', 'trial'].map((k) => ({
        name: k,
        count: limits.reduce((n, r) => n + num(r[k]), 0),
      })),
    },
    versions: versions
      .map((r) => ({ version: r.version, platform: r.platform, installs: num(r.installs) }))
      .sort((a, b) => b.installs - a.installs),
    updates: ['available', 'downloaded', 'install_started', 'installed', 'failed'].map((k) => ({
      name: k,
      count: funnel.reduce((n, r) => n + num(r[k]), 0),
    })),
    errors: [...signatures.values()]
      .map((g) => ({
        ...g,
        users: (g.users as Set<string>).size,
        versions: [...(g.versions as Set<string>)].sort(),
      }))
      .sort((a, b) => num(b.count) - num(a.count))
      .slice(0, 25),
    users: overview.map((r) => ({
      email: email.get(String(r.user_id)) ?? null,
      plan: plan.get(String(r.user_id)) ?? null,
      version: r.current_version ?? null,
      installs: num(r.installs),
      sessions: num(r.sessions),
      aiRounds: num(r.ai_rounds),
      aiTokens: num(r.ai_tokens),
      lastSeen: r.last_seen ?? null,
      lastEvent: r.last_event ?? null,
    })),
  };
}

// ---- insights ---------------------------------------------------------------
//
// Joins the website, Stripe and the app: the path from a visit to a paying
// account, retention by the week an install started, and what AI costs per
// plan against what the plan brings in. The SQL lives in migration 003.

// Claude prices in USD per million tokens (input, output), by model id
// prefix; the longest matching prefix wins. List prices without prompt-cache
// discounts, so costs are an upper estimate. Haiku 5.5 at its rate for
// prompts up to 100K tokens. Update when prices or models change.
const PRICES: [string, number, number][] = [
  ['claude-fable-5', 10, 50],
  ['claude-mythos-5', 10, 50],
  ['claude-opus-5-5', 4, 20],
  ['claude-opus-5', 5, 25],
  ['claude-sonnet-5', 2, 10],
  ['claude-haiku-5-5', 0.1, 0.5],
];
function priceOf(model: string) {
  const hit = PRICES.filter(([p]) => model.startsWith(p)).sort(
    (a, b) => b[0].length - a[0].length,
  )[0];
  return hit ? { input: hit[1], output: hit[2] } : null;
}

// The National Bank of Romania's USD rate (lei per dollar), for costs in lei.
async function usdRate(): Promise<{ rate: number; date: string } | null> {
  const res = await fetch('https://curs.bnr.ro/nbrfxrates.xml');
  if (!res.ok) return null;
  const xml = await res.text();
  const rate = Number(/<Rate currency="USD">([\d.]+)</.exec(xml)?.[1]);
  const date = /<PublishingDate>([\d-]+)</.exec(xml)?.[1] ?? '';
  return rate > 0 ? { rate, date } : null;
}

const APP_PLAN: Record<string, string> = { solo: 'standard', firm: 'pro' };
const median = (list: number[]) => {
  if (!list.length) return null;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function goalVisitors(range: Range, goal: string) {
  const { results } = await plausible({
    metrics: ['visitors'],
    date_range: [range.from, range.to],
    filters: [['is', 'event:goal', [goal]]],
  });
  return num(results[0]?.metrics?.[0]);
}

async function insights(db: SupabaseClient, range: Range) {
  const plausibleOn = Boolean(PLAUSIBLE_KEY && PLAUSIBLE_SITE);
  const [
    users,
    firsts,
    subs,
    retention,
    usage,
    installs,
    site,
    clicks,
    fx,
    releases,
    lawTools,
    lawErrors,
    cancels,
  ] = await Promise.all([
    allUsers(),
    rows(db.rpc('admin_user_firsts')),
    rows(db.from('subscriptions').select('user_id, plan, status, started_at, amount')),
    rows(db.rpc('admin_retention_weekly', { p_weeks: 8 })),
    rows(db.rpc('admin_ai_usage_by_user', { p_from: range.from, p_to: range.to })),
    db
      .from('app_installs')
      .select('install_id', { count: 'exact', head: true })
      .gte('first_seen', `${range.from}T00:00:00+02:00`)
      .lte('first_seen', `${range.to}T23:59:59+03:00`),
    plausibleOn ? aggregate(range).catch(() => null) : Promise.resolve(null),
    plausibleOn ? goalVisitors(range, 'Download Click').catch(() => null) : Promise.resolve(null),
    cached('usd-rate', 6 * 60 * 60 * 1000, usdRate).catch(() => null),
    rows(db.rpc('admin_release_health', { p_from: range.from, p_to: range.to })),
    rows(db.rpc('admin_law_tools_daily', { p_from: range.from, p_to: range.to })),
    rows(db.rpc('admin_law_errors', { p_from: range.from, p_to: range.to })),
    // Why people cancel: Stripe's cancellation feedback, when the customer
    // portal asks for it.
    rows(
      db
        .from('billing_events')
        .select(
          'subscription_id, created_at, feedback:payload->data->object->cancellation_details->>feedback',
        )
        .in('type', ['customer.subscription.updated', 'customer.subscription.deleted'])
        .gte('created_at', `${range.from}T00:00:00+03:00`)
        .lte('created_at', `${range.to}T23:59:59+02:00`)
        .not('payload->data->object->cancellation_details->>feedback', 'is', null),
    ),
  ]);

  // The path to paying: accounts created in the range, and how far each got.
  const first = new Map(firsts.map((r) => [String(r.user_id), r]));
  const subscribed = new Map<string, number>();
  for (const s of subs) {
    if (!s.user_id || ['incomplete', 'incomplete_expired'].includes(String(s.status))) continue;
    const at = Date.parse(String(s.started_at ?? ''));
    const prev = subscribed.get(String(s.user_id));
    if (!Number.isNaN(at) && (prev === undefined || at < prev))
      subscribed.set(String(s.user_id), at);
  }
  const from = Date.parse(`${range.from}T00:00:00Z`) - 3 * 3600_000;
  const to = Date.parse(`${range.to}T23:59:59Z`);
  const created = users.filter((u) => {
    const at = Date.parse(u.created_at);
    return at >= from && at <= to;
  });
  const days = (a: number, b: number) => (b - a) / DAY;
  const toAi: number[] = [];
  const toPaid: number[] = [];
  let inApp = 0;
  let askedAi = 0;
  let paid = 0;
  for (const u of created) {
    const f = first.get(u.id);
    const start = Date.parse(u.created_at);
    if (f?.first_install) inApp++;
    if (f?.first_ai) {
      askedAi++;
      toAi.push(Math.max(0, days(start, Date.parse(String(f.first_ai)))));
    }
    const sub = subscribed.get(u.id);
    if (sub !== undefined) {
      paid++;
      toPaid.push(Math.max(0, days(start, sub)));
    }
  }

  // AI cost per plan, against the plan's subscription revenue for the range.
  const plan = new Map(users.map((u) => [u.id, String(u.app_metadata?.plan ?? 'trial')]));
  const email = new Map(users.map((u) => [u.id, u.email ?? null]));
  const perUser = new Map<
    string,
    { cost: number; tokens: number; requests: number; unpriced: number }
  >();
  const unpricedModels = new Set<string>();
  for (const r of usage) {
    const id = String(r.user_id);
    const p = priceOf(String(r.model));
    const acc = perUser.get(id) ?? { cost: 0, tokens: 0, requests: 0, unpriced: 0 };
    const tokens = num(r.input_tokens) + num(r.output_tokens);
    acc.tokens += tokens;
    acc.requests += num(r.requests);
    if (p) acc.cost += (num(r.input_tokens) * p.input + num(r.output_tokens) * p.output) / 1e6;
    else {
      acc.unpriced += tokens;
      unpricedModels.add(String(r.model));
    }
    perUser.set(id, acc);
  }
  const rangeDays = Math.round(days(Date.parse(range.from), Date.parse(range.to))) + 1;
  const plans: Record<
    string,
    { users: number; costUsd: number; tokens: number; revenueBani: number; subscribers: number }
  > = {};
  const planRow = (k: string) =>
    (plans[k] ??= { users: 0, costUsd: 0, tokens: 0, revenueBani: 0, subscribers: 0 });
  for (const [id, u] of perUser) {
    const row = planRow(plan.get(id) ?? 'trial');
    row.users++;
    row.costUsd += u.cost;
    row.tokens += u.tokens;
  }
  for (const s of subs) {
    if (!PAYING.has(String(s.status))) continue;
    const row = planRow(APP_PLAN[String(s.plan)] ?? String(s.plan));
    row.subscribers++;
    // Monthly prices, prorated to the range.
    row.revenueBani += (num(s.amount) * rangeDays) / 30;
  }

  // Subscription health: who was paying when the range began, who joined and
  // who left during it, as counts and as monthly revenue.
  const real = subs.filter((x) => !['incomplete', 'incomplete_expired'].includes(String(x.status)));
  const startOf = (x: Row) => Date.parse(String(x.started_at ?? ''));
  const endOf = (x: Row) => (x.ended_at ? Date.parse(String(x.ended_at)) : null);
  const atStart = real.filter((x) => startOf(x) < from && (endOf(x) === null || endOf(x)! >= from));
  const joined = real.filter((x) => startOf(x) >= from && startOf(x) <= to);
  const left = real.filter((x) => endOf(x) !== null && endOf(x)! >= from && endOf(x)! <= to);
  const paying = subs.filter((x) => PAYING.has(String(x.status)));
  const mrr = paying.reduce((n, x) => n + num(x.amount), 0);
  const sumAmount = (list: Row[]) => list.reduce((n, x) => n + num(x.amount), 0);
  const monthlyChurn = atStart.length ? (left.length / atStart.length) * (30 / rangeDays) : null;
  const arpu = paying.length ? mrr / paying.length : null;
  const feedback: Record<string, number> = {};
  const seen = new Set<string>();
  for (const c of cancels) {
    const k = String(c.subscription_id);
    if (seen.has(k)) continue;
    seen.add(k);
    feedback[String(c.feedback)] = (feedback[String(c.feedback)] ?? 0) + 1;
  }

  // The legal sources, per tool over the range and per day.
  const tools = sumBy(lawTools, 'tool', ['calls', 'failures', 'slow']);

  return {
    subscriptions: {
      activeAtStart: atStart.length,
      joined: joined.length,
      left: left.length,
      newMrr: sumAmount(joined),
      lostMrr: sumAmount(left),
      mrr,
      paying: paying.length,
      arpu,
      monthlyChurn,
      // Revenue over a customer's life at today's churn; none without churn.
      ltv: arpu !== null && monthlyChurn ? arpu / monthlyChurn : null,
      feedback: Object.entries(feedback)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    },
    releases: releases.map((r) => ({
      version: r.app_version,
      sessions: num(r.sessions),
      errorSessions: num(r.error_sessions),
      crashSessions: num(r.crash_sessions),
      installs: num(r.installs),
      firstSeen: r.first_seen,
    })),
    law: {
      tools,
      daily: lawTools.map((r) => ({
        day: r.day,
        tool: r.tool,
        calls: num(r.calls),
        failures: num(r.failures),
      })),
      errors: lawErrors.map((r) => ({ name: r.kind, count: num(r.count) })),
    },
    funnel: {
      visitors: site ? num(site.visitors) : null,
      downloadClicks: clicks,
      installs: installs.error ? null : (installs.count ?? 0),
      accounts: created.length,
      inApp,
      askedAi,
      paid,
      medianDaysToAi: median(toAi),
      medianDaysToPaid: median(toPaid),
    },
    retention: retention.map((r) => ({
      cohort: r.cohort,
      size: num(r.size),
      week: num(r.week),
      active: num(r.active),
    })),
    cost: {
      usdRate: fx,
      rangeDays,
      plans: Object.entries(plans).map(([name, r]) => ({ name, ...r })),
      top: [...perUser.entries()]
        .sort((a, b) => b[1].cost - a[1].cost)
        .slice(0, 10)
        .map(([id, u]) => ({
          email: email.get(id) ?? null,
          plan: plan.get(id) ?? null,
          costUsd: u.cost,
          tokens: u.tokens,
          requests: u.requests,
        })),
      unpricedModels: [...unpricedModels],
    },
  };
}

// ---- live -----------------------------------------------------------------

async function live(db: SupabaseClient) {
  const [summary, signups, now, dl, appToday] = await Promise.all([
    db.from('subscriptions_summary').select('*'),
    db.rpc('admin_signups_daily', { p_from: todayIso(), p_to: todayIso() }),
    PLAUSIBLE_KEY && PLAUSIBLE_SITE ? realtime().catch(() => null) : Promise.resolve(null),
    cached('downloads', CACHE_MS, downloads).catch(() => null),
    db.from('app_active_users_daily').select('dau').eq('day', bucharestDay()).maybeSingle(),
  ]);
  if (summary.error) throw summary.error;
  const rows = summary.data ?? [];
  return {
    visitorsNow: now,
    activeSubscriptions: rows.reduce(
      (n, r) =>
        n + Number(r.active) + Number(r.trialing) + Number(r.past_due) + Number(r.cancel_pending),
      0,
    ),
    mrr: rows.reduce((n, r) => n + Number(r.mrr), 0),
    signupsToday: (signups.data ?? []).reduce(
      (n: number, r: { signups: number }) => n + Number(r.signups),
      0,
    ),
    downloadsTotal: dl?.total ?? null,
    appUsersToday: appToday.error ? null : num(appToday.data?.dau),
  };
}

// ---- health ---------------------------------------------------------------

async function health(db: SupabaseClient) {
  const fns = [
    'ask-docvex',
    'stripe-events',
    'admin',
    'ai',
    'billing',
    'stripe-webhook',
    'events',
    'account',
    'alerts',
  ];
  const functions = await Promise.all(
    fns.map(async (name) => {
      const started = Date.now();
      try {
        const res = await fetch(`${URL_}/functions/v1/${name}`, {
          method: 'OPTIONS',
          headers: { Origin: ORIGINS[0], apikey: ANON },
        });
        return { name, ok: res.status < 500, status: res.status, ms: Date.now() - started };
      } catch {
        return { name, ok: false, status: null, ms: Date.now() - started };
      }
    }),
  );
  const key = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
  const alerts = await db
    .from('alerts_log')
    .select('kind, title, body, sent_at')
    .order('sent_at', { ascending: false })
    .limit(10);
  const last = await db
    .from('billing_events')
    .select('received_at, type')
    .order('received_at', { ascending: false })
    .limit(1);
  return {
    functions,
    stripeMode:
      key.startsWith('sk_live') || key.startsWith('rk_live') ? 'live' : key ? 'test' : null,
    lastEvent: last.data?.[0] ?? null,
    usageDebug: Deno.env.get('USAGE_DEBUG') === '1',
    plausibleConfigured: Boolean(PLAUSIBLE_KEY && PLAUSIBLE_SITE),
    githubToken: Boolean(Deno.env.get('GITHUB_TOKEN')),
    alertsConfigured: Boolean(Deno.env.get('NTFY_TOPIC') || Deno.env.get('TELEGRAM_BOT_TOKEN')),
    // Admins only see this: the topic to subscribe to in the ntfy app.
    ntfyTopic: Deno.env.get('NTFY_TOPIC') ?? null,
    ntfyServer: Deno.env.get('NTFY_SERVER') ?? 'https://ntfy.sh',
    alerts: alerts.data ?? [],
  };
}

// ---- ask (Claude, about the metrics) ------------------------------------------

let anthropic: Anthropic | null = null;
const ASK_MODEL = 'claude-opus-5-5';

// What the assistant sees: every action's data for the range, without email
// addresses (accounts are referred to by plan and number instead).
async function snapshot(db: SupabaseClient, range: Range) {
  const soft = <T>(p: Promise<T>) => p.catch((e) => ({ error: String(e?.message ?? e) }));
  const [liveData, insightsData, appData, accountsData, billingData, trafficData, downloadsData] =
    await Promise.all([
      soft(live(db)),
      soft(cached(`insights:${range.from}:${range.to}:false`, CACHE_MS, () => insights(db, range))),
      soft(cached(`app:${range.from}:${range.to}:false`, CACHE_MS, () => app(db, range))),
      soft(cached(`accounts:${range.from}:${range.to}:false`, CACHE_MS, () => accounts(db, range))),
      soft(cached(`billing:${range.from}:${range.to}:false`, CACHE_MS, () => billing(db, range))),
      soft(
        cached(`traffic:${range.from}:${range.to}:false`, CACHE_MS, () => traffic(range, false)),
      ),
      soft(cached('downloads', CACHE_MS, downloads)),
    ]);
  const strip = (value: unknown): unknown =>
    JSON.parse(JSON.stringify(value), (k, v) => (k === 'email' ? undefined : v));
  const b = billingData as Record<string, unknown>;
  return strip({
    range,
    today: bucharestDay(),
    live: liveData,
    keyMetrics: insightsData,
    app: appData,
    accounts: accountsData,
    subscriptions:
      'error' in b
        ? b
        : { summary: b.summary, lifecycle: b.lifecycle, subscriptions: b.subscriptions },
    websiteTraffic: trafficData,
    downloads: downloadsData,
  });
}

const ASK_SYSTEM = `You are the analyst inside DocVex's internal admin dashboard. DocVex is a desktop app for Romanian lawyers (projects, files, a document viewer, AI legal research over Romanian legislation, EU law, court cases, companies and lawyers), sold as Solo (199 lei/month) and Firm (499 lei/month), with a free trial. Its website is docvex.ro.

You answer the admin's questions using only the data snapshot below, which the dashboard fetched just now for the selected date range.
- Money amounts in the data are in bani (1/100 of a leu) unless a field says otherwise (costUsd is in US dollars). Write money in lei.
- App plans: trial, standard (= Solo), pro (= Firm). Website plan choices: start, pro (= Solo), cabinet (= Firm).
- Days are in Bucharest time. "today" is the date given.
- A field holding { error } means that source could not be read (for example Plausible not configured); say so rather than guessing.
- Empty lists or zeros usually mean no data yet (the app's statistics start with version 1.2.0), not a real zero; say which.
- Never invent numbers. When you compute something (a rate, a total), say how in a few words.
- Be concise and concrete: lead with the answer, then the few numbers behind it, then at most a couple of suggestions when they help. Use short paragraphs or bullet lists; no tables.
- Answer in the language of the question.`;

type Turn = { role: 'user' | 'assistant'; content: string };

async function ask(db: SupabaseClient, range: Range, body: Record<string, unknown>) {
  const question = String(body.question ?? '')
    .trim()
    .slice(0, 2000);
  if (!question) return { error: 'empty' };
  const history: Turn[] = (Array.isArray(body.history) ? body.history : [])
    .filter(
      (t): t is Turn =>
        (t?.role === 'user' || t?.role === 'assistant') && typeof t?.content === 'string',
    )
    .slice(-10)
    .map((t) => ({ role: t.role, content: t.content.slice(0, 8000) }));
  const data = await snapshot(db, range);

  anthropic ??= new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
  const stream = anthropic.messages.stream({
    model: ASK_MODEL,
    max_tokens: 4096,
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: ASK_SYSTEM },
      { type: 'text', text: `Data snapshot (JSON):\n${JSON.stringify(data)}` },
    ],
    messages: [...history, { role: 'user', content: question }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === 'refusal') return { answer: null, refused: true };
  const answer = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { text: string }).text)
    .join('\n')
    .trim();
  return { answer, truncated: message.stop_reason === 'max_tokens' };
}

// ---- push (the installed dashboard's notifications) ---------------------------
//
// admin_push_subscriptions (migration 006) is written with the admin's own
// token, so its policy (is_admin() and the caller's own rows) applies.

type BrowserSubscription = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

async function pushSubscribe(db: SupabaseClient, user: User, body: Record<string, unknown>) {
  const sub = (body.subscription ?? {}) as BrowserSubscription;
  const endpoint = String(sub.endpoint ?? '');
  if (!/^https:\/\//.test(endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: 'bad_subscription' };
  }
  const label =
    String(body.device_label ?? '')
      .trim()
      .slice(0, 80) || null;
  const { data, error } = await db
    .from('admin_push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        device_label: label,
        failures: 0,
      },
      { onConflict: 'endpoint' },
    )
    .select('id, endpoint, device_label, created_at, last_used_at, failures')
    .single();
  if (error) throw error;
  return { device: data };
}

async function pushList(db: SupabaseClient) {
  const { data, error } = await db
    .from('admin_push_subscriptions')
    .select('id, endpoint, device_label, created_at, last_used_at, failures')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return { devices: data ?? [], configured: Boolean(vapidFromEnv((n) => Deno.env.get(n))) };
}

async function pushUnsubscribe(db: SupabaseClient, body: Record<string, unknown>) {
  const { error } = await db
    .from('admin_push_subscriptions')
    .delete()
    .eq('endpoint', String(body.endpoint ?? ''));
  if (error) throw error;
  return { ok: true };
}

async function pushTest(db: SupabaseClient, user: User, body: Record<string, unknown>) {
  const vapid = vapidFromEnv((n) => Deno.env.get(n));
  if (!vapid) return { error: 'not_configured' };
  const lang = body.lang === 'en' ? 'en' : 'ro';
  const result = await pushToAdmins(
    db,
    {
      title: lang === 'en' ? 'DocVex notifications work' : 'Notificările DocVex funcționează',
      body:
        lang === 'en'
          ? 'This device will get alerts and, later, new reports.'
          : 'Acest dispozitiv va primi alertele și, mai târziu, rapoartele noi.',
      url: 'https://docvex.ro/dev.html#/settings',
      tag: 'test',
    },
    vapid,
    user.id,
  );
  return { devices: result.devices, sent: result.sent, removed: result.removed };
}

// ---- requests ---------------------------------------------------------------

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
  const notFound = () => json({ error: 'not_found' }, 404, origin);
  if (req.method !== 'POST') return notFound();

  // Only admins; anyone else sees nothing here.
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!token) return notFound();
  const { data, error } = await service.auth.getUser(token);
  if (error || data.user?.app_metadata?.is_admin !== true) return notFound();

  let body: { action?: string; range?: unknown; compare?: boolean; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400, origin);
  }
  const range = cleanRange(body.range);
  const compare = body.compare === true;
  // Tables and views read as the admin, so RLS and is_admin() apply.
  const db = createClient(URL_, ANON, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const key = `${body.action}:${range.from}:${range.to}:${compare}`;

  try {
    switch (body.action) {
      case 'live':
        return json(await cached(key, LIVE_CACHE_MS, () => live(db)), 200, origin);
      case 'traffic':
        return json(await cached(key, CACHE_MS, () => traffic(range, compare)), 200, origin);
      case 'billing':
        return json(await cached(key, CACHE_MS, () => billing(db, range)), 200, origin);
      case 'accounts':
        return json(await cached(key, CACHE_MS, () => accounts(db, range)), 200, origin);
      case 'downloads':
        return json(await cached('downloads', CACHE_MS, downloads), 200, origin);
      case 'app':
        return json(await cached(key, CACHE_MS, () => app(db, range)), 200, origin);
      case 'insights':
        return json(await cached(key, CACHE_MS, () => insights(db, range)), 200, origin);
      case 'push.subscribe':
        return json(await pushSubscribe(db, data.user!, body), 200, origin);
      case 'push.unsubscribe':
        return json(await pushUnsubscribe(db, body), 200, origin);
      case 'push.list':
        return json(await pushList(db), 200, origin);
      case 'push.test':
        return json(await pushTest(db, data.user!, body), 200, origin);
      case 'ask':
        return json(await ask(db, range, body), 200, origin);
      case 'testAlert': {
        const res = await fetch(`${URL_}/functions/v1/alerts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-alerts-secret': Deno.env.get('ALERTS_SECRET') ?? '',
          },
          body: JSON.stringify({ test: true }),
        });
        return json(await res.json().catch(() => ({ ok: false })), res.ok ? 200 : 502, origin);
      }
      case 'health':
        return json(await health(db), 200, origin);
      default:
        return json({ error: 'unknown_action' }, 400, origin);
    }
  } catch (err) {
    console.error(body.action, err);
    return json(
      { error: 'server', message: err instanceof Error ? err.message : String(err) },
      500,
      origin,
    );
  }
});
