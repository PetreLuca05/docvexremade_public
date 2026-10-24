import releases from 'virtual:releases';
import Layout from '../components/Layout.jsx';
import { recordDownload, storedUser } from '../auth.js';
import { useLang, useMeta } from '../i18n.jsx';
import { OSES, OS_NAMES, useOS } from '../os.js';

const META = {
  ro: {
    title: 'Descarcă DocVex pentru Windows și macOS — DocVex',
    description:
      'Descarcă DocVex pentru Windows sau macOS, vezi pașii de instalare și notele fiecărei versiuni.',
  },
  en: {
    title: 'Download DocVex for Windows and macOS — DocVex',
    description:
      'Download DocVex for Windows or macOS, see the installation steps and the notes for each version.',
  },
};

const T = {
  ro: {
    locale: 'ro-RO',
    title: 'Descarcă DocVex',
    updateTitle: 'Actualizează DocVex',
    lead: 'Aplicația desktop DocVex pentru Windows și macOS.',
    system: 'Sistemul de operare',
    testing: 'Versiunile actuale sunt destinate testării interne, nu uzului public.',
    latest: (os) => `Ultima versiune pentru ${OS_NAMES[os]}`,
    prerelease: 'Versiune de test',
    download: (v, os) => `Descarcă DocVex ${v} pentru ${OS_NAMES[os]}`,
    published: 'Publicată',
    arch: { universal: 'Universal', arm64: 'Apple silicon (M1 și mai noi)', x64: 'Intel' },
    otherArch: 'Alte variante:',
    none: (os) => `Nicio versiune pentru ${OS_NAMES[os]} nu este publicată încă. Revino curând.`,
    noneOther: (os) => `Vezi versiunea pentru ${OS_NAMES[os]}`,
    stepsTitle: (os) => `Instalare pe ${OS_NAMES[os]}`,
    steps: {
      windows: [
        <>
          Descarcă fișierul <code>docvex-…-setup.exe</code> cu butonul de mai sus.
        </>,
        'Deschide fișierul descărcat și urmează pașii instalatorului.',
        <>
          Dacă Windows afișează „Windows a protejat computerul”, alege <b>Mai multe informații</b>,
          apoi <b>Executați oricum</b>.
        </>,
        'Pornește DocVex din meniul Start. Versiunile noi apar în fila Actualizări din aplicație.',
      ],
      mac: [
        <>
          Descarcă fișierul <code>docvex-….dmg</code> cu butonul de mai sus.
        </>,
        <>
          Deschide fișierul și trage <b>Docvex</b> în dosarul <b>Aplicații</b>.
        </>,
        <>
          La prima pornire, dacă macOS spune că aplicația nu poate fi verificată, deschide{' '}
          <b>Setări sistem → Confidențialitate și securitate</b> și alege <b>Deschide oricum</b>.
        </>,
        'Pornește DocVex din Launchpad sau din Aplicații. Versiunile noi apar în fila Actualizări din aplicație.',
      ],
    },
    historyTitle: 'Toate versiunile',
    forOs: (os) => `Pentru ${OS_NAMES[os]}`,
    alsoFor: 'Și pentru',
    notForOs: (os) => `Fără versiune pentru ${OS_NAMES[os]}`,
    privacy: (
      <>
        Fișierul se descarcă direct de pe serverele GitHub, unde sunt publicate versiunile
        aplicației; vezi <a href="/confidentialitate.html#github">politica de confidențialitate</a>.
      </>
    ),
  },
  en: {
    locale: 'en-GB',
    title: 'Download DocVex',
    updateTitle: 'Update DocVex',
    lead: 'The DocVex desktop app for Windows and macOS.',
    system: 'Operating system',
    testing: 'The current versions are meant for internal testing, not for public use.',
    latest: (os) => `Latest version for ${OS_NAMES[os]}`,
    prerelease: 'Pre-release',
    download: (v, os) => `Download DocVex ${v} for ${OS_NAMES[os]}`,
    published: 'Published',
    arch: { universal: 'Universal', arm64: 'Apple silicon (M1 and later)', x64: 'Intel' },
    otherArch: 'Other builds:',
    none: (os) => `No version for ${OS_NAMES[os]} has been published yet. Check back soon.`,
    noneOther: (os) => `See the version for ${OS_NAMES[os]}`,
    stepsTitle: (os) => `Installing on ${OS_NAMES[os]}`,
    steps: {
      windows: [
        <>
          Download the <code>docvex-…-setup.exe</code> file with the button above.
        </>,
        'Open the downloaded file and follow the installer’s steps.',
        <>
          If Windows shows “Windows protected your PC”, choose <b>More info</b>, then{' '}
          <b>Run anyway</b>.
        </>,
        'Start DocVex from the Start menu. New versions show up in the app’s Updates tab.',
      ],
      mac: [
        <>
          Download the <code>docvex-….dmg</code> file with the button above.
        </>,
        <>
          Open it and drag <b>Docvex</b> into the <b>Applications</b> folder.
        </>,
        <>
          On first launch, if macOS says the app cannot be verified, open{' '}
          <b>System Settings → Privacy &amp; Security</b> and choose <b>Open Anyway</b>.
        </>,
        'Start DocVex from Launchpad or Applications. New versions show up in the app’s Updates tab.',
      ],
    },
    historyTitle: 'All versions',
    forOs: (os) => `For ${OS_NAMES[os]}`,
    alsoFor: 'Also for',
    notForOs: (os) => `No build for ${OS_NAMES[os]}`,
    privacy: (
      <>
        The file downloads directly from GitHub’s servers, where the app’s versions are
        published; see the <a href="/confidentialitate.html#github">privacy policy</a>.
      </>
    ),
  },
};

function formatDate(iso, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

function formatSize(bytes, locale) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)} MB`;
}

// A release's installers for one system: Windows has one, macOS one per
// processor (the preferred first).
const filesFor = (r, os) => (os === 'mac' ? r.mac : r.windows ? [r.windows] : []);
const other = (os) => (os === 'mac' ? 'windows' : 'mac');

function OsIcon({ os }) {
  return os === 'mac' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6s-2.5-1-2.5-3.7ZM14.1 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5.5 10 4.5v7H3v-6Zm0 13 7 1v-7H3v6Zm8 1.1 10 1.4v-8.5H11v7.1Zm0-15.2V11.5h10V3l-10 1.4Z" />
    </svg>
  );
}

function OsSwitch({ os, setOs, t }) {
  return (
    <div className="os-switch" role="radiogroup" aria-label={t.system}>
      {OSES.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === os}
          onClick={() => setOs(o)}
        >
          <OsIcon os={o} />
          {OS_NAMES[o]}
        </button>
      ))}
    </div>
  );
}

function ReleaseHero({ release, os, setOs, t }) {
  if (!release) {
    const alt = other(os);
    const hasAlt = releases.some((r) => filesFor(r, alt).length);
    return (
      <section className="release-hero is-empty">
        <span className="release-hero-icon">
          <OsIcon os={os} />
        </span>
        <p>{t.none(os)}</p>
        {hasAlt && (
          <button type="button" className="btn is-outline" onClick={() => setOs(alt)}>
            {t.noneOther(alt)}
          </button>
        )}
      </section>
    );
  }
  const [main, ...rest] = filesFor(release, os);
  return (
    <section className="release-hero">
      <span className="release-hero-icon">
        <OsIcon os={os} />
      </span>
      <div className="release-hero-body">
        <span className="eyebrow">
          {t.latest(os)}
          {release.prerelease && ` · ${t.prerelease}`}
        </span>
        <h2>DocVex {release.version}</h2>
        <p className="note">
          {t.published} {formatDate(release.date, t.locale)} · <code>{main.file}</code> ·{' '}
          {formatSize(main.size, t.locale)}
          {main.arch && ` · ${t.arch[main.arch]}`}
        </p>
        <a className="btn is-gold" href={main.url} onClick={() => recordDownload(release.version)}>
          {t.download(release.version, os)} <span aria-hidden="true">↓</span>
        </a>
        {rest.length > 0 && (
          <p className="note">
            {t.otherArch}{' '}
            {rest.map((f, i) => (
              <span key={f.file}>
                {i > 0 && ' · '}
                <a href={f.url} onClick={() => recordDownload(release.version)}>
                  {f.arch ? t.arch[f.arch] : f.file}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}

function FileLinks({ files, version, t }) {
  return files.map((f) => (
    <a key={f.file} href={f.url} onClick={() => recordDownload(version)}>
      {f.file} ({formatSize(f.size, t.locale)}
      {f.arch && `, ${t.arch[f.arch]}`})
    </a>
  ));
}

export default function Instalare() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const [os, setOs] = useOS();
  const latest = releases.find((r) => filesFor(r, os).length);
  const alt = other(os);

  return (
    <Layout page="instalare" mainClassName="wrap">
      <article className="doc install">
        <h1>{storedUser() ? t.updateTitle : t.title}</h1>
        <p className="updated">{t.lead}</p>

        <OsSwitch os={os} setOs={setOs} t={t} />
        <ReleaseHero release={latest} os={os} setOs={setOs} t={t} />

        <p className="note">{t.testing}</p>

        <h2 id="pasi">{t.stepsTitle(os)}</h2>
        <ol className="steps">
          {t.steps[os].map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        {releases.length > 0 && (
          <>
            <h2 id="versiuni">{t.historyTitle}</h2>
            <ul className="release-list">
              {releases.map((r) => {
                const mine = filesFor(r, os);
                const theirs = filesFor(r, alt);
                return (
                  <li key={r.version} className={mine.length ? undefined : 'is-other-os'}>
                    <div className="release-head">
                      <h3>
                        DocVex {r.version}
                        {r.prerelease && <span className="badge">{t.prerelease}</span>}
                      </h3>
                      <span>{formatDate(r.date, t.locale)}</span>
                    </div>
                    {/* Release notes as GitHub renders (and sanitises) them. */}
                    {r.notes && (
                      <div className="release-notes" dangerouslySetInnerHTML={{ __html: r.notes }} />
                    )}
                    <div className="release-files">
                      {mine.length ? (
                        <div>
                          <b>{t.forOs(os)}</b>
                          <FileLinks files={mine} version={r.version} t={t} />
                        </div>
                      ) : (
                        <p className="note">{t.notForOs(os)}</p>
                      )}
                      {theirs.length > 0 && (
                        <div className="is-secondary">
                          <b>
                            {t.alsoFor} {OS_NAMES[alt]}
                          </b>
                          <FileLinks files={theirs} version={r.version} t={t} />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="note">{t.privacy}</p>
      </article>
    </Layout>
  );
}
