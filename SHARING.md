# Sharing, link previews and search metadata

How docvex.ro looks when a link is pasted into WhatsApp, Facebook, Messenger,
Instagram, iMessage, Telegram, Signal, Slack, Discord, Teams, LinkedIn,
X/Twitter, Pinterest, Reddit or an email, and what Google reads.

## How it works

The pages render in the browser (React), but link crawlers don't run
JavaScript. So every tag is written into each page's HTML **at build time**
by the `docvex-seo` plugin (`seo/plugin.js`, registered in `vite.config.js`):

| File                | What it holds                                                                         |
| ------------------- | ------------------------------------------------------------------------------------- |
| `seo/config.js`     | Site-wide defaults (`SITE`) and every page's metadata (`PAGES`): **edit this one**    |
| `seo/head.js`       | Turns a page's entry into its `<head>` tags and JSON-LD                               |
| `seo/image.js`      | The preview-image template (satori → resvg, PNG)                                      |
| `seo/plugin.js`     | Writes the tags into the HTML; builds the images, oEmbed, `sitemap.xml`, `robots.txt` |
| `scripts/icons.mjs` | The favicon/app-icon set, the web manifest and `browserconfig.xml`, from one logo     |

Each page gets:

- **Core:** `<title>`, description, `robots`, canonical, `hreflang` (`ro`,
  `x-default`), `color-scheme`, `theme-color` (light and dark). The `<meta
charset>`, viewport and `<html lang="ro">` stay in the page's own `.html`.
- **Open Graph:** type, site name, title, description, URL, locale
  (`ro_RO`, alternate `en_US`), and two images (1200×630, then 600×600) each
  with `secure_url`, type, width, height and alt.
- **Twitter/X:** `summary_large_image` with title, description, image and alt
  (`twitter:site`/`creator` when `SITE.twitter` is set).
- **Facebook:** `fb:app_id` when `VITE_FACEBOOK_APP_ID` is set at build time.
- **Pinterest:** `pinterest-rich-pin`; the pricing page is `og:type`
  `product` with `og:price:*` and `product:price:*` (the Solo plan, RON).
- **Apple:** `apple-touch-icon` (180×180, opaque), `apple-mobile-web-app-*`.
  iMessage reads the Open Graph tags, and falls back to the touch icon.
- **Android/PWA:** `site.webmanifest` (icons 192, 512 and a maskable 512).
  The admin dashboard (`dev.html`) keeps its own manifest and service worker.
- **Windows:** `msapplication-TileColor`, `-TileImage`, `-config`
  (`browserconfig.xml`).
- **Favicons:** `favicon.ico` (16/32/48), `favicon.svg`, 16 and 32 px PNGs.
- **oEmbed:** `<link rel="alternate" type="application/json+oembed">` →
  `/oembed/<page>.json` (a `link` response with the preview image).
- **JSON-LD:** on the home page `Organization` (with `logo`; `sameAs` from
  `SITE.sameAs`), `WebSite` and `SoftwareApplication` (with the plans as an
  `AggregateOffer`); on every indexable page `WebPage`, and on the others a
  `BreadcrumbList`; on the pricing page the app with each plan as an `Offer`;
  on the download page the app with the latest version, its download link
  and size.

Private pages (`cont`, `dev`) and the 404 page are `noindex` and get no
preview tags or image. `sitemap.xml` lists the indexable pages; `robots.txt`
lets every crawler read everything (a `noindex` page must be readable for the
`noindex` to count).

There is no blog, video or audio on the site, so no `article:*`,
`og:video`/`og:audio` or `player` card; `seo/head.js` is where they would go.

## Adding or changing a page

1. Add the page to `pages` in `vite.config.js` (and its `.html` and entry, as
   for any page).
2. Add an entry to `PAGES` in `seo/config.js`: `title` and `description` are
   required. Optional: `heading` and `kicker` (the image's text; default: the
   title without " — DocVex"), `imageAlt`, `crumb` (breadcrumb name), `type`,
   `robots`, `social: false` (no preview), `canonical: false`.
3. `npm run build`. The build fails if a page has no entry, and warns if an
   image is missing or over 300 KB.

Keep the page component's `META` (`useMeta`) in step: it sets the title in
the browser, also in English.

## Canonical addresses

One preferred form: `https://docvex.ro`, no `www`, the home page as `/` and
every other page as `/<name>.html`. The canonical link and `og:url` are built
from the same function, so they always match. Share links in that form.

## Image requirements

Built automatically for every page with a preview:

- **1200×630 PNG** (`/og/<page>.png`), the main image: Facebook, WhatsApp,
  LinkedIn, Slack, Discord, Telegram, X's large card. **Under 300 KB**: above
  that, WhatsApp shows no image. They come out at about 150–165 KB.
- **600×600 PNG** (`/og/<page>-square.png`), the square fallback for apps
  that crop to a square.
- Not WebP or SVG (several apps don't read them). Absolute `https://` URLs,
  public, no redirects, served as `image/png`.
- `og:image:alt` / `twitter:image:alt` on each.

The template is in `seo/image.js`: the logo, a gold kicker line, the
heading in a serif (Source Serif 4; Inter for the small text, both embedded
from `@fontsource`, with the Latin Extended subset for ă, â, î, ș, ț).

## Refreshing a preview (cache busting)

Apps cache a link's preview, sometimes for days. Image URLs already carry
`?v=<hash of the image>`, so a changed image gets a new URL by itself. For
the title or description, or to refresh at once:

- **Facebook, Messenger, Instagram, WhatsApp:**
  [Sharing Debugger](https://developers.facebook.com/tools/debug/) → Scrape
  Again.
- **LinkedIn:** [Post Inspector](https://www.linkedin.com/post-inspector/).
- **X/Twitter:** post the link (the old Card Validator now only shows a
  preview in the post composer).
- **Telegram:** send the link to [@WebpageBot](https://t.me/WebpageBot).
- **Slack, Discord, others:** share the URL with something new on the end,
  such as `?v=2`.
- **Google:** [Rich Results Test](https://search.google.com/test/rich-results)
  and the [Schema Markup Validator](https://validator.schema.org/); submit
  `https://docvex.ro/sitemap.xml` in Search Console.

## Icons

From the one source logo, `public/assets/icon.png` (512×512):

```sh
node scripts/icons.mjs
```

It rewrites the favicons, app icons, `site.webmanifest` and
`browserconfig.xml` in `public/` (committed; the build only copies them).

## Crawlers

The site is static on GitHub Pages: every crawler (facebookexternalhit,
WhatsApp, Twitterbot, Slackbot, Discordbot, TelegramBot, LinkedInBot,
Pinterest, Googlebot, Applebot) gets the same `200` and the same HTML. Nothing
filters user agents.
