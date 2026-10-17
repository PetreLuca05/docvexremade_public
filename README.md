# DocVex

The public site of DocVex (GitHub Pages) and the home of its releases: the
desktop app's installers and update files are published to this repository's
GitHub Releases, where the installed app looks for updates.

## Site

Plain static pages, no build step: `index.html`, the privacy policy
(`confidentialitate.html`), the cookie policy (`cookies.html`), the terms
(`termeni.html`), the legal notice (`informatii-legale.html`: Law 365/2002
identification, ANPC-SAL, AI Act transparency, accessibility statement,
vulnerability reporting and the list of applicable acts),
`.well-known/security.txt` and `assets/`.

Built with GDPR (Regulation (EU) 2016/679, Law 190/2018) and Law 506/2004 in
mind: no cookies, no local storage, no analytics and nothing loaded from a
third party (system fonts only), so no consent banner is needed. Adding any of
those means updating the cookie policy and asking for consent first.

Before publishing, fill in every `[DE COMPLETAT: ...]` (the operator's name,
address, CUI, trade register number, phone and contact e-mail, including the
one in `.well-known/security.txt`, whose `Expires` date must be renewed
yearly). Have a lawyer review the legal pages before public launch.

To serve it: Settings → Pages → Build and deployment → Deploy from a branch,
`main`, folder `/ (root)`. It is then at
https://petreluca05.github.io/docvexremade_public/.
