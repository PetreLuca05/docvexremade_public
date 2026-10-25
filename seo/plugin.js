// `docvex-seo`: writes each page's metadata (seo/head.js) into its HTML, and
// builds what the metadata points to:
//   og/<page>.png (1200x630) and og/<page>-square.png (600x600)
//   oembed/<page>.json
//   sitemap.xml, robots.txt
// Image URLs carry ?v=<content hash>, so a changed image gets a new URL and
// link previews fetch it again. Warns when an image is missing or over
// 300 KB (WhatsApp shows no image above that).

import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { DEFAULT_ROBOTS, PAGES, SITE } from './config.js';
import { headTags, heading, isIndexable, pageUrl } from './head.js';
import { renderImage, SIZES } from './image.js';

const MAX_IMAGE = 300 * 1024;

export default function seo({ latestRelease, fbAppId } = {}) {
  let images = null; // { key: { wide: { url, data }, square: { url, data } } }
  let latest = null;
  let building = false;

  async function prepare(warn) {
    latest = (await latestRelease?.()) ?? null;
    images = {};
    for (const [key, page] of Object.entries(PAGES)) {
      if (page.social === false) continue;
      images[key] = {};
      for (const [variant, size] of Object.entries(SIZES)) {
        const data = await renderImage({ heading: heading(page), kicker: page.kicker }, size);
        const file = variant === 'wide' ? `og/${key}.png` : `og/${key}-square.png`;
        const v = createHash('sha256').update(data).digest('hex').slice(0, 10);
        images[key][variant] = { file, data, url: `${SITE.url}/${file}?v=${v}` };
        if (data.length > MAX_IMAGE) {
          warn(
            `${file} is ${Math.round(data.length / 1024)} KB, over 300 KB: WhatsApp will show no image.`,
          );
        }
      }
    }
  }

  const ctx = () => ({ latest, images, fbAppId });

  return {
    name: 'docvex-seo',
    configResolved(config) {
      building = config.command === 'build';
    },
    async buildStart() {
      if (building) await prepare((m) => this.warn(m));
    },

    // Dev server: the images, oEmbed, sitemap and robots on request.
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        if (!/^\/(og\/|oembed\/|sitemap\.xml$|robots\.txt$)/.test(path)) return next();
        if (!images) await prepare((m) => server.config.logger.warn(m));
        const file = files().find((f) => `/${f.fileName}` === path);
        if (!file) return next();
        res.setHeader('Content-Type', file.type);
        res.end(file.source);
      });
    },

    transformIndexHtml: {
      order: 'pre',
      async handler(html, { filename }) {
        if (!images) await prepare(console.warn);
        const key = basename(filename, '.html');
        if (!PAGES[key]) throw new Error(`seo/config.js has no entry for ${key}.html`);
        if (PAGES[key].social !== false && !images[key]) {
          console.warn(`[seo] ${key}.html has no social image`);
        }
        // The page's own <title>, description, theme colour and icon are
        // replaced by the full set.
        const cleaned = html
          .replace(/\s*<title>[\s\S]*?<\/title>/, '')
          .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, '')
          .replace(/\s*<meta\s+name="robots"[^>]*\/>/, '')
          .replace(/\s*<meta\s+name="theme-color"[^>]*\/>/, key === 'dev' ? '$&' : '')
          .replace(/\s*<link\s+rel="icon"[^>]*\/>/, '');
        return cleaned.replace(
          /(<meta\s+name="viewport"[^>]*\/>)/,
          `$1\n    ${headTags(key, ctx())}`,
        );
      },
    },

    generateBundle() {
      for (const f of files()) {
        this.emitFile({ type: 'asset', fileName: f.fileName, source: f.source });
      }
    },
  };

  // Everything the plugin publishes besides the pages.
  function files() {
    const out = [];
    const today = new Date().toISOString().slice(0, 10);
    for (const [key, set] of Object.entries(images ?? {})) {
      const page = PAGES[key];
      for (const variant of Object.keys(set)) {
        out.push({ fileName: set[variant].file, source: set[variant].data, type: 'image/png' });
      }
      // oEmbed (https://oembed.com): a "link" response with the preview image.
      out.push({
        fileName: `oembed/${key}.json`,
        type: 'application/json',
        source: JSON.stringify(
          {
            version: '1.0',
            type: 'link',
            title: page.title,
            url: pageUrl(key),
            author_name: SITE.name,
            author_url: `${SITE.url}/`,
            provider_name: SITE.name,
            provider_url: `${SITE.url}/`,
            cache_age: 86400,
            thumbnail_url: set.wide.url,
            thumbnail_width: SIZES.wide.width,
            thumbnail_height: SIZES.wide.height,
          },
          null,
          2,
        ),
      });
    }
    const indexable = Object.entries(PAGES).filter(
      ([, p]) => isIndexable(p) && p.canonical !== false,
    );
    out.push({
      fileName: 'sitemap.xml',
      type: 'application/xml',
      source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable
  .map(
    ([key]) =>
      `  <url><loc>${pageUrl(key)}</loc><lastmod>${today}</lastmod><priority>${key === 'index' ? '1.0' : '0.7'}</priority></url>`,
  )
  .join('\n')}
</urlset>
`,
    });
    out.push({
      fileName: 'robots.txt',
      type: 'text/plain',
      source: `# Every crawler may read every page: private pages say "noindex" in
# their own <meta name="robots">, which crawlers must be able to read.
User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap.xml
`,
    });
    return out;
  }
}

export { DEFAULT_ROBOTS };
