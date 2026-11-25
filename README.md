# DocVex

The public site of DocVex (GitHub Pages) and the home of its releases: the
desktop app's installers and update files are published to this repository's
GitHub Releases, where the installed app looks for updates.

## Site

A multi-page site built with Vite: each page keeps its own HTML file and URL.
Its design is the "DocVex Website" design, implemented 1:1: the same markup,
stylesheet, pictures, films and animations. The home page (`index.html`), the
download page (`instalare.html`), the pricing page (`preturi.html`), the
roadmap (`planuri.html`), sign-in and the five-step sign-up
(`autentificare.html`), the account page (`cont.html`), the privacy policy
(`confidentialitate.html`), the cookie policy (`cookies.html`), the terms
(`termeni.html`), the legal notice (`informatii-legale.html`: Law 365/2002
identification, ANPC-SAL, AI Act transparency, accessibility statement,
vulnerability reporting and the list of applicable acts) and `404.html`.

- `*.html`: each page, written out in Romanian, with `<!--#header-->` and
  `<!--#footer PREFIX-->` where the shared header and footer go
  (`src/site/partials/`, put in place by a plugin in `vite.config.js`; PREFIX
  keeps the contact form's ids unique). The site is Romanian only, but the
  emails are not yet: the app's Settings → Language still sets
  `user_metadata.lang` (mirrored to `notify_prefs.lang`), and the server still
  sends Romanian or English emails by it; `public/open.html`, the emails'
  link, stays bilingual for the same reason. Keep the email language on the
  server until the app goes Romanian only (a separate job:
  `docs/ROMANIAN_UI.md` in the app repo).
- `src/site/main.js`: every public page's entry: the fonts (Archivo, Cinzel,
  Cormorant Garamond, served from this site through `@fontsource`), the
  stylesheet `src/site/site.css` and the behaviour `src/site/artifact.js`
  (slideshows, parallax, the scroll-driven sections, the Funcții player, the
  closing animation, the download page, the roadmap, sign-in and sign-up).
- What the design shows as a preview works for real here: sign-in, sign-up,
  password reset and Google go to Supabase; a paid plan picked while signing
  up goes on to its Stripe Payment Link; the download button links straight to
  the newest installer for the chosen system (`virtual:latest-downloads`, read
  from the GitHub releases when the site is built); the header's account
  button follows the session. `src/site/account.js` fills the account page
  with what the account holds (name, e-mail, plan, sign-in methods,
  newsletter, AI usage, problem reports, a new password, a data export); its
  other sections (projects, tracked cases, deadlines, notifications, devices,
  Playbook) say they are kept in the app, until the account holds them.
- `src/auth.js`: the Supabase client (loaded only when a page needs it: sign-in,
  the account page, a signed-in download) and the Stripe links;
  `src/analytics.js`: Plausible events.
- `public/`: copied as is: the design's pictures and films (`hero/`, `img/`,
  `shots/`, `video/`, `vortex/`), `CNAME`, `.nojekyll`,
  `.well-known/security.txt` and the icons. Every icon (favicons, Apple,
  Android, Windows tiles, the manifest's, the logo in link previews) is made
  from the header's wax seal, `public/assets/seal.svg`, by
  `node scripts/icons.mjs`; `public/assets/icon.png`, the earlier logo, is
  kept for the admin dashboard.
- The admin dashboard (`dev.html`) is still React: `src/pages/Dev.jsx`,
  `src/components/`, `src/styles/style.css`.

```sh
npm install
npm run dev       # http://localhost:5173
npm run dev:phone # the same, also on the Wi-Fi (http://<this computer's IP>:5173)
node scripts/icons.mjs # the favicon/app-icon set, after changing public/assets/seal.svg
npm run build     # into dist/
npm run preview   # serve dist/
```

Titles, descriptions, link previews (WhatsApp, Facebook, LinkedIn…), icons,
structured data and the sitemap all come from `seo/config.js`; see
[SHARING.md](SHARING.md).

`npm run dev:phone` lets a phone on the same Wi-Fi open the site: use the
"Network" address Vite prints. Stop `npm run dev` first (both use port 5173).
Signing in with e-mail works there; Google sign-in returns only to the
addresses allowed in Supabase (docvex.ro and localhost), and push
notifications need HTTPS, so test those on docvex.ro.

Built with GDPR (Regulation (EU) 2016/679, Law 190/2018) and Law 506/2004 in
mind: no cookies, and the fonts are served from this site. The one third-party script is
Plausible's cookieless, EU-hosted statistics (injected into every page but
`dev.html` by a plugin in `vite.config.js`; events in `src/analytics.js`). The
browser stores only the Supabase session, after signing in; it is strictly
necessary and described in the cookie policy, so no consent banner is needed.
The sign-in, account and (signed in) download pages talk to Supabase. Adding
anything else means updating the cookie policy and asking for consent first.

## Admin dashboard

`/dev.html` (not linked, not indexed) shows traffic (Plausible), subscriptions
(Stripe, through the `stripe-events` log), accounts, downloads and health to
accounts with `app_metadata.is_admin = true`; everyone else gets the 404
page. Its data comes from the `admin` Edge Function; Recharts and cobe load
only on that page. Setup, secrets and goals: `docs/analytics.md`; the database:
`supabase/README.md`.

Edge Function secrets, by function:

| Function        | Secrets                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ask-docvex`    | `ANTHROPIC_API_KEY`, `ASK_SALT`                                                                                       |
| `stripe-events` | `STRIPE_SECRET_KEY`, `STRIPE_EVENTS_WEBHOOK_SECRET`                                                                   |
| `admin`         | `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_HOST` (optional), `GITHUB_TOKEN` (optional), `STRIPE_SECRET_KEY` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` come with
every function.

## Accounts and payments

The pricing page signs visitors up and in with Supabase Auth (the same project
as the app) and sends paid plans to Stripe Payment Links, passing the account
id as `client_reference_id`. Set the values in `.env.example` as repository
Actions variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_LINK_PRO`,
`STRIPE_LINK_CABINET`, `STRIPE_PORTAL`) and in `.env.local` for development. Without them the
page shows that accounts or online payment are not available yet.

- Supabase → Authentication: the redirect URLs include `https://docvex.ro/**`
  and `http://localhost:5173/**`, and manual linking is on (for adding,
  changing and removing Google on the account page).
- Stripe: one product and recurring price per paid plan, a Payment Link for
  each, with the confirmation page set to redirect to
  `https://docvex.ro/autentificare.html?plata=ok`; the portal returns to
  `https://docvex.ro/cont.html`.
- A Stripe webhook (e.g. a Supabase Edge Function) still has to record the
  paid plan on the account, using `client_reference_id`.
- Fill in the remaining `[DE COMPLETAT]` plan features, and have the
  terms cover subscriptions and the right of withdrawal before selling.

## Ask DocVex (the FAQ's assistant)

The redesigned home page has no question box, so the site no longer calls the
Supabase Edge Function `ask-docvex` (`supabase/functions/ask-docvex/`, with its
knowledge base `knowledge.md` and the `ask_usage` counter,
`supabase/migrations/001_ask_usage.sql`). The function is kept for when a box
comes back: secrets `ANTHROPIC_API_KEY`, `ASK_SALT`; after editing
`knowledge.md`, `node scripts/knowledge.mjs`, then redeploy the function.

## Downloads

The download page reads the visitor's system from the browser (nothing is
stored or sent; a link can ask for one with `?os=mac` or `?os=windows`) and
its button links straight to the newest installer for it: Windows
(`*-setup.exe`) or macOS (`*.dmg`, Universal first, then Apple silicon, then
Intel), with a switch to the other system. The page never sends visitors to
GitHub's pages: the releases are read from the GitHub API when the site is
built, so the page itself makes no request to GitHub; publishing, editing or
deleting a release rebuilds the site. A system with no published installer
yet gets a disabled button and a note.

Before publishing, fill in every `[DE COMPLETAT: ...]` (the operator's name,
address, CUI, trade register number, phone and contact e-mail, including the
one in `public/.well-known/security.txt`, whose `Expires` date must be renewed
yearly). Have a lawyer review the legal pages before public launch.

To serve it: Settings → Pages → Build and deployment → Source: GitHub Actions.
Every push to `main` then builds the site and publishes `dist/`
(`.github/workflows/deploy.yml`) at https://docvex.ro (the domain in
`public/CNAME`). Publishing, editing or deleting a release starts a fresh deploy from `main`
(the `redeploy` job): the `github-pages` environment accepts deployments from
`main` only, so no tag rule is needed. The site is also rebuilt every hour (a
`schedule` in the workflow), so a release always shows within the hour.
