// The admin dashboard's data (dev.html): one function, a few actions.
//
//   POST { action, range: { from, to }, compare? }   with the admin's token
//     live       visitors now, subscriptions, MRR, sign-ups and downloads today
//     traffic    Plausible: aggregates, timeseries, breakdowns, goals
//     billing    subscriptions and Stripe events (public.subscriptions, ...)
//     accounts   sign-ups, providers, newsletter, plan choices, recency
//     downloads  GitHub Releases download counts
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
  region: 'visit:region_name',
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
    breakdowns: Object.fromEntries(entries),
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

// ---- live -----------------------------------------------------------------

async function live(db: SupabaseClient) {
  const [summary, signups, now, dl] = await Promise.all([
    db.from('subscriptions_summary').select('*'),
    db.rpc('admin_signups_daily', { p_from: todayIso(), p_to: todayIso() }),
    PLAUSIBLE_KEY && PLAUSIBLE_SITE ? realtime().catch(() => null) : Promise.resolve(null),
    cached('downloads', CACHE_MS, downloads).catch(() => null),
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
  };
}

// ---- health ---------------------------------------------------------------

async function health(db: SupabaseClient) {
  const fns = ['ask-docvex', 'stripe-events', 'admin', 'ai', 'billing', 'stripe-webhook'];
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
  };
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

  let body: { action?: string; range?: unknown; compare?: boolean };
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
