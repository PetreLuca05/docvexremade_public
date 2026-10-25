// Every page's metadata, in one place: what search engines and link previews
// (WhatsApp, Facebook, LinkedIn, Slack, iMessage…) read. The `docvex-seo`
// plugin in vite.config.js writes it into each page's HTML at build time,
// because link crawlers don't run JavaScript. A new page needs an entry here
// with a title and a description; everything else has a default. See
// SHARING.md.

export const SITE = {
  name: 'DocVex',
  // One preferred address: https, no www, pages as /<name>.html, the home
  // page as /. Canonical links and og:url are built from it.
  url: 'https://docvex.ro',
  lang: 'ro',
  locale: 'ro_RO',
  // The same pages switch to English in the browser (same URLs).
  alternateLocales: ['en_US'],
  description:
    'DocVex: aplicație desktop pentru avocați și juriști din România. Proiecte, documente, legislație, CAEN și cercetare juridică asistată de AI.',
  // Brand colours: the header and dark sections, and the light page.
  themeDark: '#0d1424',
  themeLight: '#fbf9f4',
  accent: '#e6cf9a',
  // Social profiles (Organization.sameAs) and the X/Twitter handle. Empty:
  // the tags are left out.
  sameAs: [],
  twitter: '',
  // Facebook app id, optional: VITE_FACEBOOK_APP_ID at build time.
  logo: '/icon-512.png',
};

// Per page. `title` and `description` are required; the rest:
//   heading   the line on the preview image (default: the title without
//             " — DocVex")
//   kicker    the small line above it on the image
//   type      og:type (default 'website')
//   robots    default 'index, follow, max-image-preview:large, max-snippet:-1'
//   social    false: no preview tags or image (private pages)
//   crumb     the page's name in the breadcrumb (pages under the home page)
//   schema    extra JSON-LD for this page (a function of the build context)
const INDEX = 'index, follow, max-image-preview:large, max-snippet:-1';
const PRIVATE = 'noindex, nofollow';

export const PAGES = {
  index: {
    title: 'DocVex — documente juridice, organizate',
    description: SITE.description,
    heading: 'Fiecare dosar. Un singur loc.',
    kicker: 'Aplicație desktop pentru avocați și juriști',
    imageAlt:
      'DocVex: „Fiecare dosar. Un singur loc.” — aplicație desktop pentru avocați și juriști din România.',
  },
  instalare: {
    title: 'Descarcă DocVex pentru Windows și macOS — DocVex',
    description:
      'Descarcă DocVex pentru Windows sau macOS, vezi pașii de instalare și notele fiecărei versiuni.',
    heading: 'Descarcă DocVex',
    kicker: 'Windows și macOS',
    crumb: 'Descărcare',
  },
  preturi: {
    title: 'Prețuri — DocVex',
    description:
      'Planurile DocVex pentru avocați, juriști și cabinete. Creează-ți contul și începe.',
    heading: 'Un plan pentru fiecare cabinet.',
    kicker: 'Prețuri',
    crumb: 'Prețuri',
    type: 'product',
  },
  autentificare: {
    title: 'Autentificare — DocVex',
    description: 'Creează-ți contul DocVex sau autentifică-te, cu Google sau cu e-mail și parolă.',
    heading: 'Creează-ți contul DocVex.',
    kicker: 'Începe',
    crumb: 'Autentificare',
    robots: 'noindex, follow',
  },
  cont: {
    title: 'Contul meu — DocVex',
    description: 'Datele contului tău DocVex.',
    robots: PRIVATE,
    social: false,
  },
  dev: {
    title: 'Panou — DocVex',
    description: 'Panoul intern DocVex.',
    robots: PRIVATE,
    social: false,
  },
  confidentialitate: {
    title: 'Politica de confidențialitate — DocVex',
    description:
      'Cum prelucrează DocVex datele cu caracter personal, conform Regulamentului (UE) 2016/679 (GDPR) și Legii nr. 190/2018.',
    heading: 'Politica de confidențialitate',
    kicker: 'GDPR și Legea nr. 190/2018',
    crumb: 'Politica de confidențialitate',
  },
  cookies: {
    title: 'Politica de cookie-uri — DocVex',
    description:
      'Site-ul DocVex nu folosește cookie-uri: numără vizitele fără cookie-uri (Plausible) și reține doar limba aleasă și, dacă te autentifici, sesiunea contului (Legea nr. 506/2004).',
    heading: 'Politica de cookie-uri',
    kicker: 'Fără cookie-uri',
    crumb: 'Politica de cookie-uri',
  },
  termeni: {
    title: 'Termeni și condiții — DocVex',
    description: 'Termenii de utilizare a site-ului și a aplicației DocVex.',
    heading: 'Termeni și condiții',
    kicker: 'Site și aplicație',
    crumb: 'Termeni și condiții',
  },
  'informatii-legale': {
    title: 'Informații legale — DocVex',
    description:
      'Datele de identificare ale operatorului DocVex, autoritățile competente, soluționarea litigiilor, transparența AI, accesibilitate, securitate și cadrul legal aplicabil.',
    heading: 'Informații legale',
    kicker: 'Operator, autorități, transparență AI',
    crumb: 'Informații legale',
  },
  404: {
    title: 'Pagina nu există — DocVex',
    description: 'Pagina căutată nu există pe docvex.ro.',
    robots: 'noindex, follow',
    // Served at any missing address, so no canonical or preview of its own.
    social: false,
    canonical: false,
  },
};

// The plans (Romanian names, as on the site), for the pricing page's
// structured data and Pinterest/Facebook product tags. Prices in lei a month.
export const PLANS = [
  { name: 'Start', price: 0 },
  { name: 'Solo', price: 199 },
  { name: 'Cabinet', price: 499 },
];

export const DEFAULT_ROBOTS = INDEX;
