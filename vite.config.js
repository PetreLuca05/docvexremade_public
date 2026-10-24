import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Each page keeps its own HTML file (and URL), so the site stays a multi-page
// build: no client-side router and no 404 redirect trick on GitHub Pages.
const pages = [
  'index',
  'instalare',
  'preturi',
  'cont',
  'autentificare',
  'dev',
  'confidentialitate',
  'cookies',
  'termeni',
  'informatii-legale',
  '404',
];

const REPO = 'PetreLuca05/docvexremade_public';

// The published versions, read from this repository's GitHub Releases when the
// site is built (the deploy workflow rebuilds on every new release), so the
// download page needs no request to GitHub until the visitor clicks download.
function dmgArch(name) {
  if (/universal/i.test(name)) return 'universal';
  if (/arm64|aarch64/i.test(name)) return 'arm64';
  if (/x64|x86_64|intel/i.test(name)) return 'x64';
  return null;
}

async function fetchReleases() {
  const headers = { Accept: 'application/vnd.github.html+json', 'User-Agent': 'docvex-site' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=30`, {
      headers,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const list = await res.json();
    const file = (a, extra) => ({
      file: a.name,
      size: a.size,
      url: a.browser_download_url,
      ...extra,
    });
    return list
      .filter((r) => !r.draft)
      .map((r) => {
        const exe =
          r.assets.find((a) => /-setup\.exe$/i.test(a.name)) ??
          r.assets.find((a) => /\.exe$/i.test(a.name));
        // Every .dmg (electron-builder names them by processor when it builds
        // more than one); the Universal one first, then Apple silicon.
        const rank = { universal: 0, arm64: 1, x64: 2 };
        const dmgs = r.assets
          .filter((a) => /\.dmg$/i.test(a.name))
          .map((a) => file(a, { arch: dmgArch(a.name) }))
          .sort((a, b) => (rank[a.arch] ?? 3) - (rank[b.arch] ?? 3));
        if (!exe && !dmgs.length) return null;
        return {
          version: r.tag_name.replace(/^v/, ''),
          date: r.published_at,
          prerelease: r.prerelease,
          notes: r.body_html ?? '',
          windows: exe ? file(exe) : null,
          mac: dmgs,
        };
      })
      .filter(Boolean);
  } catch (error) {
    // A deploy must not publish a download page with no downloads.
    if (process.env.CI) throw new Error(`Could not read the releases: ${error.message}`);
    console.warn(`[releases] ${error.message}; the download page will list no versions.`);
    return [];
  }
}

// `virtual:releases`: every release (the download page); `virtual:latest-release`:
// just the newest version for each system, { windows, mac } (the header, on
// every page).
function releases() {
  const ids = ['virtual:releases', 'virtual:latest-release'];
  let data;
  return {
    name: 'docvex-releases',
    resolveId: (source) => (ids.includes(source) ? `\0${source}` : undefined),
    async load(source) {
      if (!ids.some((id) => source === `\0${id}`)) return;
      data ??= await fetchReleases();
      if (source === `\0${ids[0]}`) return `export default ${JSON.stringify(data)};`;
      const newest = (os) => {
        const r = data.find((x) => (os === 'mac' ? x.mac.length : x.windows));
        return r ? { version: r.version, date: r.date } : null;
      };
      return `export default ${JSON.stringify({ windows: newest('windows'), mac: newest('mac') })};`;
    },
  };
}

// Plausible (cookieless, EU-hosted analytics) on every page but the admin
// dashboard (dev.html): the script with outbound-link tracking, and a queue
// so events fired before it loads are kept. VITE_PLAUSIBLE_DOMAIN (default
// docvex.ro) and VITE_PLAUSIBLE_HOST (default https://plausible.io, or a
// self-hosted instance). Left out of `npm run dev` unless
// VITE_ANALYTICS_IN_DEV=true.
function plausibleScript(mode) {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const domain = env.VITE_PLAUSIBLE_DOMAIN || 'docvex.ro';
  const host = (env.VITE_PLAUSIBLE_HOST || 'https://plausible.io').replace(/\/$/, '');
  const enabled = mode !== 'development' || env.VITE_ANALYTICS_IN_DEV === 'true';
  return {
    name: 'docvex-plausible',
    transformIndexHtml(html, ctx) {
      if (!enabled || /(^|\/)dev\.html$/.test(ctx.filename ?? ctx.path ?? '')) return html;
      return [
        {
          tag: 'script',
          attrs: { defer: true, 'data-domain': domain, src: `${host}/js/script.outbound-links.js` },
          injectTo: 'head',
        },
        {
          tag: 'script',
          children:
            'window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}',
          injectTo: 'head',
        },
      ];
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Served from the root of the custom domain in public/CNAME.
  base: '/',
  plugins: [react(), releases(), plausibleScript(mode)],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
}));
