import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { NotFoundContent } from './NotFound.jsx';
import { countryName } from '../components/dev/countries.js';
import { countyName } from '../components/dev/counties.js';
import { useLang, useMeta } from '../i18n.jsx';
import { useSession } from '../useSession.js';
import { authHref, validUrl } from '../auth.js';

// The admin dashboard (dev.html): website traffic (Plausible), subscriptions
// (Stripe, through the stripe-events log), accounts, downloads and health,
// all from the admin Edge Function, which answers admins only. Not linked
// from anywhere and not indexed; anyone who is not an admin sees the 404
// page. The charts (Recharts) and the world map load only here.

const lazyChart = (name) =>
  lazy(() => import('../components/dev/Charts.jsx').then((m) => ({ default: m[name] })));
const TrafficChart = lazyChart('TrafficChart');
const Donut = lazyChart('Donut');
const StackedBars = lazyChart('StackedBars');
const StackedAreas = lazyChart('StackedAreas');
const WorldMap = lazy(() => import('../components/dev/WorldMap.jsx'));

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
      app: 'Utilizatori ai aplicației azi',
    },
    sections: {
      insights: 'Esențial',
      traffic: 'Trafic',
      audience: 'Public',
      subscriptions: 'Abonamente',
      accounts: 'Conturi',
      app: 'Aplicația',
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
      world: 'Lumea',
      regionsIn: (country) => `${country}, pe regiuni`,
      noRegions: 'Fără regiuni pe hartă pentru această țară.',
      mapHint: 'Apasă o țară pentru regiunile ei.',
      counties: 'România, pe județe',
      countries: 'Țări',
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
      gender: 'Gen',
      age: 'Vârstă',
      genderNames: { female: 'Feminin', male: 'Masculin', other: 'Altul', unknown: 'Nespecificat' },
      ageUnknown: 'Nespecificat',
      paying: 'Plătesc',
      free: 'Nu plătesc',
      demographicsNote: (given, total) =>
        `${given} din ${total} conturi și-au completat genul sau anul nașterii (opțional, pe site sau în aplicație).`,
      recencyNames: {
        '24h': 'Ultimele 24 h',
        '7d': 'Ultimele 7 zile',
        '30d': 'Ultimele 30 de zile',
        older: 'Mai demult',
        never: 'Niciodată',
      },
    },
    views: { dashboard: 'Panou', reports: 'Rapoarte', settings: 'Setări' },
    reports: {
      title: 'Rapoarte',
      soon: 'Rapoartele trimise din aplicație vor apărea aici, după ce aplicația începe să le trimită.',
      report: (id) => `Raportul ${id}`,
    },
    settingsTitle: 'Setări',
    notif: {
      title: 'Notificări pe acest dispozitiv',
      unsupported: 'Acest browser nu poate primi notificări push.',
      ios: 'Pe iPhone, adaugă mai întâi panoul pe ecranul principal: Safari › Partajează › Adaugă pe ecranul principal, apoi deschide-l din pictogramă și revino aici.',
      notConfigured: 'Notificările nu sunt configurate (lipsește VITE_VAPID_PUBLIC_KEY).',
      denied:
        'Notificările sunt blocate pentru acest site. Permite-le din setările browserului, apoi reîncarcă.',
      on: 'Activate pe acest dispozitiv.',
      off: 'Nu sunt activate pe acest dispozitiv.',
      label: 'Numele dispozitivului',
      enable: 'Activează pe acest dispozitiv',
      disable: 'Dezactivează aici',
      test: 'Trimite o notificare de test',
      tested: (n) =>
        n
          ? `Trimisă către ${n} ${n === 1 ? 'dispozitiv' : 'dispozitive'}.`
          : 'Niciun dispozitiv activat.',
      failed: 'Nu a mers:',
      devices: 'Dispozitive',
      none: 'Niciun dispozitiv încă.',
      thisDevice: 'acesta',
      remove: 'Elimină',
      lastUsed: 'ultima notificare',
      never: 'niciuna încă',
      failures: (n) => `${n} eșecuri`,
    },
    assistant: {
      title: 'Întreabă despre cifre',
      placeholder: 'De exemplu: de ce au scăzut abonamentele luna asta?',
      send: 'Trimite',
      thinking: 'Analizez datele…',
      failed: 'Nu am putut obține un răspuns.',
      refused: 'Asistentul nu poate răspunde la această întrebare.',
      truncated: 'Răspunsul a fost tăiat (prea lung).',
      clear: 'Conversație nouă',
      note: 'Răspunde Claude (Anthropic) din cifrele intervalului ales, citite chiar acum. Adresele de e-mail nu îi sunt trimise.',
      suggestions: [
        'Cum stăm cu abonamentele și ce ar trebui să urmăresc?',
        'Unde pierdem cei mai mulți oameni pe drumul spre abonament?',
        'Este AI-ul profitabil pe fiecare plan?',
      ],
    },
    insights: {
      funnel: 'Drumul până la abonament',
      funnelNote:
        'Primele trei sunt totaluri pe interval. Următoarele urmăresc conturile create în interval: câte au deschis aplicația, au întrebat AI-ul și s-au abonat (până azi).',
      steps: {
        visitors: 'Vizitatori pe site',
        downloadClicks: 'Au apăsat Descarcă',
        installs: 'Instalări noi',
        accounts: 'Conturi create',
        inApp: 'Au intrat în aplicație',
        askedAi: 'Au întrebat AI-ul',
        paid: 'S-au abonat',
      },
      ofPrevious: 'din pasul anterior',
      daysToAi: 'Zile până la prima întrebare AI (mediană)',
      daysToPaid: 'Zile până la abonament (mediană)',
      retention: 'Retenție pe săptămâna de început',
      retentionNote:
        'Instalări grupate după săptămâna în care au apărut; fiecare coloană arată ce parte a folosit aplicația în săptămâna respectivă. Ultimele 8 săptămâni, indiferent de interval.',
      cohort: 'Săptămâna',
      size: 'Instalări',
      week: (n) => `S${n}`,
      noRetention: 'Încă nicio instalare cu statistici.',
      cost: 'Costul AI pe plan',
      costNote: (rate, date) =>
        `Prețuri de listă Claude, fără reducerile de cache, deci o estimare maximă. Venitul este MRR-ul abonamentelor active, proporțional cu intervalul.${rate ? ` 1 USD = ${rate} lei (BNR, ${date}).` : ''}`,
      plan: 'Plan',
      planNames: { trial: 'Probă', standard: 'Solo', pro: 'Firm' },
      aiUsers: 'Folosesc AI',
      tokens: 'Tokeni',
      costUsd: 'Cost AI (USD)',
      costLei: 'Cost AI (lei)',
      subscribers: 'Abonați',
      revenue: 'Venit (lei)',
      margin: 'Marjă (lei)',
      perUser: 'Cost / utilizator',
      top: 'Cele mai costisitoare conturi',
      account: 'Cont',
      requests: 'Cereri',
      unknown: 'Necunoscut',
      noCost: 'Nicio utilizare AI în interval.',
      unpriced: (list) => `Modele fără preț cunoscut (necalculate): ${list}.`,
      subs: 'Sănătatea abonamentelor',
      paying: 'Abonați plătitori',
      mrr: 'MRR',
      arpu: 'Venit mediu / abonat',
      churn: 'Rată lunară de renunțare',
      ltv: 'Valoare pe viață (estimată)',
      joined: 'Abonamente noi',
      left: 'Abonamente încheiate',
      atStart: (n) => `${n} active la începutul intervalului`,
      reasons: 'De ce renunță',
      reasonNames: {
        too_expensive: 'Prea scump',
        missing_features: 'Lipsesc funcții',
        switched_service: 'A trecut la alt serviciu',
        unused: 'Nu îl folosește',
        customer_service: 'Asistența',
        too_complex: 'Prea complicat',
        low_quality: 'Calitate slabă',
        other: 'Altceva',
      },
      noReasons:
        'Niciun motiv înregistrat. Stripe le colectează doar dacă e activat în portalul clienților (Settings › Billing › Customer portal › Cancellations › „Collect cancellation reasons”).',
      subsNote:
        'Rata de renunțare: abonamente încheiate în interval față de cele active la început, adusă la 30 de zile. Valoarea pe viață = venit mediu / rata lunară.',
      releases: 'Fiabilitate pe versiuni',
      version: 'Versiune',
      firstSeen: 'Apărută',
      sessions: 'Sesiuni',
      clean: 'Fără erori',
      crashes: 'Ferestre căzute',
      noReleases: 'Încă nicio sesiune cu statistici în interval.',
      law: 'Sursele juridice',
      tool: 'Sursă',
      toolNames: {
        search_legislation: 'Legislație',
        search_eu_law: 'Dreptul UE',
        search_court_cases: 'Jurisprudență',
        lookup_company: 'Firme',
        search_lawyers: 'Avocați',
      },
      calls: 'Căutări',
      failed: 'Eșuate',
      slow: 'Peste 30 s',
      failuresDaily: 'Căutări eșuate pe zi',
      lawErrors: 'Cereri AI eșuate, pe tip',
      noLaw: 'Nicio căutare în sursele juridice în interval.',
    },
    app: {
      empty:
        'Încă nicio statistică de la aplicație. Apar după ce cineva folosește versiunea 1.2.0 sau mai nouă, cu statisticile anonime pornite.',
      dau: 'Utilizatori azi',
      wau: 'Utilizatori în 7 zile',
      mau: 'Utilizatori în 30 de zile',
      sessions: 'Sesiuni în interval',
      allSessions: 'Sesiuni',
      median: 'Sesiune mediană (min)',
      active: 'Utilizatori activi pe zi',
      features: 'Funcții folosite',
      featureNames: {
        project: 'Proiecte',
        file: 'Fișiere',
        viewer: 'Vizualizator',
        convert: 'Conversii',
        scan: 'Scanări',
        print: 'Tipărire',
        trash: 'Coș de gunoi',
        portal: 'Import de pe telefon',
        law: 'Cercetare juridică (AI)',
        update: 'Actualizări',
        error: 'Erori',
      },
      ai: 'Tokeni AI pe zi, pe model',
      aiRequests: 'Cereri AI',
      aiTokens: 'Tokeni AI',
      atLimit: 'Limite atinse',
      limitNames: {
        session: 'Sesiune (5 h)',
        weekly: 'Săptămânal',
        fable: 'Fable',
        trial: 'Perioadă de probă',
      },
      versions: 'Versiuni instalate (30 de zile)',
      updates: 'Actualizări în interval',
      updateNames: {
        available: 'Găsite',
        downloaded: 'Descărcate',
        install_started: 'Instalare pornită',
        installed: 'Instalate',
        failed: 'Eșuate',
      },
      events: 'Evenimente',
      errors: 'Erori recente',
      noErrors: 'Nicio eroare.',
      error: 'Eroare',
      where: 'Unde',
      count: 'De câte ori',
      users: 'Utilizatori',
      lastSeen: 'Ultima dată',
      accounts: 'Conturi în aplicație',
      email: 'Cont',
      plan: 'Plan',
      version: 'Versiune',
      aiRounds: 'Cereri AI',
      anonymous: 'Necunoscut',
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
      alerts: 'Alerte pe telefon',
      alertsOff: 'Alertele nu sunt configurate (NTFY_TOPIC).',
      alertsHow:
        'Instalează aplicația ntfy (Android sau iOS), apasă + și abonează-te la subiectul:',
      alertsOpen: 'Deschide în ntfy',
      testAlert: 'Trimite o alertă de test',
      testSent: 'Trimisă. Ar trebui să apară pe telefon în câteva secunde.',
      testFailed: 'Alerta de test nu a putut fi trimisă.',
      recentAlerts: 'Ultimele alerte',
      noAlerts: 'Nicio alertă încă. Verificarea rulează la fiecare 10 minute.',
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
      app: 'App users today',
    },
    sections: {
      insights: 'Key metrics',
      traffic: 'Traffic',
      audience: 'Audience',
      subscriptions: 'Subscriptions',
      accounts: 'Accounts',
      app: 'App',
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
      world: 'World',
      regionsIn: (country) => `${country}, by region`,
      noRegions: 'No regions on the map for this country.',
      mapHint: 'Click a country to see its regions.',
      counties: 'Romania, by county',
      countries: 'Countries',
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
      gender: 'Gender',
      age: 'Age',
      genderNames: { female: 'Female', male: 'Male', other: 'Other', unknown: 'Not given' },
      ageUnknown: 'Not given',
      paying: 'Paying',
      free: 'Not paying',
      demographicsNote: (given, total) =>
        `${given} of ${total} accounts gave their gender or year of birth (optional, on the site or in the app).`,
      recencyNames: {
        '24h': 'Last 24 h',
        '7d': 'Last 7 days',
        '30d': 'Last 30 days',
        older: 'Older',
        never: 'Never',
      },
    },
    views: { dashboard: 'Dashboard', reports: 'Reports', settings: 'Settings' },
    reports: {
      title: 'Reports',
      soon: 'Reports sent from the app will appear here once the app starts sending them.',
      report: (id) => `Report ${id}`,
    },
    settingsTitle: 'Settings',
    notif: {
      title: 'Notifications on this device',
      unsupported: "This browser can't receive push notifications.",
      ios: 'On iPhone, first add the dashboard to the Home Screen: Safari › Share › Add to Home Screen, then open it from the icon and come back here.',
      notConfigured: 'Notifications are not configured (VITE_VAPID_PUBLIC_KEY is missing).',
      denied:
        "Notifications are blocked for this site. Allow them in the browser's settings, then reload.",
      on: 'On for this device.',
      off: 'Not on for this device.',
      label: 'Device name',
      enable: 'Enable on this device',
      disable: 'Turn off here',
      test: 'Send a test notification',
      tested: (n) => (n ? `Sent to ${n} device${n === 1 ? '' : 's'}.` : 'No device enabled.'),
      failed: "Didn't work:",
      devices: 'Devices',
      none: 'No devices yet.',
      thisDevice: 'this one',
      remove: 'Remove',
      lastUsed: 'last notification',
      never: 'none yet',
      failures: (n) => `${n} failures`,
    },
    assistant: {
      title: 'Ask about the metrics',
      placeholder: 'For example: why did subscriptions drop this month?',
      send: 'Send',
      thinking: 'Analysing the data…',
      failed: 'Could not get an answer.',
      refused: "The assistant can't answer this question.",
      truncated: 'The answer was cut off (too long).',
      clear: 'New conversation',
      note: "Answered by Claude (Anthropic) from the selected range's numbers, read just now. Email addresses are not sent to it.",
      suggestions: [
        'How are subscriptions doing, and what should I watch?',
        'Where do we lose the most people on the way to paying?',
        'Is the AI profitable on each plan?',
      ],
    },
    insights: {
      funnel: 'The path to paying',
      funnelNote:
        'The first three are totals for the range. The rest follow the accounts created in the range: how many opened the app, asked the AI and subscribed (up to today).',
      steps: {
        visitors: 'Website visitors',
        downloadClicks: 'Clicked Download',
        installs: 'New installs',
        accounts: 'Accounts created',
        inApp: 'Opened the app',
        askedAi: 'Asked the AI',
        paid: 'Subscribed',
      },
      ofPrevious: 'of the step before',
      daysToAi: 'Days to first AI question (median)',
      daysToPaid: 'Days to subscribing (median)',
      retention: 'Retention by start week',
      retentionNote:
        'Installs grouped by the week they first appeared; each column shows the share that used the app in that week. The last 8 weeks, whatever the range.',
      cohort: 'Week of',
      size: 'Installs',
      week: (n) => `W${n}`,
      noRetention: 'No installs with statistics yet.',
      cost: 'AI cost per plan',
      costNote: (rate, date) =>
        `Claude list prices, before prompt-cache discounts, so an upper estimate. Revenue is the active subscriptions' MRR, prorated to the range.${rate ? ` 1 USD = ${rate} lei (BNR, ${date}).` : ''}`,
      plan: 'Plan',
      planNames: { trial: 'Trial', standard: 'Solo', pro: 'Firm' },
      aiUsers: 'Use AI',
      tokens: 'Tokens',
      costUsd: 'AI cost (USD)',
      costLei: 'AI cost (lei)',
      subscribers: 'Subscribers',
      revenue: 'Revenue (lei)',
      margin: 'Margin (lei)',
      perUser: 'Cost / user',
      top: 'Costliest accounts',
      account: 'Account',
      requests: 'Requests',
      unknown: 'Unknown',
      noCost: 'No AI usage in the range.',
      unpriced: (list) => `Models with no known price (not counted): ${list}.`,
      subs: 'Subscription health',
      paying: 'Paying subscribers',
      mrr: 'MRR',
      arpu: 'Revenue per subscriber',
      churn: 'Monthly churn',
      ltv: 'Lifetime value (estimate)',
      joined: 'New subscriptions',
      left: 'Ended subscriptions',
      atStart: (n) => `${n} active when the range began`,
      reasons: 'Why people cancel',
      reasonNames: {
        too_expensive: 'Too expensive',
        missing_features: 'Missing features',
        switched_service: 'Switched to another service',
        unused: "Doesn't use it",
        customer_service: 'Customer service',
        too_complex: 'Too complex',
        low_quality: 'Low quality',
        other: 'Other',
      },
      noReasons:
        'No reasons recorded. Stripe collects them only when the customer portal asks (Settings › Billing › Customer portal › Cancellations › "Collect cancellation reasons").',
      subsNote:
        'Churn: subscriptions ended in the range against those active when it began, scaled to 30 days. Lifetime value = revenue per subscriber / monthly churn.',
      releases: 'Reliability per release',
      version: 'Version',
      firstSeen: 'First seen',
      sessions: 'Sessions',
      clean: 'Error-free',
      crashes: 'Window crashes',
      noReleases: 'No sessions with statistics in the range yet.',
      law: 'Legal sources',
      tool: 'Source',
      toolNames: {
        search_legislation: 'Legislation',
        search_eu_law: 'EU law',
        search_court_cases: 'Court cases',
        lookup_company: 'Companies',
        search_lawyers: 'Lawyers',
      },
      calls: 'Searches',
      failed: 'Failed',
      slow: 'Over 30 s',
      failuresDaily: 'Failed searches per day',
      lawErrors: 'Failed AI requests, by kind',
      noLaw: 'No searches of the legal sources in the range.',
    },
    app: {
      empty:
        'No statistics from the app yet. They appear once someone uses version 1.2.0 or later with anonymous statistics on.',
      dau: 'Users today',
      wau: 'Users, 7 days',
      mau: 'Users, 30 days',
      sessions: 'Sessions in range',
      allSessions: 'Sessions',
      median: 'Median session (min)',
      active: 'Active users per day',
      features: 'Features used',
      featureNames: {
        project: 'Projects',
        file: 'Files',
        viewer: 'Viewer',
        convert: 'Conversions',
        scan: 'Scans',
        print: 'Printing',
        trash: 'Recycle Bin',
        portal: 'Phone import',
        law: 'Law research (AI)',
        update: 'Updates',
        error: 'Errors',
      },
      ai: 'AI tokens per day, by model',
      aiRequests: 'AI requests',
      aiTokens: 'AI tokens',
      atLimit: 'Limits reached',
      limitNames: {
        session: 'Session (5 h)',
        weekly: 'Weekly',
        fable: 'Fable',
        trial: 'Trial',
      },
      versions: 'Installed versions (30 days)',
      updates: 'Updates in range',
      updateNames: {
        available: 'Found',
        downloaded: 'Downloaded',
        install_started: 'Install started',
        installed: 'Installed',
        failed: 'Failed',
      },
      events: 'Events',
      errors: 'Recent errors',
      noErrors: 'No errors.',
      error: 'Error',
      where: 'Where',
      count: 'Times',
      users: 'Users',
      lastSeen: 'Last seen',
      accounts: 'Accounts in the app',
      email: 'Account',
      plan: 'Plan',
      version: 'Version',
      aiRounds: 'AI requests',
      anonymous: 'Unknown',
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
      alerts: 'Phone alerts',
      alertsOff: 'Alerts are not configured (NTFY_TOPIC).',
      alertsHow: 'Install the ntfy app (Android or iOS), tap + and subscribe to the topic:',
      alertsOpen: 'Open in ntfy',
      testAlert: 'Send a test alert',
      testSent: 'Sent. It should appear on your phone within seconds.',
      testFailed: 'The test alert could not be sent.',
      recentAlerts: 'Recent alerts',
      noAlerts: 'No alerts yet. The check runs every 10 minutes.',
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
    const compact = new Intl.NumberFormat(locale, { notation: 'compact' });
    return {
      compact: (v) => (v === null || v === undefined ? '—' : compact.format(v)),
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
  onSelect,
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
          onClick={onSelect ? () => onSelect(r) : undefined}
          className={onSelect ? 'is-selectable' : undefined}
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
    { key: 'app', value: d?.appUsersToday ?? null, format: f.int },
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

// Key metrics: the path to paying, retention by start week, and what the AI
// costs per plan against what the plan brings in.
// Answers: paragraphs at blank lines, "- " lines as lists, **bold**.
function Bold({ text }) {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part,
    );
}

function Rich({ text }) {
  return text.split(/\n{2,}/).map((block, j) => {
    const lines = block.split('\n').filter((l) => l.trim());
    const isItem = (l) => /^\s*([-•*]|\d+\.)\s+/.test(l);
    const items = lines.filter(isItem);
    const lead = lines.filter((l) => !isItem(l)).map((l) => l.replace(/^#+\s*/, ''));
    return (
      <div key={j}>
        {lead.length > 0 && (
          <p>
            <Bold text={lead.join(' ')} />
          </p>
        )}
        {items.length > 0 && (
          <ul>
            {items.map((l, k) => (
              <li key={k}>
                <Bold text={l.replace(/^\s*([-•*]|\d+\.)\s+/, '')} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  });
}

// Questions about the metrics, answered by Claude from a fresh snapshot of
// the selected range (the admin function's `ask` action).
function Assistant({ t, token, range, lang }) {
  const ta = t.assistant;
  const [turns, setTurns] = useState([]);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const log = useRef(null);

  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [turns, busy]);

  async function ask(text) {
    const q = text.trim();
    if (!q || busy) return;
    setQuestion('');
    setError(null);
    const history = turns.filter((x) => x.content);
    setTurns([...history, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const r = await call(token, 'ask', { range, question: q, history, lang });
      if (r.refused) setError(ta.refused);
      else if (!r.answer) setError(ta.failed);
      else
        setTurns((list) => [
          ...list,
          { role: 'assistant', content: r.answer, truncated: r.truncated },
        ]);
    } catch (err) {
      setError(`${ta.failed} ${err.message ?? ''}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dev-card is-wide dev-assistant" aria-label={ta.title}>
      <header className="dev-card-head">
        <h3>{ta.title}</h3>
        {turns.length > 0 && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setTurns([]);
              setError(null);
            }}
          >
            {ta.clear}
          </button>
        )}
      </header>
      {turns.length > 0 && (
        <div className="dev-chat" ref={log} aria-live="polite">
          {turns.map((x, i) => (
            <div key={i} className={`dev-msg is-${x.role}`}>
              {x.role === 'user' ? <p>{x.content}</p> : <Rich text={x.content} />}
              {x.truncated && <p className="dev-note">{ta.truncated}</p>}
            </div>
          ))}
          {busy && <div className="dev-msg is-assistant is-thinking">{ta.thinking}</div>}
        </div>
      )}
      {error && <p className="dev-warning">{error}</p>}
      {turns.length === 0 && (
        <div className="dev-suggest">
          {ta.suggestions.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="dev-ask"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={ta.placeholder}
          aria-label={ta.title}
          maxLength={2000}
        />
        <button type="submit" className="btn is-small" disabled={busy || !question.trim()}>
          {ta.send}
        </button>
      </form>
      <p className="dev-note">{ta.note}</p>
    </section>
  );
}

function InsightsSection({ t, f, insights }) {
  const ti = t.insights;
  const d = insights.data;
  if (insights.error) return <Failed t={t} error={insights.error} onRetry={insights.reload} />;
  const loading = insights.loading && !d;
  return (
    <>
      <Card title={ti.funnel} wide>
        {loading ? <Skeleton height={300} /> : <Funnel ti={ti} f={f} funnel={d.funnel} />}
      </Card>
      <Card title={ti.retention} wide>
        {loading ? <Skeleton /> : <Retention ti={ti} f={f} rows={d.retention} />}
      </Card>
      <Card title={ti.cost} wide>
        {loading ? <Skeleton /> : <AiCost t={t} ti={ti} f={f} cost={d.cost} />}
      </Card>
      <Card title={ti.subs} wide>
        {loading ? <Skeleton /> : <SubscriptionHealth ti={ti} f={f} subs={d.subscriptions} />}
      </Card>
      <Card title={ti.releases} wide>
        {loading ? <Skeleton /> : <Releases ti={ti} f={f} releases={d.releases} />}
      </Card>
      <Card title={ti.law} wide>
        {loading ? <Skeleton /> : <LegalSources ti={ti} f={f} law={d.law} />}
      </Card>
    </>
  );
}

function Funnel({ ti, f, funnel }) {
  const groups = [
    ['visitors', 'downloadClicks', 'installs'],
    ['accounts', 'inApp', 'askedAi', 'paid'],
  ];
  return (
    <>
      <div className="dev-path">
        {groups.map((keys, g) => {
          const top = Math.max(1, ...keys.map((k) => funnel[k] ?? 0));
          return (
            <ol key={g}>
              {keys.map((k, i) => {
                const value = funnel[k];
                const before = i ? funnel[keys[i - 1]] : null;
                const pct = i && before ? (value / before) * 100 : null;
                return (
                  <li key={k}>
                    <span
                      className="dev-rank-bar"
                      style={{ width: `${((value ?? 0) / top) * 100}%` }}
                    />
                    <span className="dev-rank-name">{ti.steps[k]}</span>
                    <span className="dev-path-pct">
                      {pct !== null && `${f.dec(pct)}% ${ti.ofPrevious}`}
                    </span>
                    <b className="dev-num">{f.int(value)}</b>
                  </li>
                );
              })}
            </ol>
          );
        })}
      </div>
      <div className="dev-kpis dev-path-kpis">
        <Kpi label={ti.daysToAi} value={funnel.medianDaysToAi} format={f.dec} />
        <Kpi label={ti.daysToPaid} value={funnel.medianDaysToPaid} format={f.dec} />
      </div>
      <p className="dev-note">{ti.funnelNote}</p>
    </>
  );
}

function Retention({ ti, f, rows }) {
  if (!rows?.length) return <Empty>{ti.noRetention}</Empty>;
  const cohorts = new Map();
  for (const r of rows) {
    const c = cohorts.get(r.cohort) ?? { cohort: r.cohort, size: r.size, weeks: {} };
    c.weeks[r.week] = r.active;
    cohorts.set(r.cohort, c);
  }
  const list = [...cohorts.values()].sort((a, b) => (a.cohort < b.cohort ? 1 : -1));
  const span = Math.max(...rows.map((r) => r.week)) + 1;
  return (
    <>
      <div className="dev-table-wrap">
        <table className="dev-matrix dev-retention">
          <thead>
            <tr>
              <th>{ti.cohort}</th>
              <th>{ti.size}</th>
              {Array.from({ length: span }, (_, w) => (
                <th key={w}>{ti.week(w)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.cohort}>
                <th>{f.dateLong(c.cohort)}</th>
                <td>{f.int(c.size)}</td>
                {Array.from({ length: span }, (_, w) => {
                  const share = c.weeks[w] !== undefined ? (c.weeks[w] / c.size) * 100 : null;
                  // Weeks that have not happened yet stay blank.
                  const future = Date.parse(c.cohort) + w * 7 * 86_400_000 > Date.now();
                  return (
                    <td
                      key={w}
                      style={
                        share
                          ? {
                              background: `color-mix(in srgb, ${C.gold} ${Math.round(share * 0.6)}%, transparent)`,
                            }
                          : undefined
                      }
                    >
                      {future ? '' : share === null ? '0%' : `${Math.round(share)}%`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dev-note">{ti.retentionNote}</p>
    </>
  );
}

function AiCost({ t, ti, f, cost }) {
  const rate = cost.usdRate?.rate ?? null;
  const lei = (usd) => (rate === null ? null : usd * rate);
  const order = ['trial', 'standard', 'pro'];
  const plans = [...cost.plans].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const money = (v) => (v === null ? '—' : f.dec(v));
  return (
    <>
      {!plans.length ? (
        <Empty>{ti.noCost}</Empty>
      ) : (
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead>
              <tr>
                <th>{ti.plan}</th>
                <th>{ti.aiUsers}</th>
                <th>{ti.tokens}</th>
                <th>{ti.costUsd}</th>
                <th>{ti.costLei}</th>
                <th>{ti.perUser}</th>
                <th>{ti.subscribers}</th>
                <th>{ti.revenue}</th>
                <th>{ti.margin}</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const costLei = lei(p.costUsd);
                const revenue = p.revenueBani / 100;
                const margin = costLei === null ? null : revenue - costLei;
                return (
                  <tr key={p.name}>
                    <td>{ti.planNames[p.name] ?? p.name}</td>
                    <td className="dev-num">{f.int(p.users)}</td>
                    <td className="dev-num">{f.compact(p.tokens)}</td>
                    <td className="dev-num">{money(p.costUsd)}</td>
                    <td className="dev-num">{money(costLei)}</td>
                    <td className="dev-num">
                      {p.users ? money(costLei === null ? p.costUsd : costLei / p.users) : '—'}
                    </td>
                    <td className="dev-num">{f.int(p.subscribers)}</td>
                    <td className="dev-num">{money(revenue)}</td>
                    <td className={`dev-num ${margin !== null && margin < 0 ? 'is-negative' : ''}`}>
                      {money(margin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {cost.top.length > 0 && (
        <>
          <h4 className="dev-subhead">{ti.top}</h4>
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  <th>{ti.account}</th>
                  <th>{ti.plan}</th>
                  <th>{ti.requests}</th>
                  <th>{ti.tokens}</th>
                  <th>{ti.costUsd}</th>
                  <th>{ti.costLei}</th>
                </tr>
              </thead>
              <tbody>
                {cost.top.map((u, i) => (
                  <tr key={i}>
                    <td>{u.email ?? ti.unknown}</td>
                    <td>{ti.planNames[u.plan] ?? u.plan ?? '—'}</td>
                    <td className="dev-num">{f.int(u.requests)}</td>
                    <td className="dev-num">{f.compact(u.tokens)}</td>
                    <td className="dev-num">{money(u.costUsd)}</td>
                    <td className="dev-num">{money(lei(u.costUsd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="dev-note">
        {ti.costNote(
          rate === null ? null : rate.toLocaleString(t.locale, { minimumFractionDigits: 4 }),
          cost.usdRate?.date,
        )}
        {cost.unpricedModels.length > 0 && ` ${ti.unpriced(cost.unpricedModels.join(', '))}`}
      </p>
    </>
  );
}

function SubscriptionHealth({ ti, f, subs }) {
  return (
    <>
      <div className="dev-kpis">
        <Kpi label={ti.paying} value={subs.paying} format={f.int} />
        <Kpi label={ti.mrr} value={subs.mrr} format={f.money} />
        <Kpi label={ti.arpu} value={subs.arpu} format={f.money} />
        <Kpi
          label={ti.churn}
          value={subs.monthlyChurn === null ? null : subs.monthlyChurn * 100}
          format={f.pct}
        />
        <Kpi label={ti.ltv} value={subs.ltv} format={f.money} />
        <Kpi label={ti.joined} value={subs.joined} format={f.int} />
        <Kpi label={ti.left} value={subs.left} format={f.int} />
      </div>
      <p className="dev-note">
        {ti.atStart(f.int(subs.activeAtStart))} · +{f.money(subs.newMrr)} / −{f.money(subs.lostMrr)}{' '}
        MRR
      </p>
      <h4 className="dev-subhead">{ti.reasons}</h4>
      {subs.feedback.length ? (
        <RankList
          rows={subs.feedback.map((r) => ({
            name: ti.reasonNames[r.name] ?? r.name,
            visitors: r.count,
          }))}
          format={f.int}
        />
      ) : (
        <p className="dev-note">{ti.noReasons}</p>
      )}
      <p className="dev-note">{ti.subsNote}</p>
    </>
  );
}

function Releases({ ti, f, releases }) {
  if (!releases.length) return <Empty>{ti.noReleases}</Empty>;
  return (
    <div className="dev-table-wrap">
      <table className="dev-table">
        <thead>
          <tr>
            <th>{ti.version}</th>
            <th>{ti.firstSeen}</th>
            <th>{ti.size}</th>
            <th>{ti.sessions}</th>
            <th>{ti.clean}</th>
            <th>{ti.crashes}</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => {
            const clean = r.sessions ? (1 - r.errorSessions / r.sessions) * 100 : null;
            return (
              <tr key={r.version}>
                <td>{r.version}</td>
                <td>{f.dateLong(r.firstSeen)}</td>
                <td className="dev-num">{f.int(r.installs)}</td>
                <td className="dev-num">{f.int(r.sessions)}</td>
                <td className={`dev-num ${clean !== null && clean < 95 ? 'is-negative' : ''}`}>
                  {f.pct(clean)}
                </td>
                <td className={`dev-num ${r.crashSessions ? 'is-negative' : ''}`}>
                  {f.int(r.crashSessions)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LegalSources({ ti, f, law }) {
  if (!law.tools.length && !law.errors.length) return <Empty>{ti.noLaw}</Empty>;
  const names = (k) => ti.toolNames[k] ?? k;
  const tools = [...new Set(law.daily.map((r) => r.tool))];
  const byDay = new Map();
  for (const r of law.daily) {
    const day = String(r.day).slice(0, 10);
    const row = byDay.get(day) ?? { day };
    row[r.tool] = r.failures;
    byDay.set(day, row);
  }
  const failing = law.daily.some((r) => r.failures > 0);
  return (
    <>
      {law.tools.length > 0 && (
        <div className="dev-table-wrap">
          <table className="dev-table">
            <thead>
              <tr>
                <th>{ti.tool}</th>
                <th>{ti.calls}</th>
                <th>{ti.failed}</th>
                <th>{ti.slow}</th>
              </tr>
            </thead>
            <tbody>
              {law.tools.map((r) => {
                const failed = r.calls ? (r.failures / r.calls) * 100 : null;
                return (
                  <tr key={r.name}>
                    <td>{names(r.name)}</td>
                    <td className="dev-num">{f.int(r.calls)}</td>
                    <td className={`dev-num ${failed > 5 ? 'is-negative' : ''}`}>
                      {f.int(r.failures)} ({f.pct(failed)})
                    </td>
                    <td className="dev-num">
                      {f.int(r.slow)} ({f.pct(r.calls ? (r.slow / r.calls) * 100 : null)})
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {failing && (
        <>
          <h4 className="dev-subhead">{ti.failuresDaily}</h4>
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={[...byDay.values()]}
              xKey="day"
              keys={tools.map((k, i) => ({
                key: k,
                name: names(k),
                color: Object.values(C)[i % Object.values(C).length],
              }))}
              tickFormat={f.tick}
              format={f.int}
              height={180}
            />
          </Suspense>
        </>
      )}
      {law.errors.length > 0 && (
        <>
          <h4 className="dev-subhead">{ti.lawErrors}</h4>
          <RankList
            rows={law.errors.map((r) => ({ name: r.name, visitors: r.count }))}
            format={f.int}
          />
        </>
      )}
    </>
  );
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

function AudienceSection({ t, f, lang, traffic, token, range }) {
  const ta = t.audience;
  const d = traffic.data;
  const [focus, setFocus] = useState(null);
  // The country the map is zoomed into, and its visitors by region.
  const [selected, setSelected] = useState(null);
  const [regions, setRegions] = useState({ country: null, rows: null });
  useEffect(() => {
    if (!selected) return;
    let alive = true;
    setRegions({ country: selected, rows: null });
    call(token, 'regions', { range, country: selected })
      .then((r) => alive && setRegions({ country: selected, rows: r.regions ?? [] }))
      .catch(() => alive && setRegions({ country: selected, rows: [] }));
    return () => {
      alive = false;
    };
  }, [selected, token, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
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
  const regionRows = regions.country === selected ? regions.rows : null;
  const regionName = (code, name) => (code?.startsWith('RO-') ? countyName(code, name) : name);
  return (
    <>
      <Card title={ta.globe} wide tall aside={<span className="dev-note">{ta.mapHint}</span>}>
        <div className="dev-globe-wrap">
          {loading ? (
            <Skeleton height={360} />
          ) : (
            <Suspense fallback={<Skeleton height={360} />}>
              <WorldMap
                countries={countries}
                selected={selected}
                onSelect={setSelected}
                regionVisitors={regionRows}
                regionName={regionName}
                focus={focus}
                label={ta.globe}
                backLabel={ta.world}
                noRegions={ta.noRegions}
                format={f.int}
                lang={lang}
              />
            </Suspense>
          )}
          <div className="dev-globe-list">
            <h4>{selected ? ta.regionsIn(countryName(selected, lang)) : ta.countries}</h4>
            {loading || (selected && regionRows === null) ? (
              <Skeleton />
            ) : selected ? (
              <RankList
                rows={regionRows}
                name={(r) => regionName(r.code, r.name)}
                format={f.int}
                limit={15}
                onHover={(r) => setFocus(r?.code ?? null)}
              />
            ) : (
              <RankList
                rows={b.country}
                name={(r) => countryName(r.name, lang)}
                format={f.int}
                limit={12}
                onHover={(r) => setFocus(r?.name ?? null)}
                onSelect={(r) => setSelected(r.name)}
              />
            )}
          </div>
        </div>
      </Card>
      {[
        ['romania', ta.counties],
        ['city', ta.cities],
        ['device', ta.devices],
        ['browser', ta.browsers],
        ['os', ta.os],
      ].map(([key, title]) => (
        <Card key={key} title={title}>
          {loading ? (
            <Skeleton />
          ) : (
            <RankList
              rows={b[key]}
              name={key === 'romania' ? (r) => countyName(r.code, r.name) : undefined}
              format={f.int}
              limit={6}
            />
          )}
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
      {[
        ['gender', ta.gender, d?.genders, (k) => ta.genderNames[k] ?? k],
        ['age', ta.age, d?.ages, (k) => (k === 'unknown' ? ta.ageUnknown : k)],
      ].map(([key, title, groups, label]) => (
        <Card key={key} title={title}>
          {loading ? (
            <ChartFallback />
          ) : (
            <Suspense fallback={<ChartFallback />}>
              <StackedBars
                data={Object.entries(groups ?? {}).map(([k, v]) => ({
                  group: label(k),
                  paying: v.paying,
                  free: v.accounts - v.paying,
                }))}
                xKey="group"
                keys={[
                  { key: 'paying', name: ta.paying, color: C.gold },
                  { key: 'free', name: ta.free, color: C.blue },
                ]}
                format={f.int}
                height={220}
              />
            </Suspense>
          )}
        </Card>
      ))}
      {!loading && (
        <Card wide>
          <p className="dev-note">
            {ta.demographicsNote(f.int(d.demographicsGiven ?? 0), f.int(d.total))}
          </p>
        </Card>
      )}
    </>
  );
}

// The desktop app's own statistics (its anonymous telemetry).
function AppSection({ t, f, app, range }) {
  const ta = t.app;
  const d = app.data;
  if (app.error) return <Failed t={t} error={app.error} onRetry={app.reload} />;
  const loading = app.loading && !d;
  if (!loading && !d.active.length && !d.events.length && !d.users.length) {
    return (
      <Card wide>
        <Empty>{ta.empty}</Empty>
      </Card>
    );
  }
  const byDay = new Map((d?.active ?? []).map((r) => [String(r.day).slice(0, 10), r]));
  const activeSeries = daysBetween(range).map((day) => ({
    day,
    dau: byDay.get(day)?.dau ?? 0,
  }));
  const aiByDay = new Map((d?.ai.daily ?? []).map((r) => [String(r.day).slice(0, 10), r]));
  const aiSeries = daysBetween(range).map((day) => ({ ...aiByDay.get(day), day }));
  const named = (list, names, key = 'count') =>
    (list ?? []).map((r) => ({ name: names?.[r.name] ?? r.name, visitors: r[key] }));
  return (
    <>
      <Card wide>
        <div className="dev-kpis">
          {loading ? (
            [0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={70} />)
          ) : (
            <>
              <Kpi
                label={ta.dau}
                value={d.today}
                format={f.int}
                spark={d.active.map((r) => r.dau)}
              />
              <Kpi label={ta.wau} value={d.wau} format={f.int} />
              <Kpi label={ta.mau} value={d.mau} format={f.int} />
              <Kpi label={ta.sessions} value={d.sessions} format={f.int} />
              <Kpi label={ta.median} value={d.medianSession} format={f.dec} />
              <Kpi label={ta.aiRequests} value={d.ai.requests} format={f.int} />
              <Kpi
                label={ta.aiTokens}
                value={d.ai.inputTokens + d.ai.outputTokens}
                format={f.int}
              />
            </>
          )}
        </div>
      </Card>
      <Card title={ta.active} wide>
        {loading ? (
          <ChartFallback />
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={activeSeries}
              xKey="day"
              keys={[{ key: 'dau', name: ta.dau, color: C.gold }]}
              tickFormat={f.tick}
              format={f.int}
              height={200}
            />
          </Suspense>
        )}
      </Card>
      <Card title={ta.features}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={named(d.features, ta.featureNames)} format={f.int} limit={11} />
        )}
      </Card>
      <Card title={ta.atLimit}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={named(d.ai.atLimit, ta.limitNames)} format={f.int} />
        )}
      </Card>
      <Card title={ta.ai} wide>
        {loading ? (
          <ChartFallback />
        ) : (
          <Suspense fallback={<ChartFallback />}>
            <StackedBars
              data={aiSeries}
              xKey="day"
              keys={d.ai.models.map((m, i) => ({
                key: m,
                name: m,
                color: Object.values(C)[i % Object.values(C).length],
              }))}
              tickFormat={f.tick}
              format={f.int}
              yFormat={f.compact}
              height={200}
            />
          </Suspense>
        )}
      </Card>
      <Card title={ta.versions}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList
            rows={d.versions.map((r) => ({
              name: `${r.version} · ${r.platform === 'darwin' || r.platform === 'mac' ? 'macOS' : r.platform === 'win32' || r.platform === 'windows' ? 'Windows' : r.platform}`,
              visitors: r.installs,
            }))}
            format={f.int}
          />
        )}
      </Card>
      <Card title={ta.updates}>
        {loading ? (
          <Skeleton />
        ) : (
          <RankList rows={named(d.updates, ta.updateNames)} format={f.int} />
        )}
      </Card>
      <Card title={ta.events} wide>
        {loading ? <Skeleton /> : <RankList rows={named(d.events)} format={f.int} limit={10} />}
      </Card>
      <Card title={ta.errors} wide>
        {loading ? (
          <Skeleton />
        ) : !d.errors.length ? (
          <Empty>{ta.noErrors}</Empty>
        ) : (
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  <th>{ta.error}</th>
                  <th>{ta.where}</th>
                  <th>{ta.version}</th>
                  <th>{ta.count}</th>
                  <th>{ta.users}</th>
                  <th>{ta.lastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {d.errors.map((e, i) => (
                  <tr key={i}>
                    <td>
                      {e.name ?? e.event}
                      {e.window && <small> · {e.window}</small>}
                    </td>
                    <td>
                      <code>{e.stack_top ?? '—'}</code>
                    </td>
                    <td>{e.versions.join(', ') || '—'}</td>
                    <td className="dev-num">{f.int(e.count)}</td>
                    <td className="dev-num">{f.int(e.users)}</td>
                    <td>{f.dateTime(e.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card title={ta.accounts} wide>
        {loading ? (
          <Skeleton />
        ) : (
          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  <th>{ta.email}</th>
                  <th>{ta.plan}</th>
                  <th>{ta.version}</th>
                  <th>{ta.allSessions}</th>
                  <th>{ta.aiRounds}</th>
                  <th>{ta.aiTokens}</th>
                  <th>{ta.lastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {d.users.map((u, i) => (
                  <tr key={i}>
                    <td>{u.email ?? ta.anonymous}</td>
                    <td>{u.plan ?? '—'}</td>
                    <td>{u.version ?? '—'}</td>
                    <td className="dev-num">{f.int(u.sessions)}</td>
                    <td className="dev-num">{f.int(u.aiRounds)}</td>
                    <td className="dev-num">{f.int(u.aiTokens)}</td>
                    <td>{f.dateTime(u.lastSeen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

function AlertsCard({ t, f, d, token }) {
  const th = t.health;
  const [test, setTest] = useState(null);
  async function sendTest() {
    setTest('sending');
    try {
      const r = await call(token, 'testAlert');
      setTest(r.ok ? 'sent' : 'failed');
    } catch {
      setTest('failed');
    }
  }
  const link = d.ntfyTopic ? `${d.ntfyServer}/${d.ntfyTopic}` : null;
  return (
    <Card title={th.alerts} wide>
      {!d.alertsConfigured ? (
        <p className="dev-note">{th.alertsOff}</p>
      ) : (
        <>
          {link && (
            <p className="dev-note">
              {th.alertsHow} <code className="dev-topic">{d.ntfyTopic}</code>{' '}
              <a href={link} target="_blank" rel="noreferrer">
                {th.alertsOpen}
              </a>
            </p>
          )}
          <div className="dev-alert-actions">
            <button
              type="button"
              className="btn is-outline is-small"
              onClick={sendTest}
              disabled={test === 'sending'}
            >
              {th.testAlert}
            </button>
            {test === 'sent' && <span className="dev-note">{th.testSent}</span>}
            {test === 'failed' && <span className="dev-warning">{th.testFailed}</span>}
          </div>
        </>
      )}
      <h4 className="dev-subhead">{th.recentAlerts}</h4>
      {d.alerts?.length ? (
        <ul className="dev-alerts">
          {d.alerts.map((a, i) => (
            <li key={i}>
              <b>{a.title}</b>
              <span>{a.body}</span>
              <time className="dev-note">{f.dateTime(a.sent_at)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dev-note">{th.noAlerts}</p>
      )}
    </Card>
  );
}

function HealthSection({ t, f, health, token, lang }) {
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
      <NotificationsCard t={t} f={f} token={token} lang={lang} />
      <AlertsCard t={t} f={f} d={d} token={token} />
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

// ---- routes, push --------------------------------------------------------------

// Sub-views inside dev.html: #/reports, #/reports/R-0042, #/settings. Plain
// anchors (#traffic) stay section links on the dashboard.
function useHashRoute() {
  const read = () => (window.location.hash.startsWith('#/') ? window.location.hash.slice(1) : '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function ViewTabs({ t, route }) {
  const tabs = [
    ['', '#', t.views.dashboard],
    ['/reports', '#/reports', t.views.reports],
    ['/settings', '#/settings', t.views.settings],
  ];
  const active = route.startsWith('/reports')
    ? '/reports'
    : route.startsWith('/settings')
      ? '/settings'
      : '';
  return (
    <nav className="dev-views" aria-label={t.views.dashboard}>
      {tabs.map(([key, href, label]) => (
        <a key={key} href={href} aria-current={active === key ? 'page' : undefined}>
          {label}
        </a>
      ))}
    </nav>
  );
}

// The reports inbox comes with the app's reports; until then the deep links
// (#/reports/R-0042, from push notifications) land here.
function ReportsView({ t, route }) {
  const id = route.split('/')[2];
  return (
    <Section id="reports" title={id ? t.reports.report(decodeURIComponent(id)) : t.reports.title}>
      <Card wide>
        <Empty>{t.reports.soon}</Empty>
      </Card>
    </Section>
  );
}

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';
const PUSH_SUPPORTED =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;
const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const STANDALONE =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true);

// The service worker, for this page only (scope /dev.html).
function swRegistration() {
  return navigator.serviceWorker.register('/dev-sw.js', { scope: '/dev.html' });
}

const keyBytes = (b64) => {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
};

// "iPhone · Safari", "Mac · Chrome"…: a default name for this device.
function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Mac/.test(ua)
          ? 'Mac'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Linux/.test(ua)
              ? 'Linux'
              : 'Device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua) && !/Chromium/.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${os} · ${browser}` : os;
}

function NotificationsCard({ t, f, token, lang }) {
  const tn = t.notif;
  const [devices, setDevices] = useState(null);
  const [mine, setMine] = useState(null);
  const [permission, setPermission] = useState(
    PUSH_SUPPORTED ? Notification.permission : 'default',
  );
  const [label, setLabel] = useState(() => (typeof navigator !== 'undefined' ? deviceName() : ''));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await call(token, 'push.list');
      setDevices(r.devices);
    } catch (err) {
      setMessage({ error: true, text: `${tn.failed} ${err.message}` });
    }
    if (PUSH_SUPPORTED) {
      const reg = await swRegistration().catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      setMine(sub?.endpoint ?? null);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    load();
  }, [load]);

  async function run(work) {
    setBusy(true);
    setMessage(null);
    try {
      await work();
    } catch (err) {
      setMessage({ error: true, text: `${tn.failed} ${err.message ?? err}` });
    } finally {
      setBusy(false);
    }
  }

  const enable = () =>
    run(async () => {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;
      const reg = await swRegistration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(VAPID_KEY),
        }));
      const r = await call(token, 'push.subscribe', {
        subscription: sub.toJSON(),
        device_label: label,
      });
      if (r.error) throw new Error(r.error);
      setMessage({ text: tn.on });
      await load();
    });

  const remove = (endpoint) =>
    run(async () => {
      await call(token, 'push.unsubscribe', { endpoint });
      if (endpoint === mine) {
        const reg = await swRegistration();
        await (await reg.pushManager.getSubscription())?.unsubscribe();
      }
      await load();
    });

  const test = () =>
    run(async () => {
      const r = await call(token, 'push.test', { lang });
      if (r.error) throw new Error(r.error);
      setMessage({ text: tn.tested(r.sent ?? 0) });
      await load();
    });

  const enabledHere = Boolean(mine && devices?.some((d) => d.endpoint === mine));
  let status;
  if (!VAPID_KEY) status = tn.notConfigured;
  else if (!PUSH_SUPPORTED) status = IS_IOS && !STANDALONE ? tn.ios : tn.unsupported;
  else if (permission === 'denied') status = tn.denied;
  else status = enabledHere ? tn.on : tn.off;
  const canEnable = VAPID_KEY && PUSH_SUPPORTED && permission !== 'denied' && !enabledHere;

  return (
    <Card title={tn.title} wide>
      <p className={`dev-note ${enabledHere ? 'is-ok' : ''}`}>{status}</p>
      {IS_IOS && !STANDALONE && PUSH_SUPPORTED && <p className="dev-note">{tn.ios}</p>}
      {canEnable && (
        <div className="dev-notif-enable">
          <label className="dev-notif-label">
            <span>{tn.label}</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} />
          </label>
          <button type="button" className="btn is-small" disabled={busy} onClick={enable}>
            {tn.enable}
          </button>
        </div>
      )}
      <div className="dev-alert-actions">
        <button
          type="button"
          className="btn is-outline is-small"
          disabled={busy || !devices?.length}
          onClick={test}
        >
          {tn.test}
        </button>
        {message && (
          <span className={message.error ? 'dev-warning' : 'dev-note'} role="status">
            {message.text}
          </span>
        )}
      </div>
      <h4 className="dev-subhead">{tn.devices}</h4>
      {devices === null ? (
        <Skeleton height={60} />
      ) : !devices.length ? (
        <p className="dev-note">{tn.none}</p>
      ) : (
        <ul className="dev-devices">
          {devices.map((d) => (
            <li key={d.id}>
              <span>
                <b>{d.device_label || '—'}</b>
                {d.endpoint === mine && <small> · {tn.thisDevice}</small>}
              </span>
              <span className="dev-note">
                {tn.lastUsed}: {d.last_used_at ? f.dateTime(d.last_used_at) : tn.never}
                {d.failures > 0 && ` · ${tn.failures(d.failures)}`}
              </span>
              <button
                type="button"
                className="link-button"
                disabled={busy}
                onClick={() => remove(d.endpoint)}
              >
                {tn.remove}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SettingsView({ t, f, token, lang, health }) {
  return (
    <Section id="settings" title={t.settingsTitle}>
      <NotificationsCard t={t} f={f} token={token} lang={lang} />
      {health.data && <AlertsCard t={t} f={f} d={health.data} token={token} />}
    </Section>
  );
}

function Dashboard({ t, lang, token }) {
  const f = useFormat(t.locale);
  const [preset, setPreset] = useState('30d');
  const [custom, setCustom] = useState(() => presetRange('30d'));
  const [compare, setCompare] = useState(true);
  const [auto, setAuto] = useState(true);
  const range = preset === 'custom' ? custom : presetRange(preset);
  const rangeKey = `${range.from}:${range.to}`;
  const body = { range, compare };

  const route = useHashRoute();
  const health = useAction(token, 'health', {}, []);
  const live = useAction(token, 'live', {}, []);
  const traffic = useAction(token, 'traffic', body, [rangeKey, compare]);
  const billing = useAction(token, 'billing', body, [rangeKey]);
  const accounts = useAction(token, 'accounts', body, [rangeKey]);
  const downloads = useAction(token, 'downloads', {}, []);
  const app = useAction(token, 'app', body, [rangeKey]);
  const insights = useAction(token, 'insights', body, [rangeKey]);
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
    [health, live, traffic, billing, accounts, downloads, app, insights].forEach((a) => a.reload());
  }, [health, live, traffic, billing, accounts, downloads, app, insights]);

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

      <ViewTabs t={t} route={route} />
      {route.startsWith('/reports') && <ReportsView t={t} route={route} />}
      {route.startsWith('/settings') && (
        <SettingsView t={t} f={f} token={token} lang={lang} health={health} />
      )}
      {!route && (
        <>
          <LiveStrip t={t} f={f} live={live} lastUpdated={lastUpdated} />

          <Assistant t={t} token={token} range={range} lang={lang} />

          <nav className="dev-jump" aria-label="Sections">
            {Object.entries(t.sections).map(([key, label]) => (
              <a key={key} href={`#${key}`}>
                {label}
              </a>
            ))}
          </nav>

          <Section id="insights" title={t.sections.insights}>
            <InsightsSection t={t} f={f} insights={insights} />
          </Section>
          <Section id="traffic" title={t.sections.traffic}>
            <TrafficSection t={t} f={f} traffic={traffic} compare={compare} />
          </Section>
          <Section id="audience" title={t.sections.audience}>
            <AudienceSection
              t={t}
              f={f}
              lang={lang}
              traffic={traffic}
              token={token}
              range={range}
            />
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
          <Section id="app" title={t.sections.app}>
            <AppSection t={t} f={f} app={app} range={range} />
          </Section>
          <Section id="downloads" title={t.sections.downloads}>
            <DownloadsSection t={t} f={f} downloads={downloads} />
          </Section>
          <Section id="health" title={t.sections.health}>
            <HealthSection t={t} f={f} health={health} token={token} lang={lang} />
          </Section>
        </>
      )}
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

  // The dashboard's service worker (push notifications, installable app),
  // registered here only and scoped to /dev.html.
  useEffect(() => {
    if ('serviceWorker' in navigator) swRegistration().catch(() => {});
  }, []);

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
        <a className="btn is-outline" href={authHref({ signin: true })}>
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
