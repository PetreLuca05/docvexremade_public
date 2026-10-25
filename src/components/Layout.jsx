import { useEffect, useState } from 'react';
import newest from 'virtual:latest-release';
import { AUTH_EVENT, authHref, isNewer, storedUser } from '../auth.js';
import { LANGS, useLang } from '../i18n.jsx';
import { track } from '../analytics.js';
import { CLIENT_OS } from '../os.js';
import ContinueButton from './ContinueButton.jsx';

const icon = `${import.meta.env.BASE_URL}assets/icon.png`;

// Links are root-relative so the header and footer also work on 404.html,
// which GitHub Pages serves at any missing path.
const T = {
  ro: {
    skip: 'Sari la conținut',
    nav: 'Principal',
    menu: 'Meniu',
    closeMenu: 'Închide meniul',
    home: 'Acasă',
    install: 'Descărcare',
    update: 'Actualizare',
    updateNew: (v) => `Versiune nouă: ${v}`,
    pricing: 'Prețuri',
    signIn: 'Autentificare',
    account: (email) => `Contul tău: ${email}`,
    start: 'Începe',
    langs: 'Limba',
    legalNav: 'Informații legale',
    legal: [
      ['/confidentialitate.html', 'Politica de confidențialitate'],
      ['/cookies.html', 'Politica de cookie-uri'],
      ['/termeni.html', 'Termeni și condiții'],
      ['/informatii-legale.html', 'Informații legale'],
    ],
  },
  en: {
    skip: 'Skip to content',
    nav: 'Main',
    menu: 'Menu',
    closeMenu: 'Close menu',
    home: 'Home',
    install: 'Download',
    update: 'Update',
    updateNew: (v) => `New version: ${v}`,
    pricing: 'Pricing',
    signIn: 'Sign in',
    account: (email) => `Your account: ${email}`,
    start: 'Get started',
    langs: 'Language',
    legalNav: 'Legal information',
    legal: [
      ['/confidentialitate.html', 'Privacy policy'],
      ['/cookies.html', 'Cookie policy'],
      ['/termeni.html', 'Terms and conditions'],
      ['/informatii-legale.html', 'Legal information'],
    ],
  },
};

const LANG_NAMES = { ro: 'Română', en: 'English' };

function LanguageSwitcher({ label }) {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label={label}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          aria-label={LANG_NAMES[l]}
          onClick={() => {
            if (l !== lang) track('Language Switch', { to: l });
            setLang(l);
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// True while the page is scrolled to the very top: the header is then taller
// and has no background.
function useAtTop() {
  const [atTop, setAtTop] = useState(() => window.scrollY < 8);
  useEffect(() => {
    const update = () => setAtTop(window.scrollY < 8);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return atTop;
}

// The signed-in user, kept in step with sign-in and sign-out on this page
// and in other tabs.
function useStoredUser() {
  const [user, setUser] = useState(storedUser);
  useEffect(() => {
    const update = () => setUser(storedUser());
    window.addEventListener(AUTH_EVENT, update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener(AUTH_EVENT, update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return user;
}

function initials(user) {
  const words = (user.name || user.email).split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// The account's photo (from its Google profile, for example), or its
// initials when it has none or the photo does not load.
export function Avatar({ user, className = 'account-avatar' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user.photo]);
  return (
    <span className={className} aria-hidden="true">
      {user.photo && !failed ? (
        <img src={user.photo} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        initials(user)
      )}
    </span>
  );
}

function AccountPill({ user, page, t }) {
  return (
    <a
      className="account-pill"
      href="/cont.html"
      aria-label={t.account(user.email)}
      aria-current={page === 'cont' ? 'page' : undefined}
      title={user.email}
    >
      <Avatar user={user} />
      <span className="account-name">{user.name || user.email}</span>
    </a>
  );
}

// The newest version for the visitor's system (either, on other systems).
const latest =
  (CLIENT_OS && newest[CLIENT_OS]) ||
  [newest.windows, newest.mac]
    .filter(Boolean)
    .sort((a, b) => (isNewer(a.version, b.version) ? -1 : 1))[0] ||
  null;

// For a signed-in visitor (who has the app): Update, highlighted with the new
// version for their system when one is out since the version the account
// last downloaded.
function UpdateLink({ user, t, current }) {
  const fresh = latest && user.downloaded && isNewer(latest.version, user.downloaded);
  if (!fresh) {
    return (
      <a href="/instalare.html" aria-current={current}>
        {t.update}
      </a>
    );
  }
  return (
    <a
      className="update-link is-new"
      href="/instalare.html"
      aria-current={current}
      title={t.updateNew(latest.version)}
    >
      <span className="update-dot" aria-hidden="true" />
      {t.update}
      <span className="update-version">{latest.version}</span>
    </a>
  );
}

// The same header on every page. `page` is the current page's file stem;
// `navPage`, when given, is the link to mark instead (the sign-in page marks
// Sign in only on its Sign in tab); `overlay` lays the header over a dark
// hero (the home page).
function SiteHeader({ page, navPage = page, overlay, t }) {
  const atTop = useAtTop();
  const user = useStoredUser();
  const current = (p) => (navPage === p ? 'page' : undefined);
  // Phones and tablets: the links, account and language fold into a menu.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onWide = () => window.innerWidth > 960 && setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onWide);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onWide);
    };
  }, [open]);
  const className = ['site-head', overlay && 'is-overlay', atTop && 'is-top', open && 'is-open']
    .filter(Boolean)
    .join(' ');
  return (
    <header className={className}>
      <div className="wrap">
        <a className="brand" href="/">
          <img src={icon} alt="" />
          docvex
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="head-tools"
          aria-label={open ? t.closeMenu : t.menu}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" />
        </button>
        <div className="head-tools" id="head-tools">
          <nav className="site-nav" aria-label={t.nav}>
            <a href="/" aria-current={current('index')}>
              {t.home}
            </a>
            {user ? (
              <UpdateLink user={user} t={t} current={current('instalare')} />
            ) : (
              <a href="/instalare.html" aria-current={current('instalare')}>
                {t.install}
              </a>
            )}
            {!user && (
              <a href="/preturi.html" aria-current={current('preturi')}>
                {t.pricing}
              </a>
            )}
            {!user && (
              <a href={authHref({ signin: true })} aria-current={current('autentificare')}>
                {t.signIn}
              </a>
            )}
          </nav>
          <div className="head-actions">
            {user && <AccountPill user={user} page={page} t={t} />}
            {!user && (
              <ContinueButton href={authHref()} small>
                {t.start}
              </ContinueButton>
            )}
            <LanguageSwitcher label={t.langs} />
          </div>
        </div>
      </div>
    </header>
  );
}

function SiteFooter({ t }) {
  return (
    <footer className="site-foot">
      <div className="wrap">
        <span>© 2026 DocVex</span>
        <nav aria-label={t.legalNav}>
          {t.legal.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <a href="https://anpc.ro/ce-este-sal/" rel="noopener">
            ANPC – SAL
          </a>
        </nav>
      </div>
    </footer>
  );
}

// The shared frame of every page: header, main and footer.
export default function Layout({ page, navPage, overlay = false, mainClassName, children }) {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <>
      <a className="skip" href="#continut">
        {t.skip}
      </a>
      <SiteHeader page={page} navPage={navPage} overlay={overlay} t={t} />
      <main id="continut" className={mainClassName}>
        {children}
      </main>
      <SiteFooter t={t} />
    </>
  );
}
