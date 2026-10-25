// A page's <head> metadata as HTML, from seo/config.js: the core tags, Open
// Graph, Twitter/X, Pinterest, Apple, Microsoft, icons, the manifest, oEmbed
// and JSON-LD. Written into the raw HTML at build time (link crawlers don't
// run JavaScript).

import { DEFAULT_ROBOTS, PAGES, PLANS, SITE } from './config.js';
import { SIZES } from './image.js';

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const meta = (attr, key, content) =>
  content === undefined || content === null || content === ''
    ? ''
    : `<meta ${attr}="${key}" content="${esc(content)}" />`;
const name = (k, v) => meta('name', k, v);
const prop = (k, v) => meta('property', k, v);
const link = (attrs) =>
  `<link ${Object.entries(attrs)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ')} />`;

export const pageUrl = (key) => (key === 'index' ? `${SITE.url}/` : `${SITE.url}/${key}.html`);
export const heading = (page) => page.heading ?? page.title.replace(/ — DocVex$/, '');
export const isIndexable = (page) => (page.robots ?? DEFAULT_ROBOTS).startsWith('index');

const ORG = `${SITE.url}/#organization`;
const WEBSITE = `${SITE.url}/#website`;
const APP = `${SITE.url}/#app`;

// The desktop app, with the newest release when the build knows it.
function app(ctx, extra = {}) {
  const latest = ctx.latest;
  return {
    '@type': 'SoftwareApplication',
    '@id': APP,
    name: SITE.name,
    description: SITE.description,
    url: `${SITE.url}/`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows, macOS',
    inLanguage: SITE.lang,
    image: `${SITE.url}${SITE.logo}`,
    publisher: { '@id': ORG },
    ...(latest
      ? { softwareVersion: latest.version, datePublished: latest.date?.slice(0, 10) }
      : {}),
    ...extra,
  };
}

const monthly = (price) => ({
  '@type': 'UnitPriceSpecification',
  price,
  priceCurrency: 'RON',
  referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
});

function jsonLd(key, page, ctx, image) {
  const url = pageUrl(key);
  const graph = [];
  if (key === 'index') {
    graph.push(
      {
        '@type': 'Organization',
        '@id': ORG,
        name: SITE.name,
        url: `${SITE.url}/`,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE.url}${SITE.logo}`,
          width: 512,
          height: 512,
        },
        ...(SITE.sameAs.length ? { sameAs: SITE.sameAs } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE,
        url: `${SITE.url}/`,
        name: SITE.name,
        description: SITE.description,
        inLanguage: SITE.lang,
        publisher: { '@id': ORG },
      },
      app(ctx, {
        downloadUrl: pageUrl('instalare'),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'RON',
          lowPrice: Math.min(...PLANS.map((p) => p.price)),
          highPrice: Math.max(...PLANS.map((p) => p.price)),
          offerCount: PLANS.length,
        },
      }),
    );
  }
  graph.push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: page.title,
    description: page.description,
    inLanguage: SITE.lang,
    isPartOf: { '@id': WEBSITE },
    ...(image ? { primaryImageOfPage: { '@type': 'ImageObject', url: image.url } } : {}),
    ...(key === 'index'
      ? { about: { '@id': APP } }
      : { breadcrumb: { '@id': `${url}#breadcrumb` } }),
  });
  if (key !== 'index') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.url}/` },
        { '@type': 'ListItem', position: 2, name: page.crumb ?? heading(page), item: url },
      ],
    });
  }
  if (key === 'preturi') {
    graph.push(
      app(ctx, {
        offers: PLANS.map((p) => ({
          '@type': 'Offer',
          name: p.name,
          price: p.price,
          priceCurrency: 'RON',
          priceSpecification: monthly(p.price),
          availability: 'https://schema.org/InStock',
          url,
        })),
      }),
    );
  }
  if (key === 'instalare') {
    const file = ctx.latest?.windows;
    graph.push(
      app(ctx, {
        downloadUrl: file?.url ?? url,
        ...(file?.size ? { fileSize: `${Math.round(file.size / 1048576)} MB` } : {}),
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'RON' },
      }),
    );
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(
    /</g,
    '\\u003c',
  );
}

// The page's <head> tags. `ctx`: { latest, images: { [key]: { wide, square } }, fbAppId }.
export function headTags(key, ctx) {
  const page = PAGES[key];
  if (!page) throw new Error(`seo/config.js has no entry for the page "${key}"`);
  const url = pageUrl(key);
  const social = page.social !== false;
  const canonical = page.canonical !== false;
  const dashboard = key === 'dev';
  const img = social ? ctx.images?.[key] : null;
  const out = [
    `<title>${esc(page.title)}</title>`,
    name('description', page.description),
    name('robots', page.robots ?? DEFAULT_ROBOTS),
    canonical ? link({ rel: 'canonical', href: url }) : '',
    canonical ? link({ rel: 'alternate', hreflang: SITE.lang, href: url }) : '',
    canonical ? link({ rel: 'alternate', hreflang: 'x-default', href: url }) : '',
    name('color-scheme', 'light dark'),
  ];

  if (!dashboard) {
    out.push(
      `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${SITE.themeDark}" />`,
      `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${SITE.themeDark}" />`,
    );
  }

  if (social) {
    out.push(
      prop('og:type', page.type ?? 'website'),
      prop('og:site_name', SITE.name),
      prop('og:title', page.title),
      prop('og:description', page.description),
      prop('og:url', url),
      prop('og:locale', SITE.locale),
      ...SITE.alternateLocales.map((l) => prop('og:locale:alternate', l)),
    );
    if (img) {
      for (const [variant, file] of [
        ['wide', img.wide],
        ['square', img.square],
      ]) {
        out.push(
          prop('og:image', file.url),
          prop('og:image:secure_url', file.url),
          prop('og:image:type', 'image/png'),
          prop('og:image:width', SIZES[variant].width),
          prop('og:image:height', SIZES[variant].height),
          prop('og:image:alt', page.imageAlt ?? `${heading(page)} — ${SITE.name}`),
        );
      }
    }
    if (page.type === 'product') {
      const paid = PLANS.find((p) => p.price > 0);
      out.push(
        prop('og:price:amount', paid.price),
        prop('og:price:currency', 'RON'),
        prop('product:price:amount', paid.price),
        prop('product:price:currency', 'RON'),
      );
    }
    out.push(
      name('twitter:card', 'summary_large_image'),
      SITE.twitter ? name('twitter:site', SITE.twitter) : '',
      SITE.twitter ? name('twitter:creator', SITE.twitter) : '',
      name('twitter:title', page.title),
      name('twitter:description', page.description),
      img ? name('twitter:image', img.wide.url) : '',
      img ? name('twitter:image:alt', page.imageAlt ?? `${heading(page)} — ${SITE.name}`) : '',
      ctx.fbAppId ? prop('fb:app_id', ctx.fbAppId) : '',
      name('pinterest-rich-pin', 'true'),
      link({
        rel: 'alternate',
        type: 'application/json+oembed',
        href: `${SITE.url}/oembed/${key}.json`,
        title: page.title,
      }),
    );
  }

  // Icons, the manifest, Apple and Windows. The dashboard keeps its own
  // manifest and Apple tags (dev.html).
  out.push(
    link({ rel: 'icon', href: '/favicon.ico', sizes: '48x48' }),
    link({ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }),
    link({ rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }),
    link({ rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }),
  );
  if (!dashboard) {
    out.push(
      link({ rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }),
      link({ rel: 'manifest', href: '/site.webmanifest' }),
      name('apple-mobile-web-app-title', SITE.name),
      name('apple-mobile-web-app-capable', 'yes'),
      name('mobile-web-app-capable', 'yes'),
      name('apple-mobile-web-app-status-bar-style', 'black-translucent'),
      name('application-name', SITE.name),
      name('msapplication-TileColor', SITE.themeDark),
      name('msapplication-TileImage', '/mstile-144x144.png'),
      name('msapplication-config', '/browserconfig.xml'),
    );
  }

  if (social && isIndexable(page)) {
    out.push(`<script type="application/ld+json">${jsonLd(key, page, ctx, img?.wide)}</script>`);
  }
  return out.filter(Boolean).join('\n    ');
}
