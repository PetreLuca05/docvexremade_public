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
npm run build     # into dist/
npm run preview   # serve dist/
```

Built with GDPR (Regulation (EU) 2016/679, Law 190/2018) and Law 506/2004 in
mind: no cookies, no analytics and nothing loaded from a third party (system
fonts only). The browser stores only the language the visitor picks
(`docvex-lang` in localStorage) and, after signing in on the pricing page, the
Supabase session; both are strictly necessary and described in the cookie
policy, so no consent banner is needed. Only the pricing page talks to a third
party (Supabase). Adding anything else means updating the cookie policy and
asking for consent first.

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
`public/CNAME`). For releases to rebuild it as well, allow the release tags to
deploy: Settings → Environments → `github-pages` → Deployment branches and
tags → add a tag rule (e.g. `v*`).
