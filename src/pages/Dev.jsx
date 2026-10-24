import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { NotFoundContent } from './NotFound.jsx';
import { countryName } from '../components/dev/countries.js';
import { useLang, useMeta } from '../i18n.jsx';
import { useSession } from '../useSession.js';
import { validUrl } from '../auth.js';

// The admin dashboard (dev.html): website traffic (Plausible), subscriptions
// (Stripe, through the stripe-events log), accounts, downloads and health,
// all from the admin Edge Function, which answers admins only. Not linked
// from anywhere and not indexed; anyone who is not an admin sees the 404
// page. The charts (Recharts) and the globe (cobe) load only here.

const lazyChart = (name) =>
  lazy(() => import('../components/dev/Charts.jsx').then((m) => ({ default: m[name] })));
const TrafficChart = lazyChart('TrafficChart');
const Donut = lazyChart('Donut');
const StackedBars = lazyChart('StackedBars');
const StackedAreas = lazyChart('StackedAreas');
const Globe = lazy(() => import('../components/dev/Globe.jsx'));

const ENDPOINT = validUrl(import.meta.env.VITE_SUPABASE_URL)
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin`
  : null;
const LIVE_EVERY = 60_000;
const DOWNLOADS_KEY = 'docvex:dev-downloads';

// The dashboard's own colours for series (the same as the charts').
const C = {
  gold: '#e6cf9a',
  blue: '#7fb0ea',
  green: '#6cc58f',
  cognac: '#c08a5c',
  red: '#e5675d',
  amber: '#e8a948',
  violet: '#b9a3e8',
};

const META = {
  ro: { title: 'Panou — DocVex', description: '' },
  en: { title: 'Dashboard — DocVex', description: '' },
};

const T = {
  ro: {
    locale: 'ro-RO',
    eyebrow: 'Panou intern',
    title: 'DocVex, în timp real.',
    signedOut: 'Autentifică-te cu un cont de administrator.',
    signIn: 'Autentificare',
    loading: 'Se încarcă…',
    unavailable: 'Panoul nu este configurat (lipsește VITE_SUPABASE_URL).',
    failed: 'Nu am putut încărca datele.',
    retry: 'Reîncearcă',
    ranges: {
      today: 'Azi',
      '7d': '7 zile',
      '30d': '30 de zile',
      '90d': '90 de zile',
      custom: 'Interval',
    },
    from: 'De la',
    to: 'Până la',
    compare: 'Compară cu perioada anterioară',
    autoRefresh: 'Actualizare automată la 60 s',
    updated: (time) => `Actualizat la ${time}`,
    refresh: 'Actualizează',
    live: {
      title: 'Acum',
      visitors: 'Vizitatori acum',
      subs: 'Abonamente active',
      mrr: 'MRR',
      signups: 'Conturi noi azi',
      downloads: 'Descărcări azi',
    },
    sections: {
      traffic: 'Trafic',
      audience: 'Public',
      subscriptions: 'Abonamente',
      accounts: 'Conturi',
      downloads: 'Descărcări',
      health: 'Stare',
    },
    traffic: {
      notConfigured:
        'Plausible nu este configurat: setează PLAUSIBLE_API_KEY și PLAUSIBLE_SITE_ID ca secrete ale funcției admin.',
      visitors: 'Vizitatori unici',
      visits: 'Vizite',
      pageviews: 'Afișări de pagini',
      views_per_visit: 'Pagini / vizită',
      visit_duration: 'Durata vizitei',
      bounce_rate: 'Rată de respingere',
      vsPrevious: 'față de perioada anterioară',
      chart: 'Vizitatori și afișări',
      current: 'Perioada aleasă',
      previous: 'Perioada anterioară',
      channels: 'Canale',
      referrers: 'Site-uri care trimit vizitatori',
      utm: 'Campanii (UTM)',
      utmSource: 'Sursă',
      utmMedium: 'Mediu',
      utmCampaign: 'Campanie',
      pages: 'Pagini',
      top: 'Cele mai vizitate',
      entry: 'De intrare',
      exit: 'De ieșire',
      notFound: 'Pagini inexistente (404)',
      goals: 'Evenimente',
    },
    audience: {
      globe: 'Vizitatori pe țări',
      countries: 'Țări',
      regions: 'Regiuni',
      cities: 'Orașe',
      devices: 'Dispozitive',
      browsers: 'Browsere',
      os: 'Sisteme de operare',
      returning:
        'Vizitatori noi și reveniți: Plausible nu îi deosebește, fiindcă nu folosește cookie-uri.',
    },
    subs: {
      mrrByPlan: 'MRR pe plan',
      lifecycle: 'Ciclul abonamentelor',
      funnel: 'De la plată la abonament',
      funnelSteps: ['Trimiși la plată', 'Întorși de la plată', 'Abonamente create'],
      changes: 'Schimbări de plan',
      from: 'Din',
      toPlan: 'În',
      current: 'Abonamente',
      events: 'Ultimele evenimente Stripe',
      all: 'Toate',
      search: 'Caută după e-mail',
      cols: {
        email: 'E-mail',
        plan: 'Plan',
        status: 'Stare',
        periodEnd: 'Sfârșitul perioadei',
        cancel: 'Se anulează',
        amount: 'Sumă',
      },
      lifecycleKeys: {
        created: 'Create',
        upgraded: 'Trecute pe un plan mai mare',
        downgraded: 'Trecute pe un plan mai mic',
        cancel_requested: 'Anulare cerută',
        canceled: 'Anulate',
        reactivated: 'Reactivate',
        payment_failed: 'Plăți eșuate',
      },
      empty:
        'Niciun abonament încă. Când Stripe trimite primele evenimente către stripe-events, apar aici.',
    },
    events: {
      'checkout.session.completed': (e) => `Plată finalizată${e.who}`,
      'customer.subscription.created': (e) => `Abonament ${e.plan} creat${e.who}`,
      'customer.subscription.updated': (e) =>
        e.lifecycle === 'cancel_requested'
          ? `Anulare cerută${e.who}, se încheie la ${e.end}`
          : e.lifecycle === 'reactivated'
            ? `Abonament reactivat${e.who}`
            : e.lifecycle === 'upgraded'
              ? `Trecere la ${e.plan}${e.who}`
              : e.lifecycle === 'downgraded'
                ? `Trecere la ${e.plan}${e.who}`
                : `Abonament actualizat${e.who}`,
      'customer.subscription.deleted': (e) => `Abonament ${e.plan} încheiat${e.who}`,
      'customer.subscription.trial_will_end': (e) => `Perioada de probă se încheie${e.who}`,
      'invoice.paid': (e) => `Factură plătită${e.who}: ${e.amount}`,
      'invoice.payment_failed': (e) => `Plată eșuată${e.who}`,
      'invoice.payment_action_required': (e) => `Plata cere confirmare${e.who}`,
      'customer.created': (e) => `Client nou${e.who}`,
      'customer.deleted': (e) => `Client șters${e.who}`,
    },
    accounts: {
      total: 'Conturi',
      signups: 'Conturi noi pe zi',
      providers: 'Metode de autentificare',
      providerNames: { email: 'E-mail', google: 'Google', both: 'Amândouă', other: 'Altele' },
      newsletter: 'Abonați la newsletter',
      plans: 'Planul ales pe site',
      planNames: { start: 'Start', pro: 'Solo', cabinet: 'Firm', none: 'Neales' },
      mismatch: 'Planul ales diferă de cel plătit',
      versions: 'Versiunea descărcată',
      none: 'Niciuna',
      recency: 'Ultima autentificare',
      recencyNames: {
        '24h': 'Ultimele 24 h',
        '7d': 'Ultimele 7 zile',
        '30d': 'Ultimele 30 de zile',
        older: 'Mai demult',
        never: 'Niciodată',
      },
    },
    downloads: {
      title: 'Descărcări pe versiuni',
      release: 'Versiune',
      date: 'Data',
      windows: 'Windows',
      mac: 'macOS',
      total: 'Total',
      empty: 'Nicio versiune publicată încă.',
    },
    health: {
      stripe: 'Stripe',
      test: 'Mod de test',
      live: 'Mod real',
      unknown: 'Necunoscut',
      functions: 'Funcții',
      lastEvent: 'Ultimul eveniment Stripe',
      never: 'Niciunul încă',
      usageDebug:
        'USAGE_DEBUG este activat pe funcția ai: oprește-l în producție (supabase secrets unset USAGE_DEBUG).',
      plausible: 'Plausible',
      github: 'Token GitHub',
      yes: 'Configurat',
      no: 'Lipsește',
    },
    empty: 'Nimic de arătat pentru această perioadă.',
  },
  en: {
    locale: 'en-GB',
    eyebrow: 'Internal dashboard',
    title: 'DocVex, live.',
    signedOut: 'Sign in with an admin account.',
    signIn: 'Sign in',
    loading: 'Loading…',
    unavailable: 'The dashboard is not configured (VITE_SUPABASE_URL is missing).',
    failed: 'Could not load the data.',
    retry: 'Try again',
    ranges: {
      today: 'Today',
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      custom: 'Custom',
    },
    from: 'From',
    to: 'To',
    compare: 'Compare with the previous period',
    autoRefresh: 'Auto-refresh every 60 s',
    updated: (time) => `Updated at ${time}`,
    refresh: 'Refresh',
    live: {
      title: 'Now',
      visitors: 'Visitors now',
      subs: 'Active subscriptions',
      mrr: 'MRR',
      signups: 'Sign-ups today',
      downloads: 'Downloads today',
    },
    sections: {
      traffic: 'Traffic',
      audience: 'Audience',
      subscriptions: 'Subscriptions',
      accounts: 'Accounts',
      downloads: 'Downloads',
      health: 'Health',
    },
    traffic: {
      notConfigured:
        'Plausible is not configured: set PLAUSIBLE_API_KEY and PLAUSIBLE_SITE_ID as secrets of the admin function.',
      visitors: 'Unique visitors',
      visits: 'Visits',
      pageviews: 'Page views',
      views_per_visit: 'Views per visit',
      visit_duration: 'Visit duration',
      bounce_rate: 'Bounce rate',
      vsPrevious: 'vs previous period',
      chart: 'Visitors and page views',
      current: 'Selected period',
      previous: 'Previous period',
      channels: 'Channels',
      referrers: 'Top referrers',
      utm: 'Campaigns (UTM)',
      utmSource: 'Source',
      utmMedium: 'Medium',
      utmCampaign: 'Campaign',
      pages: 'Pages',
      top: 'Top',
      entry: 'Entry',
      exit: 'Exit',
      notFound: 'Missing pages (404)',
      goals: 'Events',
    },
    audience: {
      globe: 'Visitors by country',
      countries: 'Countries',
      regions: 'Regions',
      cities: 'Cities',
      devices: 'Devices',
      browsers: 'Browsers',
      os: 'Operating systems',
      returning:
        'New vs returning visitors: Plausible can’t tell them apart, as it uses no cookies.',
    },
    subs: {
      mrrByPlan: 'MRR by plan',
      lifecycle: 'Subscription lifecycle',
      funnel: 'From checkout to subscription',
      funnelSteps: ['Sent to checkout', 'Back from checkout', 'Subscriptions created'],
      changes: 'Plan changes',
      from: 'From',
      toPlan: 'To',
      current: 'Subscriptions',
      events: 'Latest Stripe events',
      all: 'All',
      search: 'Search by email',
      cols: {
        email: 'Email',
        plan: 'Plan',
        status: 'Status',
        periodEnd: 'Period ends',
        cancel: 'Cancelling',
        amount: 'Amount',
      },
      lifecycleKeys: {
        created: 'Created',
        upgraded: 'Upgraded',
        downgraded: 'Downgraded',
        cancel_requested: 'Cancel requested',
        canceled: 'Canceled',
        reactivated: 'Reactivated',
        payment_failed: 'Payment failed',
      },
      empty:
        'No subscriptions yet. They show up here once Stripe sends its first events to stripe-events.',
    },
    events: {
      'checkout.session.completed': (e) => `Checkout completed${e.who}`,
      'customer.subscription.created': (e) => `${e.plan} subscription created${e.who}`,
      'customer.subscription.updated': (e) =>
        e.lifecycle === 'cancel_requested'
          ? `Cancel requested${e.who}, ends ${e.end}`
          : e.lifecycle === 'reactivated'
            ? `Subscription reactivated${e.who}`
            : e.lifecycle === 'upgraded'
              ? `Upgraded to ${e.plan}${e.who}`
              : e.lifecycle === 'downgraded'
                ? `Downgraded to ${e.plan}${e.who}`
                : `Subscription updated${e.who}`,
      'customer.subscription.deleted': (e) => `${e.plan} subscription ended${e.who}`,
      'customer.subscription.trial_will_end': (e) => `Trial ending soon${e.who}`,
      'invoice.paid': (e) => `Invoice paid${e.who}: ${e.amount}`,
      'invoice.payment_failed': (e) => `Payment failed${e.who}`,
      'invoice.payment_action_required': (e) => `Payment needs confirmation${e.who}`,
      'customer.created': (e) => `New customer${e.who}`,
      'customer.deleted': (e) => `Customer deleted${e.who}`,
    },
    accounts: {
      total: 'Accounts',
      signups: 'Sign-ups per day',
      providers: 'Sign-in methods',
      providerNames: { email: 'Email', google: 'Google', both: 'Both', other: 'Other' },
      newsletter: 'Newsletter opt-ins',
      plans: 'Plan chosen on the site',
      planNames: { start: 'Start', pro: 'Solo', cabinet: 'Firm', none: 'Not chosen' },
      mismatch: 'Chosen plan differs from the paid one',
      versions: 'Downloaded version',
      none: 'None',
      recency: 'Last sign-in',
      recencyNames: {
        '24h': 'Last 24 h',
        '7d': 'Last 7 days',
        '30d': 'Last 30 days',
        older: 'Older',
        never: 'Never',
      },
    },
    downloads: {
      title: 'Downloads by release',
      release: 'Release',
      date: 'Date',
      windows: 'Windows',
      mac: 'macOS',
      total: 'Total',
      empty: 'No release published yet.',
    },
    health: {
      stripe: 'Stripe',
      test: 'Test mode',
      live: 'Live mode',
      unknown: 'Unknown',
      functions: 'Functions',
      lastEvent: 'Last Stripe event',
      never: 'None yet',
      usageDebug:
        'USAGE_DEBUG is on for the ai function: turn it off in production (supabase secrets unset USAGE_DEBUG).',
      plausible: 'Plausible',
      github: 'GitHub token',
      yes: 'Set',
      no: 'Missing',
    },
    empty: 'Nothing to show for this period.',
  },
};

const PLAN_NAMES = { solo: 'Solo', firm: 'Firm', unknown: '—' };

// ---- dates and numbers ------------------------------------------------------

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDay(d);
};

function presetRange(preset) {
  const today = localDay(new Date());
  const back = { today: 0, '7d': 6, '30d': 29, '90d': 89 }[preset] ?? 29;
  return { from: addDays(today, -back), to: today };
}

function daysBetween({ from, to }) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

const REDUCED =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useFormat(locale) {
  return useMemo(() => {
    const int = new Intl.NumberFormat(locale);
    const dec = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const money = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'RON',
      maximumFractionDigits: 0,
    });
    const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    const dateLong = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' });
    return {
      int: (v) => (v === null || v === undefined ? '—' : int.format(v)),
      dec: (v) => (v === null || v === undefined ? '—' : dec.format(v)),
      // Stripe amounts are in bani.
      money: (bani) => (bani === null || bani === undefined ? '—' : money.format(bani / 100)),
      pct: (v) => (v === null || v === undefined ? '—' : `${dec.format(v)}%`),
      duration: (s) => (s ? `${Math.floor(s / 60)}:${pad(Math.round(s % 60))}` : '—'),
      day: (iso) => (iso ? date.format(new Date(`${String(iso).slice(0, 10)}T12:00:00`)) : ''),
      dateLong: (iso) => (iso ? dateLong.format(new Date(iso)) : '—'),
      dateTime: (iso) => (iso ? dateTime.format(new Date(iso)) : '—'),
      time: (d) => time.format(d),
      // Hours ("2026-10-24 14:00:00") as 14:00, days as 24 Oct, months as Oct.
      tick: (t) => {
        const s = String(t ?? '');
        if (s.length > 10) return s.slice(11, 16);
        if (s.length === 7)
          return new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(`${s}-15`));
        return s ? date.format(new Date(`${s}T12:00:00`)) : '';
      },
    };
  }, [locale]);
}

// A number that counts up to its value.
function useCountUp(value) {
  const [shown, setShown] = useState(REDUCED ? value : 0);
  const from = useRef(0);
  useEffect(() => {
    if (value === null || value === undefined || REDUCED) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const begin = from.current ?? 0;
    let frame = 0;
    const step = (now) => {
      const k = Math.min(1, (now - start) / 700);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(begin + (value - begin) * eased);
      if (k < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

// ---- data ---------------------------------------------------------------------

async function call(token, action, body = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });
  if (res.status === 404) {
    const error = new Error('not_found');
    error.notFound = true;
    throw error;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `HTTP ${res.status}`);
  return data;
}

// One action's data for the current range: { data, error, loading, reload }.
function useAction(token, action, body, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    call(token, action, body)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [token, tick, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setTick((n) => n + 1) };
}

// Downloads today: the GitHub total now, less the total first seen today
// (remembered in this browser, since GitHub keeps only totals).
function downloadsToday(total) {
  if (total === null || total === undefined) return null;
  const day = localDay(new Date());
  try {
    const saved = JSON.parse(localStorage.getItem(DOWNLOADS_KEY) ?? 'null');
    if (saved?.day === day && typeof saved.base === 'number') {
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify({ ...saved, last: total }));
      return Math.max(0, total - saved.base);
    }
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify({ day, base: total, last: total }));
  } catch {
    // No storage: the count starts from now.
  }
  return 0;
}

// ---- building blocks ----------------------------------------------------------

function Card({ title, children, wide = false, tall = false, aside }) {
  return (
    <section
      className={['dev-card', wide && 'is-wide', tall && 'is-tall'].filter(Boolean).join(' ')}
    >
      {(title || aside) && (
        <header className="dev-card-head">
          {title && <h3>{title}</h3>}
          {aside}
        </header>
      )}
      {children}
    </section>
  );
}

const Skeleton = ({ height = 140 }) => (
  <div className="dev-skel" style={{ height }} aria-hidden="true" />
);
const Empty = ({ children }) => <p className="dev-empty">{children}</p>;

function Section({ id, title, children }) {
  return (
    <section className="dev-section" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      <div className="dev-grid">{children}</div>
    </section>
  );
}

function Failed({ t, error, onRetry }) {
  return (
    <div className="dev-failed" role="alert">
      <span>
        {t.failed} <small>{error?.message}</small>
      </span>
      <button type="button" className="btn is-outline is-small" onClick={onRetry}>
        {t.retry}
      </button>
    </div>
  );
}

function Delta({ now, before, invert = false }) {
  if (before === null || before === undefined || now === null || now === undefined) return null;
  if (!before) return <span className="dev-delta">—</span>;
  const pct = ((now - before) / before) * 100;
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={`dev-delta ${good ? 'is-up' : 'is-down'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function Kpi({ label, value, format, before, invert, spark }) {
  const shown = useCountUp(value ?? null);
  return (
    <div className="dev-kpi">
      <span className="dev-kpi-label">{label}</span>
      <b className="dev-num">{value === null || value === undefined ? '—' : format(shown)}</b>
      <Delta now={value} before={before} invert={invert} />
      {spark && <Sparkline values={spark} />}
    </div>
  );
}

function Sparkline({ values }) {
  if (!values?.length) return null;
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 24;
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`);
  return (
    <svg
      className="dev-spark"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={points.join(' ')} />
    </svg>
  );
}

// Names with bars proportional to their values.
function RankList({
  rows,
  name = (r) => r.name,
  value = (r) => r.visitors,
  format,
  limit = 8,
  onHover,
}) {
  if (!rows?.length) return <Empty>—</Empty>;
  const list = rows.slice(0, limit);
  const max = Math.max(1, ...list.map(value));
  return (
    <ol className="dev-rank">
      {list.map((r, i) => (
        <li
          key={`${name(r)}-${i}`}
          onMouseEnter={onHover ? () => onHover(r) : undefined}
          onMouseLeave={onHover ? () => onHover(null) : undefined}
        >
          <span className="dev-rank-bar" style={{ width: `${(value(r) / max) * 100}%` }} />
          <span className="dev-rank-name">{name(r) || '(none)'}</span>
          <span className="dev-num">{format(value(r))}</span>
        </li>
      ))}
    </ol>
  );
}

function Tabs({ tabs, children }) {
  const [active, setActive] = useState(tabs[0].key);
  return (
    <>
      <div className="dev-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(active)}
    </>
  );
}

const ChartFallback = ({ height = 240 }) => <Skeleton height={height} />;

// ---- sections -----------------------------------------------------------------

function LiveStrip({ t, f, live, lastUpdated }) {
  const d = live.data;
  const today = useMemo(() => downloadsToday(d?.downloadsTotal), [d?.downloadsTotal]);
  const tiles = [
    { key: 'visitors', value: d?.visitorsNow ?? null, format: f.int, pulse: true },
    { key: 'subs', value: d?.activeSubscriptions ?? null, format: f.int },
    { key: 'mrr', value: d?.mrr ?? null, format: f.money },
    { key: 'signups', value: d?.signupsToday ?? null, format: f.int },
    { key: 'downloads', value: today, format: f.int },
  ];
  return (
    <section className="dev-live" aria-label={t.live.title}>
      {tiles.map((tile) => (
        <div key={tile.key} className="dev-live-tile">
          <span className="dev-kpi-label">
            {tile.pulse && <i className="dev-pulse" aria-hidden="true" />}
            {t.live[tile.key]}
          </span>
          {live.loading && !d ? (
            <Skeleton height={34} />
          ) : (
            <LiveValue value={tile.value} format={tile.format} />
          )}
        </div>
      ))}
      {lastUpdated && <span className="dev-live-time">{t.updated(f.time(lastUpdated))}</span>}
    </section>
  );
}

function LiveValue({ value, format }) {
  const shown = useCountUp(value);
  return <b className="dev-num dev-live-num">{value === null ? '—' : format(shown)}</b>;
}

function TrafficSection({ t, f, traffic, compare }) {
  const tt = t.traffic;
  const d = traffic.data;
  if (traffic.error) return <Failed t={t} error={traffic.error} onRetry={traffic.reload} />;
  if (d && !d.configured) return <p className="callout">{tt.notConfigured}</p>;
  const loading = traffic.loading && !d;
  const b = d?.breakdowns ?? {};
  const kpis = [
    ['visitors', f.int],
    ['visits', f.int],
    ['pageviews', f.int],
    ['views_per_visit', f.dec],
    ['visit_duration', f.duration],
    ['bounce_rate', f.pct, true],
  ];
  const spark = d?.timeseries?.map((p) => p.visitors);
  return (
    <>
      <Card wide>
        <div className="dev-kpis">
          {kpis.map(([key, format, invert]) =>
            loading ? (
              <Skeleton key={key} height={70} />
            ) : (
              <Kpi
                key={key}
                label={tt[key]}
                value={d.totals[key]}
                format={format}
                before={compare ? d.previousTotals?.[key] : null}
                invert={invert}
                spark={key === 'visitors' ? spark : undefined}
              />
            ),
          )}
        </div>
      </Card>
      <Card title={tt.chart} wide>
        {loading ? (
          <ChartFallback height={260} />
        ) : d.timeseries.length ? (
          <Suspense fallback={<ChartFallback height={260} />}>
            <TrafficChart
              data={d.timeseries}
              previous={compare ? d.previousTimeseries : null}
              metric="visitors"
              labels={{ current: tt.current, previous: tt.previous }}
              tickFormat={f.tick}
            />
          </Suspense>
        ) : (
          <Empty>{t.empty}</Empty>
        )}
      </Card>
      <Card title={tt.channels}>
        {loading ? (
          <ChartFallback height={220} />
        ) : (b.channel?.length ? b.channel : b.source)?.length ? (
          <Suspense fallback={<ChartFallback height={220} />}>
            <Donut
              data={(b.channel?.length ? b.channel : b.source)
                .slice(0, 7)
                .map((r) => ({ name: r.name || '(none)', value: r.visitors }))}
              format={f.int}
            />
          </Suspense>
        ) : (
          <Empty>{t.empty}</Empty>
        )}
      </Card>
      <Card title={tt.referrers}>
        {loading ? <Skeleton /> : <RankList rows={b.referrer} format={f.int} />}
      </Card>
      <Card title={tt.utm}>
        {loading ? (
          <Skeleton />
        ) : (
          <Tabs
            tabs={[
              { key: 'utm_source', label: tt.utmSource },
              { key: 'utm_medium', label: tt.utmMedium },
              { key: 'utm_campaign', label: tt.utmCampaign },
            ]}
          >
            {(k) => <RankList rows={b[k]} format={f.int} />}
          </Tabs>
        )}
      </Card>
      <Card title={tt.pages}>
        {loading ? (
          <Skeleton />
        ) : (
          <Tabs
            tabs={[
              { key: 'page', label: tt.top },
              { key: 'entry_page', label: tt.entry },
              { key: 'exit_page', label: tt.exit },
            ]}
          >
            {(k) => <RankList rows={b[k]} format={f.int} />}
          </Tabs>
        )}
      </Card>
      <Card title={tt.goals}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={d.goals} value={(r) => r.events} format={f.int} limit={14} />
        )}
      </Card>
      <Card title={tt.notFound}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={d.notFound} value={(r) => r.events} format={f.int} />
        )}
      </Card>
    </>
  );
}

function AudienceSection({ t, f, lang, traffic }) {
  const ta = t.audience;
  const d = traffic.data;
  const [focus, setFocus] = useState(null);
  if (traffic.error) return null;
  if (d && !d.configured) {
    return (
      <Card wide>
        <p className="dev-note">{t.traffic.notConfigured}</p>
      </Card>
    );
  }
  const loading = traffic.loading && !d;
  const b = d?.breakdowns ?? {};
  const countries = (b.country ?? []).map((r) => ({ code: r.name, visitors: r.visitors }));
  return (
    <>
      <Card title={ta.globe} wide tall>
        <div className="dev-globe-wrap">
          {loading ? (
            <Skeleton height={360} />
          ) : (
            <Suspense fallback={<Skeleton height={360} />}>
              <Globe countries={countries} lang={lang} focus={focus} label={ta.globe} />
            </Suspense>
          )}
          <div className="dev-globe-list">
            <h4>{ta.countries}</h4>
            {loading ? (
              <Skeleton />
            ) : (
              <RankList
                rows={b.country}
                name={(r) => countryName(r.name, lang)}
                format={f.int}
                limit={12}
                onHover={(r) => setFocus(r?.name ?? null)}
              />
            )}
          </div>
        </div>
      </Card>
      {[
        ['region', ta.regions],
        ['city', ta.cities],
        ['device', ta.devices],
        ['browser', ta.browsers],
        ['os', ta.os],
      ].map(([key, title]) => (
        <Card key={key} title={title}>
          {loading ? <Skeleton /> : <RankList rows={b[key]} format={f.int} limit={6} />}
        </Card>
      ))}
      <Card>
        <p className="dev-note">{ta.returning}</p>
      </Card>
    </>
  );
}

// MRR per day and plan, rebuilt from the subscriptions' start and end dates.
function mrrSeries(subs, range) {
  const days = daysBetween(range);
  return days.map((day) => {
    const end = new Date(`${day}T23:59:59`).getTime();
    const row = { day, solo: 0, firm: 0 };
    for (const s of subs) {
      if (!s.started_at || Date.parse(s.started_at) > end) continue;
      if (s.ended_at && Date.parse(s.ended_at) <= end) continue;
      if (['incomplete', 'incomplete_expired'].includes(s.status)) continue;
      const plan = s.plan === 'firm' ? 'firm' : 'solo';
      row[plan] += (s.amount ?? 0) / 100;
    }
    return row;
  });
}

function SubscriptionsSection({ t, f, lang, billing, traffic, range }) {
  const ts = t.subs;
  const d = billing.data;
  const [status, setStatus] = useState('all');
  const [plan, setPlan] = useState('all');
  const [query, setQuery] = useState('');
  if (billing.error) return <Failed t={t} error={billing.error} onRetry={billing.reload} />;
  const loading = billing.loading && !d;
  const subs = d?.subscriptions ?? [];
  const lifecycleKeys = Object.keys(ts.lifecycleKeys);
  const lifeColors = [C.green, C.gold, C.cognac, C.amber, C.red, C.blue, C.violet];

  // The funnel: Plausible's Checkout Redirect and Payment Return goals, then
  // the subscriptions Stripe created in the same period.
  const goal = (name) => traffic.data?.goals?.find((g) => g.name === name)?.events ?? 0;
  const created = (d?.lifecycle ?? []).reduce((n, r) => n + Number(r.created), 0);
  const funnel = [goal('Checkout Redirect'), goal('Payment Return'), created];

  // Plan changes, from the lifecycle the stripe-events function derived.
  const matrix = { solo: { solo: 0, firm: 0 }, firm: { solo: 0, firm: 0 } };
  for (const e of d?.events ?? []) {
    const from = e.derived?.plan_from;
    const to = e.derived?.plan_to;
    if (matrix[from] && to in (matrix[from] ?? {})) matrix[from][to]++;
  }

  const shownSubs = subs.filter(
    (s) =>
      (status === 'all' || s.status === status) &&
      (plan === 'all' || s.plan === plan) &&
      (!query || (s.email ?? '').toLowerCase().includes(query.toLowerCase())),
  );
  const statuses = [...new Set(subs.map((s) => s.status))];

  const label = (e) => {
    const make = t.events[e.type];
    const who = e.email ? (lang === 'ro' ? ` pentru ${e.email}` : ` for ${e.email}`) : '';
    if (!make) return e.type;
    return make({
      who,
      plan: PLAN_NAMES[e.plan] ?? e.plan ?? '—',
      lifecycle: e.derived?.lifecycle,
      end: f.dateLong(e.cancel_at ?? e.period_end),
      amount: f.money(e.amount),
    });
  };

  return (
    <>
      <Card title={ts.mrrByPlan} wide>
        {loading ? (
          <ChartFallback />
        ) : subs.length ? (
          <Suspense fallback={<ChartFallback />}>
            <StackedAreas
              data={mrrSeries(subs, range)}
              xKey="day"
              keys={[
                { key: 'solo', name: 'Solo', color: C.gold },
                { key: 'firm', name: 'Firm', color: C.blue },
              ]}
              tickFormat={f.tick}
              format={(v) => f.money(v * 100)}
            />
          </Suspense>
        ) : (
          <Empty>{ts.empty}</Empty>
        )}
      </Card>
      <Card title={ts.lifecycle} wide>
        {loading ? (
          <ChartFallback />
        ) : d.lifecycle?.length ? (
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={d.lifecycle.map((r) =>
                Object.fromEntries([
                  ['day', r.day],
                  ...lifecycleKeys.map((k) => [k, Number(r[k])]),
                ]),
              )}
              xKey="day"
              keys={lifecycleKeys.map((k, i) => ({
                key: k,
                name: ts.lifecycleKeys[k],
                color: lifeColors[i],
              }))}
              tickFormat={f.tick}
              format={f.int}
            />
          </Suspense>
        ) : (
          <Empty>{ts.empty}</Empty>
        )}
      </Card>
      <Card title={ts.funnel}>
        {loading ? (
          <Skeleton />
        ) : (
          <ol className="dev-funnel">
            {funnel.map((n, i) => (
              <li key={i}>
                <span
                  className="dev-funnel-bar"
                  style={{ width: `${(n / Math.max(1, funnel[0], ...funnel)) * 100}%` }}
                />
                <span>{ts.funnelSteps[i]}</span>
                <b className="dev-num">{f.int(n)}</b>
                {i > 0 && funnel[i - 1] > 0 && (
                  <small className="dev-num">{Math.round((n / funnel[i - 1]) * 100)}%</small>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card title={ts.changes}>
        {loading ? (
          <Skeleton />
        ) : (
          <table className="dev-matrix">
            <thead>
              <tr>
                <th>
                  {ts.from} ↓ / {ts.toPlan} →
                </th>
                <th>Solo</th>
                <th>Firm</th>
              </tr>
            </thead>
            <tbody>
              {['solo', 'firm'].map((from) => (
                <tr key={from}>
                  <th>{PLAN_NAMES[from]}</th>
                  {['solo', 'firm'].map((to) => (
                    <td key={to} className={from === to ? 'is-diagonal' : undefined}>
                      {from === to ? '—' : f.int(matrix[from][to])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Card
        title={ts.current}
        wide
        aside={
          <div className="dev-filters">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label={ts.cols.status}
            >
              <option value="all">{ts.all}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              aria-label={ts.cols.plan}
            >
              <option value="all">{ts.all}</option>
              <option value="solo">Solo</option>
              <option value="firm">Firm</option>
            </select>
            <input
              type="search"
              value={query}
              placeholder={ts.search}
              aria-label={ts.search}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        }
      >
        {loading ? (
          <Skeleton />
        ) : shownSubs.length ? (
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  {Object.values(ts.cols).map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownSubs.map((s) => (
                  <tr key={s.subscription_id}>
                    <td>{s.email ?? <code>{s.customer_id}</code>}</td>
                    <td className={s.plan === 'solo' ? 'is-featured' : undefined}>
                      {PLAN_NAMES[s.plan] ?? '—'}
                    </td>
                    <td>
                      <span className={`dev-status is-${s.status}`}>{s.status}</span>
                    </td>
                    <td>{f.dateLong(s.current_period_end)}</td>
                    <td>{s.cancel_at_period_end ? '✓' : ''}</td>
                    <td className="dev-num">{f.money(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{ts.empty}</Empty>
        )}
      </Card>
      <Card title={ts.events} wide>
        {loading ? (
          <Skeleton />
        ) : d.events?.length ? (
          <ol className="dev-timeline">
            {d.events.slice(0, 40).map((e) => (
              <li
                key={e.id}
                className={`is-${e.type.split('.')[0]} ${e.type.includes('failed') ? 'is-bad' : ''}`}
              >
                <time className="dev-num">{f.dateTime(e.created_at)}</time>
                <span>{label(e)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty>{ts.empty}</Empty>
        )}
      </Card>
    </>
  );
}

function AccountsSection({ t, f, accounts, range }) {
  const ta = t.accounts;
  const d = accounts.data;
  if (accounts.error) return <Failed t={t} error={accounts.error} onRetry={accounts.reload} />;
  const loading = accounts.loading && !d;
  const byDay = new Map(
    (d?.signupsDaily ?? []).map((r) => [String(r.day).slice(0, 10), Number(r.signups)]),
  );
  const series = daysBetween(range).map((day) => ({ day, signups: byDay.get(day) ?? 0 }));
  const toRows = (obj, names) =>
    Object.entries(obj ?? {})
      .map(([k, v]) => ({ name: names?.[k] ?? k, visitors: v }))
      .sort((a, b) => b.visitors - a.visitors);
  return (
    <>
      <Card wide>
        <div className="dev-kpis">
          {loading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} height={70} />)
          ) : (
            <>
              <Kpi label={ta.total} value={d.total} format={f.int} />
              <Kpi label={ta.newsletter} value={d.newsletter} format={f.int} />
              <Kpi label={ta.mismatch} value={d.planMismatch} format={f.int} />
            </>
          )}
        </div>
      </Card>
      <Card title={ta.signups} wide>
        {loading ? (
          <ChartFallback />
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={series}
              xKey="day"
              keys={[{ key: 'signups', name: ta.signups, color: C.gold }]}
              tickFormat={f.tick}
              format={f.int}
              height={200}
            />
          </Suspense>
        )}
      </Card>
      <Card title={ta.providers}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={toRows(d.providers, ta.providerNames)} format={f.int} />
        )}
      </Card>
      <Card title={ta.plans}>
        {loading ? <Skeleton /> : <RankList rows={toRows(d.plans, ta.planNames)} format={f.int} />}
      </Card>
      <Card title={ta.versions}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={toRows(d.versions, { none: ta.none })} format={f.int} />
        )}
      </Card>
      <Card title={ta.recency}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList
            rows={Object.entries(d.recency).map(([k, v]) => ({
              name: ta.recencyNames[k],
              visitors: v,
            }))}
            format={f.int}
          />
        )}
      </Card>
    </>
  );
}

function DownloadsSection({ t, f, downloads }) {
  const td = t.downloads;
  const d = downloads.data;
  if (downloads.error) return <Failed t={t} error={downloads.error} onRetry={downloads.reload} />;
  const loading = downloads.loading && !d;
  if (!loading && !d?.releases?.length) {
    return (
      <Card wide>
        <Empty>{td.empty}</Empty>
      </Card>
    );
  }
  return (
    <>
      <Card title={td.title} wide>
        {loading ? (
          <ChartFallback />
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={[...d.releases].reverse().map((r) => ({ v: r.version, ...r.byPlatform }))}
              xKey="v"
              keys={[
                { key: 'windows', name: td.windows, color: C.blue },
                { key: 'mac', name: td.mac, color: C.gold },
              ]}
              format={f.int}
            />
          </Suspense>
        )}
      </Card>
      <Card wide>
        {loading ? (
          <Skeleton />
        ) : (
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  <th>{td.release}</th>
                  <th>{td.date}</th>
                  <th>{td.windows}</th>
                  <th>{td.mac}</th>
                  <th>{td.total}</th>
                </tr>
              </thead>
              <tbody>
                {d.releases.map((r) => (
                  <tr key={r.version}>
                    <td>{r.version}</td>
                    <td>{f.dateLong(r.date)}</td>
                    <td className="dev-num">{f.int(r.byPlatform.windows)}</td>
                    <td className="dev-num">{f.int(r.byPlatform.mac)}</td>
                    <td className="dev-num">{f.int(r.byPlatform.windows + r.byPlatform.mac)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2}>{td.total}</th>
                  <td className="dev-num">{f.int(d.totals.windows)}</td>
                  <td className="dev-num">{f.int(d.totals.mac)}</td>
                  <td className="dev-num">{f.int(d.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function HealthSection({ t, f, health }) {
  const th = t.health;
  const d = health.data;
  if (health.error) return <Failed t={t} error={health.error} onRetry={health.reload} />;
  if (health.loading && !d) return <Skeleton />;
  return (
    <>
      {d.usageDebug && (
        <Card wide>
          <p className="dev-warning" role="alert">
            {th.usageDebug}
          </p>
        </Card>
      )}
      <Card title={th.stripe}>
        <span className={`dev-badge is-${d.stripeMode ?? 'unknown'}`}>
          {d.stripeMode === 'live' ? th.live : d.stripeMode === 'test' ? th.test : th.unknown}
        </span>
        <dl className="dev-dl">
          <div>
            <dt>{th.lastEvent}</dt>
            <dd>
              {d.lastEvent
                ? `${f.dateTime(d.lastEvent.received_at)} · ${d.lastEvent.type}`
                : th.never}
            </dd>
          </div>
          <div>
            <dt>{th.plausible}</dt>
            <dd>{d.plausibleConfigured ? th.yes : th.no}</dd>
          </div>
          <div>
            <dt>{th.github}</dt>
            <dd>{d.githubToken ? th.yes : th.no}</dd>
          </div>
        </dl>
      </Card>
      <Card title={th.functions}>
        <ul className="dev-fns">
          {d.functions.map((fn) => (
            <li key={fn.name}>
              <i className={fn.ok ? 'is-ok' : 'is-bad'} aria-hidden="true" />
              <code>{fn.name}</code>
              <span className="dev-num">{fn.status ?? '—'}</span>
              <span className="dev-num">{fn.ms} ms</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

// ---- the page ---------------------------------------------------------------

function Dashboard({ t, lang, token }) {
  const f = useFormat(t.locale);
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState(() => presetRange('30d'));
  const [compare, setCompare] = useState(true);
  const [auto, setAuto] = useState(true);
  const range = preset === 'custom' ? custom : presetRange(preset);
  const rangeKey = `${range.from}:${range.to}`;
  const body = { range, compare };

  const health = useAction(token, 'health', {}, []);
  const live = useAction(token, 'live', {}, []);
  const traffic = useAction(token, 'traffic', body, [rangeKey, compare]);
  const billing = useAction(token, 'billing', body, [rangeKey]);
  const accounts = useAction(token, 'accounts', body, [rangeKey]);
  const downloads = useAction(token, 'downloads', {}, []);
  const [lastUpdated, setLastUpdated] = useState(null);

  // The live tiles every minute, while the tab is visible.
  const reloadLive = live.reload;
  useEffect(() => {
    if (live.data) setLastUpdated(new Date());
  }, [live.data]);
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      if (!document.hidden) reloadLive();
    }, LIVE_EVERY);
    return () => clearInterval(id);
  }, [auto]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshAll = useCallback(() => {
    [health, live, traffic, billing, accounts, downloads].forEach((a) => a.reload());
  }, [health, live, traffic, billing, accounts, downloads]);

  return (
    <div className="dev-wrap">
      <header className="dev-top">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h1 className="display">{t.title}</h1>
        </div>
        <div className="dev-controls">
          <div className="dev-segment" role="radiogroup" aria-label="Range">
            {Object.entries(t.ranges).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={preset === key}
                onClick={() => setPreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="dev-custom">
              <label>
                <span>{t.from}</span>
                <input
                  type="date"
                  value={custom.from}
                  max={custom.to}
                  onChange={(e) =>
                    e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))
                  }
                />
              </label>
              <label>
                <span>{t.to}</span>
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from}
                  max={localDay(new Date())}
                  onChange={(e) =>
                    e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
          <label className="dev-toggle">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            <span>{t.compare}</span>
          </label>
          <label className="dev-toggle">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            <span>{t.autoRefresh}</span>
          </label>
          <button type="button" className="btn is-outline is-small" onClick={refreshAll}>
            {t.refresh}
          </button>
        </div>
      </header>

      <LiveStrip t={t} f={f} live={live} lastUpdated={lastUpdated} />

      <nav className="dev-jump" aria-label="Sections">
        {Object.entries(t.sections).map(([key, label]) => (
          <a key={key} href={`#${key}`}>
            {label}
          </a>
        ))}
      </nav>

      <Section id="traffic" title={t.sections.traffic}>
        <TrafficSection t={t} f={f} traffic={traffic} compare={compare} />
      </Section>
      <Section id="audience" title={t.sections.audience}>
        <AudienceSection t={t} f={f} lang={lang} traffic={traffic} />
      </Section>
      <Section id="subscriptions" title={t.sections.subscriptions}>
        <SubscriptionsSection
          t={t}
          f={f}
          lang={lang}
          billing={billing}
          traffic={traffic}
          range={range}
        />
      </Section>
      <Section id="accounts" title={t.sections.accounts}>
        <AccountsSection t={t} f={f} accounts={accounts} range={range} />
      </Section>
      <Section id="downloads" title={t.sections.downloads}>
        <DownloadsSection t={t} f={f} downloads={downloads} />
      </Section>
      <Section id="health" title={t.sections.health}>
        <HealthSection t={t} f={f} health={health} />
      </Section>
    </div>
  );
}

// Signed out: a short note. Signed in: the dashboard if the admin function
// answers, the 404 page if it does not (not an admin).
export default function Dev() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const session = useSession();
  const token = session?.access_token ?? null;
  const [access, setAccess] = useState('checking');

  useEffect(() => {
    if (!token || !ENDPOINT) return;
    let alive = true;
    call(token, 'health')
      .then(() => alive && setAccess('admin'))
      .catch((e) => alive && setAccess(e.notFound ? 'denied' : 'admin'));
    return () => {
      alive = false;
    };
  }, [token]);

  let content;
  if (!ENDPOINT) content = <p className="callout">{t.unavailable}</p>;
  else if (session === undefined || (session && access === 'checking')) {
    content = <p className="dev-empty">{t.loading}</p>;
  } else if (session === null) {
    content = (
      <div className="dev-signed-out">
        <p>{t.signedOut}</p>
        <a className="btn is-outline" href="/autentificare.html#autentificare">
          {t.signIn}
        </a>
      </div>
    );
  } else if (access === 'denied') {
    return (
      <Layout page="404" mainClassName="wrap">
        <NotFoundContent />
      </Layout>
    );
  } else {
    content = <Dashboard t={t} lang={lang} token={token} />;
  }

  return (
    <Layout page="dev" overlay mainClassName="dev">
      {content}
    </Layout>
  );
}
