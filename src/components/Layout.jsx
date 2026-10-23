import { LANGS, useLang } from '../i18n.jsx';

const icon = `${import.meta.env.BASE_URL}assets/icon.png`;

const T = {
  ro: {
    skip: 'Sari la conținut',
    nav: 'Principal',
    sections: [
      ['functii', 'Funcții'],
      ['module', 'Module'],
      ['intrebari', 'Întrebări'],
    ],
    install: 'Descărcare',
    privacy: 'Confidențialitate',
    langs: 'Limba',
    legalNav: 'Informații legale',
    legal: [
      ['confidentialitate.html', 'Politica de confidențialitate'],
      ['cookies.html', 'Politica de cookie-uri'],
      ['termeni.html', 'Termeni și condiții'],
      ['informatii-legale.html', 'Informații legale'],
    ],
  },
  en: {
    skip: 'Skip to content',
    nav: 'Main',
    sections: [
      ['functii', 'Features'],
      ['module', 'Modules'],
      ['intrebari', 'FAQ'],
    ],
    install: 'Download',
    privacy: 'Privacy',
    langs: 'Language',
    legalNav: 'Legal information',
    legal: [
      ['confidentialitate.html', 'Privacy policy'],
      ['cookies.html', 'Cookie policy'],
      ['termeni.html', 'Terms and conditions'],
      ['informatii-legale.html', 'Legal information'],
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
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// `page` is the current page's file stem; on the home page the section links
// stay in-page anchors, elsewhere they lead back to the home page.
function SiteHeader({ page, t }) {
  const home = page === 'index' ? '' : './';
  const current = (p) => (page === p ? 'page' : undefined);
  return (
    <header className="site-head">
      <div className="wrap">
        <a className="brand" href="./">
          <img src={icon} alt="" />
          docvex
        </a>
        <div className="head-tools">
          <LanguageSwitcher label={t.langs} />
          <nav className="site-nav" aria-label={t.nav}>
            {t.sections.map(([id, label]) => (
              <a key={id} href={`${home}#${id}`}>
                {label}
              </a>
            ))}
            <a href="instalare.html" aria-current={current('instalare')}>
              {t.install}
            </a>
            <a href="confidentialitate.html" aria-current={current('confidentialitate')}>
              {t.privacy}
            </a>
          </nav>
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

export default function Layout({ page, mainClassName, children }) {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <>
      <a className="skip" href="#continut">
        {t.skip}
      </a>
      <SiteHeader page={page} t={t} />
      <main id="continut" className={mainClassName}>
        {children}
      </main>
      <SiteFooter t={t} />
    </>
  );
}
