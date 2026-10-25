# DocVex

The public site of DocVex (GitHub Pages) and the home of its releases: the
desktop app's installers and update files are published to this repository's
GitHub Releases, where the installed app looks for updates.

## Site

React, built with Vite as a multi-page site: each page keeps its own HTML file
and URL. The home page (`index.html`), the download page (`instalare.html`),
the pricing page (`preturi.html`), sign-up and sign-in (`autentificare.html`: a
three-step sign-up with live checks of the name, e-mail and password, sign-in,
and a password-reset link), the account page
(`cont.html`: the account in Supabase, with its name, plan, e-mail and password editable), the privacy policy
(`confidentialitate.html`), the cookie policy (`cookies.html`), the terms
(`termeni.html`), the legal notice (`informatii-legale.html`: Law 365/2002
identification, ANPC-SAL, AI Act transparency, accessibility statement,
vulnerability reporting and the list of applicable acts) and `404.html`.

- `*.html`: each page's `<head>` (title, description) and its entry script.
- `src/pages/`: each page. The home and download pages hold their Romanian and
  English text side by side; the legal pages have one file per language in
  `src/pages/ro/` and `src/pages/en/` (the Romanian text is the binding one).
- `src/components/Layout.jsx`: the shared header (links, sign-in, Get started
  and the RO / EN switcher; taller and without a background while the page is
  at the top) and footer, used by every page;
- `src/auth.js`: the Supabase client (loaded only by the pricing and account
  pages, and by the download page for a signed-in visitor, to record the
  downloaded version behind the header's Update badge) and the Stripe links; `src/i18n.jsx`: the current language; `src/styles/style.css`:
  the stylesheet.
- `src/assets/hero/`: the hero photos (JPEG, 1280 and 1920 px wide).
- `public/`: copied as is: `CNAME`, `.nojekyll`, `.well-known/security.txt`
  and `assets/icon.png`.

```sh
npm install
npm run dev       # http://localhost:5173
npm run dev:phone # the same, also on the Wi-Fi (http://<this computer's IP>:5173)
npm run build     # into dist/
npm run preview   # serve dist/
```

`npm run dev:phone` lets a phone on the same Wi-Fi open the site: use the
"Network" address Vite prints. Stop `npm run dev` first (both use port 5173).
Signing in with e-mail works there; Google sign-in returns only to the
addresses allowed in Supabase (docvex.ro and localhost), and push
notifications need HTTPS, so test those on docvex.ro.

Built with GDPR (Regulation (EU) 2016/679, Law 190/2018) and Law 506/2004 in
mind: no cookies and system fonts only. The one third-party script is
Plausible's cookieless, EU-hosted statistics (injected into every page but
`dev.html` by a plugin in `vite.config.js`; events in `src/analytics.js`). The
browser stores only the language the visitor picks (`docvex-lang` in
localStorage) and, after signing in, the Supabase session; both are strictly
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

| Function | Secrets |
|---|---|
| `ask-docvex` | `ANTHROPIC_API_KEY`, `ASK_SALT` |
| `stripe-events` | `STRIPE_SECRET_KEY`, `STRIPE_EVENTS_WEBHOOK_SECRET` |
| `admin` | `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, `PLAUSIBLE_HOST` (optional), `GITHUB_TOKEN` (optional), `STRIPE_SECRET_KEY` |

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

The home page's FAQ has a box for questions about the app, answered by Claude
Haiku 5.5 through the Supabase Edge Function `ask-docvex`
(`supabase/functions/ask-docvex/`), from a knowledge base written from the app
and this site (`knowledge.md`; public-safe: no code, keys or internal
details). Each visitor gets 5 questions a day and the site 1,000, counted on
the server by a salted hash of the IP and the day (`ask_usage`,
`supabase/migrations/001_ask_usage.sql`); nothing else is kept.

- Secrets on the function: `ANTHROPIC_API_KEY`, `ASK_SALT`.
- After editing `knowledge.md`: `node scripts/knowledge.mjs` (writes
  `knowledge.ts`, which the function bundles), then redeploy the function.

## Downloads

The site reads the visitor's system from the browser (`src/os.js`; nothing is
stored or sent) and shows the matching installer: the download page puts the
latest Windows (`*-setup.exe`) or macOS (`*.dmg`, Universal / Apple silicon /
Intel) build first, with a switch to the other system and every release below;
the home page's download button and the header's Update badge follow it too.

The download page never sends visitors to GitHub: its button links straight to
the installer (`*-setup.exe`) of the latest release. The list of releases is
read from the GitHub API when the site is built, so the page itself makes no
request to GitHub; publishing, editing or deleting a release rebuilds the
site. The release notes are shown on the page as GitHub renders them.

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
