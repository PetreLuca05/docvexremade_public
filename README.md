# DocVex

The public site of DocVex (GitHub Pages) and the home of its releases: the
desktop app's installers and update files are published to this repository's
GitHub Releases, where the installed app looks for updates.

## Site

React, built with Vite as a multi-page site: each page keeps its own HTML file
and URL. The home page (`index.html`), the download page (`instalare.html`),
the privacy policy
(`confidentialitate.html`), the cookie policy (`cookies.html`), the terms
(`termeni.html`), the legal notice (`informatii-legale.html`: Law 365/2002
identification, ANPC-SAL, AI Act transparency, accessibility statement,
vulnerability reporting and the list of applicable acts) and `404.html`.

- `*.html`: each page's `<head>` (title, description) and its entry script.
- `src/pages/`: each page. The home and download pages hold their Romanian and
  English text side by side; the legal pages have one file per language in
  `src/pages/ro/` and `src/pages/en/` (the Romanian text is the binding one).
- `src/components/Layout.jsx`: the shared header (with the RO / EN switcher)
  and footer; `src/i18n.jsx`: the current language; `src/styles/style.css`:
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
fonts only). The only thing stored in the browser is the language the visitor
picks (`docvex-lang` in localStorage), a strictly necessary setting described
in the cookie policy, so no consent banner is needed. Adding anything else
means updating the cookie policy and asking for consent first.

## Downloads

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
