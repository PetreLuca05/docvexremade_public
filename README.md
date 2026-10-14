# DocVex

The public site of DocVex (GitHub Pages) and the home of its releases: the
desktop app's installers and update files are published to this repository's
GitHub Releases, where the installed app looks for updates.

## Site

Plain static pages, no build step: `index.html`, the privacy policy
(`confidentialitate.html`), the cookie policy (`cookies.html`), the terms
(`termeni.html`) and `assets/`.

Built with GDPR (Regulation (EU) 2016/679, Law 190/2018) and Law 506/2004 in
mind: no cookies, no local storage, no analytics and nothing loaded from a
third party (system fonts only), so no consent banner is needed. Adding any of
those means updating the cookie policy and asking for consent first.

Before publishing, fill in every `[DE COMPLETAT: ...]` (the operator's name,
address, CUI, trade register number and contact e-mail).

To serve it: Settings → Pages → Build and deployment → Deploy from a branch,
`main`, folder `/ (root)`. It is then at
https://petreluca05.github.io/docvexremade_public/.
